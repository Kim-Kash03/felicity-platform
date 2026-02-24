const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

// POST /api/announcements – Create announcement (Organizer only)
router.post('/', protect, authorize('organizer'), async (req, res) => {
    try {
        const { content, target, eventId } = req.body;
        if (!content) return res.status(400).json({ message: 'Content is required' });

        const announcement = new Announcement({
            organizer: req.user._id,
            content,
            target: target || 'followers',
            event: eventId || undefined
        });

        await announcement.save();

        // Discord notification logic
        if (req.user.discordWebhook) {
            try {
                const { default: fetch } = await import('node-fetch');
                await fetch(req.user.discordWebhook, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: ` @everyone **Announcement from ${req.user.organizerName}**\n\n${content}`,
                    }),
                });
            } catch (_) { }
        }

        res.status(201).json(announcement);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/announcements/my – Organizer's own announcements
router.get('/my', protect, authorize('organizer'), async (req, res) => {
    try {
        const announcements = await Announcement.find({ organizer: req.user._id }).sort({ createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/announcements/followed – Participant's feed of followed organizers' announcements
router.get('/followed', protect, authorize('participant'), async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const announcements = await Announcement.find({
            organizer: { $in: req.user.followedOrganizers },
            _id: { $nin: user.readAnnouncements || [] }
        })
            .populate('organizer', 'organizerName category')
            .sort({ createdAt: -1 })
            .limit(20);

        res.json(announcements);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/announcements/:id/read – Mark an announcement as read/seen
router.put('/:id/read', protect, authorize('participant'), async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user.readAnnouncements.includes(req.params.id)) {
            user.readAnnouncements.push(req.params.id);
            await user.save();
        }
        res.json({ message: 'Announcement marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
