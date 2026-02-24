const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Registration = require('../models/Registration');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/participants/profile
router.get('/profile', protect, authorize('participant'), async (req, res) => {
    res.json(req.user);
});

// PUT /api/participants/profile
router.put('/profile', protect, authorize('participant'), async (req, res) => {
    const { firstName, lastName, contactNumber, college, interests, followedOrganizers } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { firstName, lastName, contactNumber, college, interests, followedOrganizers },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// PUT /api/participants/onboarding – complete onboarding
router.put('/onboarding', protect, authorize('participant'), async (req, res) => {
    const { interests, followedOrganizers } = req.body;
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { interests: interests || [], followedOrganizers: followedOrganizers || [], onboardingComplete: true },
            { new: true }
        ).select('-password');
        res.json({ message: 'Onboarding complete', user });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/participants/follow/:organizerId
router.post('/follow/:organizerId', protect, authorize('participant'), async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const orgId = req.params.organizerId;
        // Must compare as strings: user.followedOrganizers contains ObjectIds
        const alreadyFollowing = user.followedOrganizers.some(id => id.toString() === orgId);

        if (alreadyFollowing) {
            user.followedOrganizers = user.followedOrganizers.filter(id => id.toString() !== orgId);
            await user.save();
            return res.json({ message: 'Unfollowed', following: false });
        } else {
            user.followedOrganizers.push(orgId);
            await user.save();
            return res.json({ message: 'Followed', following: true });
        }
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/participants/registrations – my registration history
router.get('/registrations', protect, authorize('participant'), async (req, res) => {
    try {
        const regs = await Registration.find({ participant: req.user._id })
            .populate({
                path: 'event',
                populate: { path: 'organizer', select: 'organizerName' }
            })
            .sort({ registeredAt: -1 });
        res.json(regs);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/participants/ticket/:ticketId
router.get('/ticket/:ticketId', protect, authorize('participant'), async (req, res) => {
    try {
        const reg = await Registration.findOne({
            ticketId: req.params.ticketId,
            participant: req.user._id
        }).populate({
            path: 'event',
            populate: { path: 'organizer', select: 'organizerName category' }
        });
        if (!reg) return res.status(404).json({ message: 'Ticket not found' });
        res.json(reg);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
