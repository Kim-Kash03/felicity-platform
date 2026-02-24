const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const { protect, authorize } = require('../middleware/authMiddleware');
const { generateQR } = require('../utils/qrGenerator');
const { sendTicketEmail } = require('../utils/email');

// POST /api/registrations – register for event or purchase merchandise
router.post('/', protect, authorize('participant'), async (req, res) => {
    const { eventId, formResponses, merchandiseVariants } = req.body;

    try {
        const event = await Event.findById(eventId).populate('organizer', 'organizerName');
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (!['published', 'ongoing'].includes(event.status))
            return res.status(400).json({ message: 'Event is not open for registration' });
        if (new Date() > event.registrationDeadline)
            return res.status(400).json({ message: 'Registration deadline has passed' });

        // Eligibility check
        const user = req.user;
        if (event.eligibility === 'iiit' && user.participantType !== 'iiit')
            return res.status(403).json({ message: 'This event is for IIIT participants only' });
        if (event.eligibility === 'non-iiit' && user.participantType !== 'non-iiit')
            return res.status(403).json({ message: 'This event is for non-IIIT participants only' });

        // Check duplicate registration (only blocking if active and normal event)
        const existing = await Registration.findOne({ participant: user._id, event: eventId, status: { $nin: ['cancelled', 'rejected'] } });
        if (existing && event.type === 'normal') return res.status(400).json({ message: 'You are already registered for this event' });

        // Check registration limit
        if (event.registrationLimit > 0) {
            const count = await Registration.countDocuments({ event: eventId, status: { $ne: 'cancelled' } });
            if (count >= event.registrationLimit)
                return res.status(400).json({ message: 'Registration limit reached' });
        }

        // Merchandise-specific checks
        let totalAmount = 0;
        let totalQuantity = 0;

        if (event.type === 'merchandise') {
            if (!merchandiseVariants || !Array.isArray(merchandiseVariants) || merchandiseVariants.length === 0) {
                return res.status(400).json({ message: 'Merchandise variants required' });
            }

            // Check purchase limit per participant
            const userRegs = await Registration.find({
                participant: user._id, event: eventId, status: { $nin: ['cancelled', 'rejected'] }
            });
            const previousPurchaseCount = userRegs.reduce((sum, reg) => {
                let qty = 0;
                if (reg.merchandiseVariants && reg.merchandiseVariants.length > 0) {
                    qty = reg.merchandiseVariants.reduce((qSum, v) => qSum + (v.quantity || 1), 0);
                } else if (reg.merchandiseVariant) {
                    // Fallback for older single-variant registrations
                    qty = reg.merchandiseVariant.quantity || 1;
                }
                return sum + qty;
            }, 0);

            const requestedQuantity = merchandiseVariants.reduce((sum, v) => sum + (v.quantity || 1), 0);
            totalQuantity = requestedQuantity;

            if (previousPurchaseCount + requestedQuantity > event.purchaseLimitPerParticipant) {
                return res.status(400).json({ message: `Purchase limit per participant exceeded. You can buy ${Math.max(0, event.purchaseLimitPerParticipant - previousPurchaseCount)} more.` });
            }

            // Check variant stock for ALL requested variants
            for (const item of merchandiseVariants) {
                const variant = event.variants.id(item.variantId);
                if (!variant || variant.stock < (item.quantity || 1)) {
                    return res.status(400).json({ message: `Variant ${item.size || ''} ${item.color || ''} is out of stock or insufficient quantity available.` });
                }
            }

            // Decrement stock ONLY IF FREE. If paid, decrement on approval.
            if (event.registrationFee === 0) {
                for (const item of merchandiseVariants) {
                    const variant = event.variants.id(item.variantId);
                    variant.stock -= (item.quantity || 1);
                }
                event.totalStock = Math.max(0, event.totalStock - requestedQuantity);
                await event.save();
            }

            totalAmount = requestedQuantity * event.registrationFee;
        } else {
            // Normal event total amount
            totalAmount = event.registrationFee;
        }

        // Lock form after first registration
        if (event.type === 'normal' && !event.formLocked) {
            event.formLocked = true;
            await event.save();
        }

        // Generate QR and send email ONLY if free
        const isFree = event.registrationFee === 0;
        let ticketId, qrCode;

        if (isFree) {
            ticketId = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
            const qrData = JSON.stringify({ ticketId, eventId, participantId: user._id.toString() });
            qrCode = await generateQR(qrData);
        }

        const registration = new Registration({
            participant: user._id,
            event: eventId,
            ticketId: isFree ? ticketId : undefined,
            qrCode: isFree ? qrCode : undefined,
            status: isFree ? 'confirmed' : 'pending',
            paymentStatus: isFree ? 'free' : 'pending',
            formResponses: formResponses || {},
            merchandiseVariants: event.type === 'merchandise' ? merchandiseVariants : undefined,
            totalAmount: totalAmount
        });
        await registration.save();

        // Send ticket email
        if (isFree) {
            try {
                await sendTicketEmail({
                    to: user.email,
                    participantName: `${user.firstName} ${user.lastName}`,
                    eventName: event.name,
                    ticketId,
                    qrCode,
                    eventDate: event.startDate.toDateString(),
                    organizer: event.organizer.organizerName,
                    isTicket: event.type !== 'merchandise',
                });
                registration.emailSent = true;
                await registration.save();
            } catch (emailErr) {
                console.error('Email send error:', emailErr.message);
            }
        }

        res.status(201).json({
            message: event.type === 'merchandise' ? 'Purchase successful' : 'Registration successful',
            registration
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/registrations/event/:eventId – organizer: list registrations for event
router.get('/event/:eventId', protect, authorize('organizer'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.eventId, organizer: req.user._id });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const { search, status } = req.query;
        let query = { event: req.params.eventId };
        if (status) query.status = status;

        const regs = await Registration.find(query)
            .populate('participant', 'firstName lastName email contactNumber participantType college')
            .sort({ registeredAt: -1 });

        let results = regs;
        if (search) {
            const s = search.toLowerCase();
            results = regs.filter(r =>
                r.participant?.firstName?.toLowerCase().includes(s) ||
                r.participant?.lastName?.toLowerCase().includes(s) ||
                r.participant?.email?.toLowerCase().includes(s)
            );
        }

        res.json(results);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/registrations/event/:eventId/csv – export CSV
router.get('/event/:eventId/csv', protect, authorize('organizer'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.eventId, organizer: req.user._id });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const regs = await Registration.find({ event: req.params.eventId })
            .populate('participant', 'firstName lastName email contactNumber participantType college');

        const customFields = event.customForm?.map(f => f.label) || [];
        const headers = ['TicketID', 'First Name', 'Last Name', 'Email', 'Contact', 'Type', 'College', 'Status', 'Payment', 'Registered At', ...customFields];
        const rows = regs.map(r => [
            r.ticketId,
            r.participant?.firstName || '',
            r.participant?.lastName || '',
            r.participant?.email || '',
            r.participant?.contactNumber || '',
            r.participant?.participantType || '',
            r.participant?.college || '',
            r.status,
            r.paymentStatus,
            r.registeredAt.toISOString(),
            ...customFields.map(label => {
                const val = r.formResponses?.[label];
                return Array.isArray(val) ? val.join('; ') : (val || '');
            })
        ]);

        const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${event.name.replace(/\s+/g, '_')}_registrations.csv"`);
        res.send(csv);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/registrations/:id/attend – mark attendance
router.put('/:id/attend', protect, authorize('organizer'), async (req, res) => {
    try {
        const reg = await Registration.findById(req.params.id).populate('event');
        if (!reg) return res.status(404).json({ message: 'Registration not found' });
        if (reg.event.organizer.toString() !== req.user._id.toString())
            return res.status(403).json({ message: 'Not authorized' });
        reg.status = 'attended';
        await reg.save();
        res.json({ message: 'Attendance marked', registration: reg });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/registrations/event/:eventId/analytics – organizer analytics
router.get('/event/:eventId/analytics', protect, authorize('organizer'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.eventId, organizer: req.user._id });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const regs = await Registration.find({ event: req.params.eventId });
        const total = regs.length;
        const attended = regs.filter(r => r.status === 'attended').length;
        const cancelled = regs.filter(r => r.status === 'cancelled' || r.status === 'rejected').length;
        const revenue = regs.reduce((sum, r) => {
            if (r.paymentStatus === 'paid' && r.status !== 'cancelled' && r.status !== 'rejected') {
                // Use totalAmount if it exists (new logic), fallback to registrationFee
                return sum + (r.totalAmount || event.registrationFee || 0);
            }
            return sum;
        }, 0);

        res.json({ total, attended, cancelled, revenue, event: { name: event.name, type: event.type } });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/registrations/:id/payment-proof – participant submits payment proof URL
router.put('/:id/payment-proof', protect, authorize('participant'), async (req, res) => {
    const { paymentProofUrl } = req.body;
    if (!paymentProofUrl) return res.status(400).json({ message: 'paymentProofUrl is required' });

    try {
        const reg = await Registration.findOne({ _id: req.params.id, participant: req.user._id })
            .populate('event', 'registrationFee type name');
        if (!reg) return res.status(404).json({ message: 'Registration not found' });
        if (reg.event.registrationFee <= 0)
            return res.status(400).json({ message: 'This event has no registration fee' });
        if (reg.paymentStatus === 'paid')
            return res.status(400).json({ message: 'Payment already confirmed' });

        reg.paymentProofUrl = paymentProofUrl;
        // DO NOT set to paid here, it needs organizer approval
        // reg.paymentStatus = 'paid'; 
        await reg.save();

        res.json({ message: 'Payment proof submitted. Pending approval.', registration: reg });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Helper: when cancelling registration, also remove from team
const Team = require('../models/Team');

// PUT /api/registrations/:id/cancel – participant cancels their own registration
router.put('/:id/cancel', protect, authorize('participant'), async (req, res) => {
    try {
        const reg = await Registration.findOne({ _id: req.params.id, participant: req.user._id }).populate('event');
        if (!reg) return res.status(404).json({ message: 'Registration not found' });
        if (reg.status === 'cancelled') return res.status(400).json({ message: 'Already cancelled' });

        // If merchandise AND payment was approved (paid/free), restore stock.
        // Pending payments don't decrement stock until approved.
        if (reg.event.type === 'merchandise' && ['paid', 'free'].includes(reg.paymentStatus)) {
            const event = await Event.findById(reg.event._id);
            if (reg.merchandiseVariants && reg.merchandiseVariants.length > 0) {
                for (const item of reg.merchandiseVariants) {
                    const variant = event.variants.id(item.variantId);
                    if (variant) {
                        variant.stock += (item.quantity || 1);
                        event.totalStock += (item.quantity || 1);
                    }
                }
                await event.save();
            } else if (reg.merchandiseVariant) {
                // Fallback for older singular registration
                const variant = event.variants.id(reg.merchandiseVariant.variantId);
                if (variant) {
                    variant.stock += (reg.merchandiseVariant.quantity || 1);
                    event.totalStock += (reg.merchandiseVariant.quantity || 1);
                    await event.save();
                }
            }
        }

        reg.status = 'cancelled';
        await reg.save();

        // Check if user was in a team for this event, remove them if so
        const team = await Team.findOne({ eventId: reg.event._id, 'members.user': req.user._id });
        if (team) {
            // Remove member
            const memberIndex = team.members.findIndex(m => m.user.toString() === req.user._id.toString());
            if (memberIndex !== -1) {
                // Determine if leader is cancelling. If leader cancels, it's problematic if the team stays since leader is required.
                // Assuming leader shouldn't cancel unless leaving the team, or if the whole team is deleted.
                // But for safety, we remove the member.
                team.members.splice(memberIndex, 1);

                // If team was complete, it's no longer complete
                const acceptedCount = team.members.filter(m => m.status === 'accepted').length;
                if (acceptedCount < team.maxSize && team.status === 'complete') {
                    team.status = 'incomplete';
                }
                await team.save();
            }
        }

        res.json({ message: 'Registration cancelled successfully', registration: reg });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/registrations/:id/reject – organizer rejects a registration
router.put('/:id/reject', protect, authorize('organizer'), async (req, res) => {
    try {
        const reg = await Registration.findById(req.params.id).populate('event');
        if (!reg) return res.status(404).json({ message: 'Registration not found' });

        // Check if requester is the organizer of this event
        if (reg.event.organizer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (reg.status === 'rejected') return res.status(400).json({ message: 'Already rejected' });

        // If merchandise AND payment was approved (paid/free), restore stock.
        // Pending payments don't decrement stock until approved.
        if (reg.event.type === 'merchandise' && ['paid', 'free'].includes(reg.paymentStatus)) {
            const event = await Event.findById(reg.event._id);
            if (reg.merchandiseVariants && reg.merchandiseVariants.length > 0) {
                for (const item of reg.merchandiseVariants) {
                    const variant = event.variants.id(item.variantId);
                    if (variant) {
                        variant.stock += (item.quantity || 1);
                        event.totalStock += (item.quantity || 1);
                    }
                }
                await event.save();
            } else if (reg.merchandiseVariant) {
                // Fallback for older singular registration
                const variant = event.variants.id(reg.merchandiseVariant.variantId);
                if (variant) {
                    variant.stock += (reg.merchandiseVariant.quantity || 1);
                    event.totalStock += (reg.merchandiseVariant.quantity || 1);
                    await event.save();
                }
            }
        }

        reg.status = 'rejected';
        await reg.save();
        res.json({ message: 'Registration rejected', registration: reg });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/registrations/:id/approve-payment – organizer approves payment
router.put('/:id/approve-payment', protect, authorize('organizer'), async (req, res) => {
    try {
        const reg = await Registration.findById(req.params.id)
            .populate('event', 'organizer type registrationFee name startDate variants totalStock')
            .populate('participant', 'email firstName lastName');

        if (!reg) return res.status(404).json({ message: 'Registration not found' });

        // Ensure requester is organizer
        if (reg.event.organizer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (reg.paymentStatus !== 'pending') {
            return res.status(400).json({ message: 'Payment is not pending' });
        }

        // Decrement stock for merchandise now
        const event = await Event.findById(reg.event._id);
        if (event.type === 'merchandise') {
            if (reg.merchandiseVariants && reg.merchandiseVariants.length > 0) {
                // Check stock for ALL first
                for (const item of reg.merchandiseVariants) {
                    const variant = event.variants.id(item.variantId);
                    if (!variant || variant.stock < (item.quantity || 1)) {
                        return res.status(400).json({ message: `Insufficient stock for variant ${item.size || ''} ${item.color || ''} to approve this registration` });
                    }
                }
                // Decrement stock for ALL
                for (const item of reg.merchandiseVariants) {
                    const variant = event.variants.id(item.variantId);
                    variant.stock -= (item.quantity || 1);
                    event.totalStock = Math.max(0, event.totalStock - (item.quantity || 1));
                }
                await event.save();
            } else if (reg.merchandiseVariant) {
                // Fallback for singular
                const variant = event.variants.id(reg.merchandiseVariant.variantId);
                if (variant) {
                    if (variant.stock < (reg.merchandiseVariant.quantity || 1)) {
                        return res.status(400).json({ message: 'Insufficient stock to approve this registration' });
                    }
                    variant.stock -= (reg.merchandiseVariant.quantity || 1);
                    event.totalStock = Math.max(0, event.totalStock - (reg.merchandiseVariant.quantity || 1));
                    await event.save();
                }
            }
        }

        // Generate QR Code
        const ticketId = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
        const qrData = JSON.stringify({ ticketId, eventId: event._id, participantId: reg.participant._id.toString() });
        const qrCode = await generateQR(qrData);

        reg.ticketId = ticketId;
        reg.qrCode = qrCode;
        reg.paymentStatus = 'paid';
        reg.status = 'confirmed';
        await reg.save();

        // Send Email
        try {
            await sendTicketEmail({
                to: reg.participant.email,
                participantName: `${reg.participant.firstName} ${reg.participant.lastName}`,
                eventName: event.name,
                ticketId,
                qrCode,
                eventDate: event.startDate.toDateString(),
                organizer: req.user.organizerName, // we don't have this populated explicitly, but we can pass generic
                isTicket: event.type !== 'merchandise',
            });
            reg.emailSent = true;
            await reg.save();
        } catch (emailErr) {
            console.error('Email send error:', emailErr.message);
        }

        res.json({ message: 'Payment approved', registration: reg });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/registrations/:id/reject-payment – organizer rejects payment
router.put('/:id/reject-payment', protect, authorize('organizer'), async (req, res) => {
    try {
        const reg = await Registration.findById(req.params.id).populate('event', 'organizer');
        if (!reg) return res.status(404).json({ message: 'Registration not found' });

        if (reg.event.organizer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (reg.paymentStatus !== 'pending') {
            return res.status(400).json({ message: 'Payment is not pending' });
        }

        reg.paymentStatus = 'rejected';
        reg.status = 'rejected';
        await reg.save();

        res.json({ message: 'Payment rejected', registration: reg });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
