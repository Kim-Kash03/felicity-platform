const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const Team = require('../models/Team');
const Event = require('../models/Event');
const User = require('../models/User');
const Registration = require('../models/Registration');
const Message = require('../models/Message');
const { protect, authorize } = require('../middleware/authMiddleware');
const { generateQR } = require('../utils/qrGenerator');
const { sendTicketEmail } = require('../utils/email');

// Helper to check if team is complete and generate tickets
async function checkTeamCompletion(team) {
    const acceptedMembers = team.members.filter(m => m.status === 'accepted');
    if (acceptedMembers.length === team.maxSize && team.status !== 'complete') {
        team.status = 'complete';
        await team.save();

        const event = await Event.findById(team.eventId).populate('organizer', 'organizerName');
        if (!event) {
            console.error('Event not found for team completion', team.eventId);
            return;
        }
        const isFree = event.registrationFee === 0;

        // Auto-register each member
        for (const member of acceptedMembers) {
            const userId = member.user;
            // Check if already actively registered
            const existing = await Registration.findOne({
                participant: userId,
                event: team.eventId,
                status: { $nin: ['cancelled', 'rejected'] }
            });
            if (!existing) {
                let ticketId, qrCode;
                if (isFree) {
                    ticketId = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
                    const qrData = JSON.stringify({ ticketId, eventId: team.eventId, participantId: userId.toString() });
                    qrCode = await generateQR(qrData);
                }

                const reg = new Registration({
                    participant: userId,
                    event: team.eventId,
                    ticketId,
                    qrCode,
                    status: isFree ? 'confirmed' : 'pending',
                    paymentStatus: isFree ? 'free' : 'pending',
                });
                await reg.save();

                // send email
                if (isFree) {
                    try {
                        const user = await User.findById(userId);
                        await sendTicketEmail({
                            to: user.email,
                            participantName: `${user.firstName} ${user.lastName}`,
                            eventName: event.name + ` (Team: ${team.name})`,
                            ticketId,
                            qrCode,
                            eventDate: event.startDate.toDateString(),
                            organizer: event.organizer.organizerName,
                            isTicket: true,
                        });
                        reg.emailSent = true;
                        await reg.save();
                    } catch (err) {
                        console.error('Failed to send team ticket email', err);
                    }
                }
            }
        }
    }
}

