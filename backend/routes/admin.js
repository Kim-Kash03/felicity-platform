const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const { protect, authorize } = require('../middleware/authMiddleware');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const Announcement = require('../models/Announcement');

// All routes: admin only
router.use(protect, authorize('admin'));

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
    try {
        const [
            totalParticipants,
            totalOrganizers,
            totalEvents,
            activeEvents,
            recentOrganizers,
            recentResets,
            recentEvents,
            revenueAgg,
        ] = await Promise.all([
            User.countDocuments({ role: 'participant' }),
            User.countDocuments({ role: 'organizer' }),
            Event.countDocuments(),
            Event.countDocuments({ status: { $in: ['published', 'ongoing'] } }),
            User.find({ role: 'organizer' })
                .select('organizerName email category createdAt isActive')
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            PasswordResetRequest.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('organizer', 'organizerName email')
                .lean(),
            Event.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('organizer', 'organizerName')
                .select('name status createdAt registrationFee')
                .lean(),
            Registration.aggregate([
                { $match: { paymentStatus: 'paid' } },
                {
                    $lookup: {
                        from: 'events',
                        localField: 'event',
                        foreignField: '_id',
                        as: 'eventData',
                    },
                },
                { $unwind: { path: '$eventData', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $ifNull: ['$eventData.registrationFee', 0] } },
                    },
                },
            ]),
        ]);

        res.json({
            totalParticipants,
            totalOrganizers,
            totalEvents,
            activeEvents,
            totalRevenue: revenueAgg[0]?.total || 0,
            recentOrganizers,
            recentResets,
            recentEvents,
        });
    } catch (err) {
        console.error('[admin/stats]', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


// GET /api/admin/organizers – list all organizers
router.get('/organizers', async (req, res) => {
    try {
        const organizers = await User.find({ role: 'organizer' })
            .select('-password -generatedPassword')
            .sort({ createdAt: -1 });
        res.json(organizers);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/admin/organizers – create new organizer
router.post('/organizers', async (req, res) => {
    const { organizerName, category, description, contactEmail } = req.body;
    if (!organizerName || !category) return res.status(400).json({ message: 'Organizer name and category are required' });

    try {
        // Auto-generate login email and password
        const slug = organizerName.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        const baseEmail = `${slug}@felicity.iiit.ac.in`;

        // Ensure unique email
        let loginEmail = baseEmail;
        let counter = 1;
        while (await User.findOne({ email: loginEmail })) {
            loginEmail = `${slug}${counter}@felicity.iiit.ac.in`;
            counter++;
        }

        // Generate random password
        const rawPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase() + '!';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const organizer = new User({
            email: loginEmail,
            password: hashedPassword,
            generatedPassword: rawPassword,
            role: 'organizer',
            organizerName,
            category,
            description: description || '',
            contactEmail: contactEmail || loginEmail,
            isActive: true,
        });
        await organizer.save();

        res.status(201).json({
            message: 'Organizer created successfully',
            credentials: {
                email: loginEmail,
                password: rawPassword,
            },
            organizer: {
                id: organizer._id,
                email: organizer.email,
                organizerName: organizer.organizerName,
                category: organizer.category,
                description: organizer.description,
                contactEmail: organizer.contactEmail,
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/admin/organizers/:id/disable – disable organizer
router.put('/organizers/:id/disable', async (req, res) => {
    try {
        const org = await User.findOneAndUpdate(
            { _id: req.params.id, role: 'organizer' },
            { isActive: false },
            { new: true }
        ).select('-password');
        if (!org) return res.status(404).json({ message: 'Organizer not found' });
        res.json({ message: 'Organizer disabled', organizer: org });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/admin/organizers/:id/enable – re-enable organizer
router.put('/organizers/:id/enable', async (req, res) => {
    try {
        const org = await User.findOneAndUpdate(
            { _id: req.params.id, role: 'organizer' },
            { isActive: true },
            { new: true }
        ).select('-password');
        if (!org) return res.status(404).json({ message: 'Organizer not found' });
        res.json({ message: 'Organizer enabled', organizer: org });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// DELETE /api/admin/organizers/:id – permanently delete organizer + cascade
router.delete('/organizers/:id', async (req, res) => {
    try {
        const org = await User.findOneAndDelete({ _id: req.params.id, role: 'organizer' });
        if (!org) return res.status(404).json({ message: 'Organizer not found' });

        // Cascade: delete all events for this organizer
        const orgEvents = await Event.find({ organizer: req.params.id }).select('_id');
        const eventIds = orgEvents.map(e => e._id);

        // Cascade: delete all registrations for those events
        if (eventIds.length > 0) {
            await Registration.deleteMany({ event: { $in: eventIds } });
        }
        await Event.deleteMany({ organizer: req.params.id });

        // Cascade: delete announcements
        await Announcement.deleteMany({ organizer: req.params.id });

        // Cascade: delete reset requests
        await PasswordResetRequest.deleteMany({ organizer: req.params.id });

        // Cascade: remove from followers' lists
        await User.updateMany(
            { role: 'participant' },
            { $pull: { followedOrganizers: req.params.id } }
        );

        res.json({
            message: 'Organizer permanently deleted and related data purged',
            eventsDeleted: eventIds.length,
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/admin/password-resets – list pending password reset requests
router.get('/password-resets', async (req, res) => {
    try {
        const requests = await PasswordResetRequest.find()
            .populate('organizer', 'organizerName email category')
            .sort({ requestedAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/admin/password-resets/:id/resolve – reset organizer password
router.put('/password-resets/:id/resolve', async (req, res) => {
    try {
        const { adminComment } = req.body;
        const resetReq = await PasswordResetRequest.findById(req.params.id).populate('organizer');
        if (!resetReq) return res.status(404).json({ message: 'Request not found' });

        // Generate new password
        const newPassword = Math.random().toString(36).slice(-8) + 'A1!';
        const hashed = await bcrypt.hash(newPassword, 10);

        await User.findByIdAndUpdate(resetReq.organizer._id, {
            password: hashed,
            generatedPassword: newPassword,
        });

        resetReq.status = 'resolved';
        resetReq.resolvedAt = new Date();
        resetReq.newPasswordPlain = newPassword;
        resetReq.adminComment = adminComment || '';
        await resetReq.save();

        res.json({
            message: 'Password reset successfully',
            newPassword,
            organizerEmail: resetReq.organizer.email,
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/admin/password-resets/:id/reject – reject organizer password reset
router.put('/password-resets/:id/reject', async (req, res) => {
    try {
        const { adminComment } = req.body;
        const resetReq = await PasswordResetRequest.findById(req.params.id);
        if (!resetReq) return res.status(404).json({ message: 'Request not found' });

        resetReq.status = 'rejected';
        resetReq.resolvedAt = new Date();
        resetReq.adminComment = adminComment || '';
        await resetReq.save();

        res.json({ message: 'Request rejected' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
