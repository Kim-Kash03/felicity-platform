const express = require('express');
const router = express.Router();
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

// GET /api/messages/:userId - Get chat history with a specific user
router.get('/:userId', protect, async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const currentUserId = req.user._id;

        // Verify the other user exists
        const otherUser = await User.findById(otherUserId).select('firstName lastName email');
        if (!otherUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        const messages = await DirectMessage.find({
            $or: [
                { sender: currentUserId, receiver: otherUserId },
                { sender: otherUserId, receiver: currentUserId }
            ]
        })
            .populate('sender', 'firstName lastName email')
            .populate('receiver', 'firstName lastName email')
            .sort({ createdAt: 1 })
            .limit(200);

        res.json({
            user: otherUser,
            messages
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