// POST /api/teams - Create a team
router.post('/', protect, authorize('participant'), async (req, res) => {
    try {
        const { eventId, name, maxSize } = req.body;
        const leaderId = req.user._id;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        if (!event.isTeamEvent) return res.status(400).json({ message: 'Not a team event' });

        // Validate size
        const minAllowed = Math.max(2, event.teamSizeMin || 2);
        const maxAllowed = Math.min(10, event.teamSizeMax || 10);
        const size = parseInt(maxSize);
        if (isNaN(size) || size < minAllowed || size > maxAllowed) {
            return res.status(400).json({ message: `Team size must be between ${minAllowed} and ${maxAllowed}` });
        }

        // Leader can only create/join one team per event
        const existingTeam = await Team.findOne({ eventId, 'members.user': leaderId, 'members.status': { $in: ['accepted', 'pending'] } });
        if (existingTeam) return res.status(400).json({ message: 'You are already in a team or have a pending invite for this event' });

        const code = uuidv4().substring(0, 8).toUpperCase();

        const team = new Team({
            eventId,
            leaderId,
            name,
            maxSize: size,
            code,
            members: [{ user: leaderId, status: 'accepted' }]
        });
        await team.save();

        res.status(201).json({ message: 'Team created', team });
    } catch (err) {
        require('fs').appendFileSync('error_log.txt', 'TEAM CREATE ERROR: ' + (err.stack || err.message) + '\n');
        if (err.code === 11000) return res.status(400).json({ message: 'You already lead a team for this event' });
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/teams/my - Get user's teams and invites
router.get('/my', protect, authorize('participant'), async (req, res) => {
    try {
        const teams = await Team.find({ 'members.user': req.user._id })
            .populate('eventId', 'name startDate isTeamEvent tags')
            .populate('leaderId', 'firstName lastName email')
            .populate('members.user', 'firstName lastName email');

        // Add a computed `myStatus` field for easier frontend rendering
        const result = teams.map(t => {
            const obj = t.toObject();
            const me = obj.members.find(m => m.user._id.toString() === req.user._id.toString());
            obj.myStatus = me ? me.status : null;
            return obj;
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/teams/event/:eventId - Organizer views team status
router.get('/event/:eventId', protect, authorize('organizer'), async (req, res) => {
    try {
        const event = await Event.findOne({ _id: req.params.eventId, organizer: req.user._id });
        if (!event) return res.status(404).json({ message: 'Event not found' });

        const teams = await Team.find({ eventId: req.params.eventId })
            .populate('leaderId', 'firstName lastName email')
            .populate('members.user', 'firstName lastName email');

        res.json(teams);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/teams/:id/invite - Leader invites a member by email
router.post('/:id/invite', protect, authorize('participant'), async (req, res) => {
    try {
        const { email } = req.body;
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        if (team.leaderId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only leader can invite' });
        if (team.status === 'complete') return res.status(400).json({ message: 'Team is already complete' });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role !== 'participant') return res.status(400).json({ message: 'Can only invite participants' });

        // Add to members as pending
        const existing = team.members.find(m => m.user.toString() === user._id.toString());
        if (existing) {
            if (existing.status === 'rejected') {
                existing.status = 'pending'; // re-invite
            } else {
                return res.status(400).json({ message: 'User already in team or invited' });
            }
        } else {
            // Check max size
            const activeMembers = team.members.filter(m => m.status !== 'rejected');
            if (activeMembers.length >= team.maxSize) return res.status(400).json({ message: 'Team is at max size capacity' });

            team.members.push({ user: user._id, status: 'pending' });
        }

        await team.save();
        res.json({ message: 'Invite sent', team });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/teams/:id/respond - Participant responds to invite
router.put('/:id/respond', protect, authorize('participant'), async (req, res) => {
    try {
        const { status } = req.body; // 'accepted' or 'rejected'
        if (!['accepted', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        const member = team.members.find(m => m.user.toString() === req.user._id.toString());
        if (!member || member.status !== 'pending') return res.status(400).json({ message: 'No pending invite found' });

        if (status === 'accepted') {
            const acceptedCount = team.members.filter(m => m.status === 'accepted').length;
            if (acceptedCount >= team.maxSize) return res.status(400).json({ message: 'Team is already full' });
        }

        member.status = status;
        await team.save();

        if (status === 'accepted') {
            await checkTeamCompletion(team);
        }

        res.json({ message: `Invite ${status}`, team });
    } catch (err) {
        console.error('>>> RESPOND ENDPOINT ERROR <<<', err);
        require('fs').appendFileSync('error_log.txt', (err.stack || err.message) + '\n');
        res.status(500).json({ message: 'Server error', error: err.stack || err.message });
    }
});

// POST /api/teams/join - Participant joins via code
router.post('/join', protect, authorize('participant'), async (req, res) => {
    try {
        const { code } = req.body;
        const team = await Team.findOne({ code });
        if (!team) return res.status(404).json({ message: 'Invalid invite code' });
        if (team.status === 'complete') return res.status(400).json({ message: 'Team is already complete' });

        // User cannot be in another team for this event
        const existingTeam = await Team.findOne({ eventId: team.eventId, 'members.user': req.user._id, 'members.status': { $in: ['accepted', 'pending'] } });
        if (existingTeam) return res.status(400).json({ message: 'You are already in a team or have a pending invite for this event' });

        const acceptedCount = team.members.filter(m => m.status === 'accepted').length;
        if (acceptedCount >= team.maxSize) return res.status(400).json({ message: 'Team is already full' });

        const existingMember = team.members.find(m => m.user.toString() === req.user._id.toString());
        if (existingMember) {
            existingMember.status = 'accepted';
        } else {
            team.members.push({ user: req.user._id, status: 'accepted' });
        }

        await team.save();
        await checkTeamCompletion(team);

        res.json({ message: 'Joined team successfully', team });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// DELETE /api/teams/:id/leave - Participant leaves a team
router.delete('/:id/leave', protect, authorize('participant'), async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        if (team.leaderId.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Leader cannot leave the team. You must delete the team instead.' });
        }

        const memberIndex = team.members.findIndex(m => m.user.toString() === req.user._id.toString());
        if (memberIndex === -1) {
            return res.status(400).json({ message: 'You are not a member of this team' });
        }

        // Remove member
        team.members.splice(memberIndex, 1);

        // If team was complete, it's no longer complete
        const acceptedCount = team.members.filter(m => m.status === 'accepted').length;
        if (acceptedCount < team.maxSize && team.status === 'complete') {
            team.status = 'incomplete';
        }

        await team.save();

        // Cancel user's active registration for this event if it exists
        const reg = await Registration.findOne({
            participant: req.user._id,
            event: team.eventId,
            status: { $nin: ['cancelled', 'rejected'] }
        }).populate('event');

        if (reg) {
            // Restore stock if merchandise (though rare for team events)
            if (reg.event.type === 'merchandise' && ['paid', 'free'].includes(reg.paymentStatus)) {
                if (reg.merchandiseVariants && reg.merchandiseVariants.length > 0) {
                    for (const item of reg.merchandiseVariants) {
                        const variant = reg.event.variants.id(item.variantId);
                        if (variant) {
                            variant.stock += (item.quantity || 1);
                            reg.event.totalStock += (item.quantity || 1);
                        }
                    }
                } else if (reg.merchandiseVariant) {
                    const variant = reg.event.variants.id(reg.merchandiseVariant.variantId);
                    if (variant) {
                        variant.stock += (reg.merchandiseVariant.quantity || 1);
                        reg.event.totalStock += (reg.merchandiseVariant.quantity || 1);
                    }
                }
                await reg.event.save();
            }
            reg.status = 'cancelled';
            await reg.save();
        }
        res.json({ message: 'Successfully left the team' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// DELETE /api/teams/:id - Leader deletes a team
router.delete('/:id', protect, authorize('participant'), async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        // Only leader can delete
        if (team.leaderId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the team leader can delete the team' });
        }

        // Cancel all active registrations for this event by the team members
        const memberIds = team.members.map(m => m.user);
        const activeRegs = await Registration.find({
            participant: { $in: memberIds },
            event: team.eventId,
            status: { $nin: ['cancelled', 'rejected'] }
        }).populate('event');

        for (const reg of activeRegs) {
            // Restore stock if merchandise
            if (reg.event.type === 'merchandise' && ['paid', 'free'].includes(reg.paymentStatus)) {
                if (reg.merchandiseVariants && reg.merchandiseVariants.length > 0) {
                    for (const item of reg.merchandiseVariants) {
                        const variant = reg.event.variants.id(item.variantId);
                        if (variant) {
                            variant.stock += (item.quantity || 1);
                            reg.event.totalStock += (item.quantity || 1);
                        }
                    }
                } else if (reg.merchandiseVariant) {
                    const variant = reg.event.variants.id(reg.merchandiseVariant.variantId);
                    if (variant) {
                        variant.stock += (reg.merchandiseVariant.quantity || 1);
                        reg.event.totalStock += (reg.merchandiseVariant.quantity || 1);
                    }
                }
                await reg.event.save();
            }
            reg.status = 'cancelled';
            await reg.save();
        }

        await team.deleteOne();
        res.json({ message: 'Team deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/teams/:id/messages - Get chat history for a team
router.get('/:id/messages', protect, authorize('participant'), async (req, res) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        // Ensure user is an accepted member
        const isMember = team.members.some(
            m => m.user.toString() === req.user._id.toString() && m.status === 'accepted'
        );
        if (!isMember) return res.status(403).json({ message: 'Access denied. Must be an accepted team member.' });
        if (team.status !== 'complete') return res.status(403).json({ message: 'Chat is only available after team is complete.' });

        const messages = await Message.find({ teamId: team._id })
            .populate('sender', 'firstName lastName email')
            .sort({ createdAt: 1 }) // Chronological order
            .limit(100); // Optional: add pagination later

        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
