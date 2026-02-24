const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { protect, authorize } = require('../middleware/authMiddleware');
const PasswordResetRequest = require('../models/PasswordResetRequest');

// GET /api/organizers – list all active organizers (public)
router.get('/', async (req, res) => {
    try {
        const organizers = await User.find({ role: 'organizer', isActive: true })
            .select('organizerName category description contactEmail createdAt')
            .sort({ organizerName: 1 });
        res.json(organizers);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/organizers/:id – organizer detail with events (public)
router.get('/:id', async (req, res) => {
    try {
        const org = await User.findOne({ _id: req.params.id, role: 'organizer', isActive: true })
            .select('organizerName category description contactEmail');
        if (!org) return res.status(404).json({ message: 'Organizer not found' });

        const now = new Date();
        const upcomingEvents = await Event.find({
            organizer: req.params.id,
            status: { $in: ['published', 'ongoing'] },
            endDate: { $gte: now }
        }).select('name type startDate endDate registrationDeadline status').sort({ startDate: 1 });

        const pastEvents = await Event.find({
            organizer: req.params.id,
            $or: [
                { status: { $in: ['completed', 'closed'] } },
                { endDate: { $lt: now }, status: { $ne: 'draft' } }
            ]
        }).select('name type startDate endDate status').sort({ endDate: -1 }).limit(10);

        res.json({ organizer: org, upcomingEvents, pastEvents });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/organizers/profile/me – own profile (organizer)
router.get('/profile/me', protect, authorize('organizer'), async (req, res) => {
    res.json(req.user);
});

// PUT /api/organizers/profile/me – update own profile
router.put('/profile/me', protect, authorize('organizer'), async (req, res) => {
    const { organizerName, category, description, contactEmail, discordWebhook } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { organizerName, category, description, contactEmail, discordWebhook },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/organizers/analytics/all – aggregate + per-event breakdown for completed events
router.get('/analytics/all', protect, authorize('organizer'), async (req, res) => {
    try {
        const allEvents = await Event.find({ organizer: req.user._id }).sort({ createdAt: -1 }).lean();
        const completedEvents = allEvents.filter(e => e.status === 'completed');
        const eventIds = completedEvents.map(e => e._id);

        const regs = await Registration.find({ event: { $in: eventIds } }).lean();
        const totalSales = regs.length;
        const attended = regs.filter(r => r.status === 'attended').length;

        // Per-event breakdown
        const perEvent = completedEvents.map(e => {
            const eRegs = regs.filter(r => r.event.toString() === e._id.toString());
            const paid = eRegs.filter(r => r.paymentStatus === 'paid');
            const eAttended = eRegs.filter(r => r.status === 'attended').length;
            const revenue = paid.length * (e.registrationFee || 0);
            return {
                _id: e._id,
                name: e.name,
                status: e.status,
                startDate: e.startDate,
                registrationFee: e.registrationFee || 0,
                registrations: eRegs.length,
                paid: paid.length,
                attended: eAttended,
                attendanceRate: eRegs.length > 0 ? Math.round((eAttended / eRegs.length) * 100) : 0,
                revenue,
            };
        });

        const revenue = perEvent.reduce((s, e) => s + e.revenue, 0);

        res.json({
            totalEvents: allEvents.length,
            completedEvents: completedEvents.length,
            totalSales,
            attended,
            revenue,
            perEvent,
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


// POST /api/organizers/password-reset-request
router.post('/password-reset-request', protect, authorize('organizer'), async (req, res) => {
    try {
        const existing = await PasswordResetRequest.findOne({ organizer: req.user._id, status: 'pending' });
        if (existing) return res.status(400).json({ message: 'A reset request is already pending. Contact admin.' });
        const reqDoc = new PasswordResetRequest({ organizer: req.user._id });
        await reqDoc.save();
        res.json({ message: 'Password reset request submitted. Admin will reset your password.' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/organizers/discord-webhook-test
router.post('/discord-webhook-test', protect, authorize('organizer'), async (req, res) => {
    const { webhookUrl } = req.body;
    if (!webhookUrl) return res.status(400).json({ message: 'Webhook URL required' });
    try {
        const { default: fetch } = await import('node-fetch');
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: ' Felicity webhook connected successfully!' }),
        });
        if (!response.ok) throw new Error('Discord returned ' + response.status);
        res.json({ message: 'Webhook test successful' });
    } catch (err) {
        res.status(400).json({ message: 'Webhook test failed: ' + err.message });
    }
});

module.exports = router;
