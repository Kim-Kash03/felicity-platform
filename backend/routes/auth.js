const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const PasswordResetRequest = require('../models/PasswordResetRequest');
const { protect } = require('../middleware/authMiddleware');
const { sendPasswordResetEmail } = require('../utils/email');

const IIIT_DOMAINS = ['@iiit.ac.in', '@research.iiit.ac.in', '@students.iiit.ac.in', '@mg.iiit.ac.in'];

const isIIITEmail = (email) => IIIT_DOMAINS.some(d => email.toLowerCase().endsWith(d));

// POST /api/auth/register  – participants only
router.post('/register', async (req, res) => {
    const { email, password, firstName, lastName, contactNumber, college } = req.body;

    if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: 'Email, password, first name, and last name are required' });
    }
    if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    try {
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ message: 'Email already registered' });

        const iiit = isIIITEmail(email);
        const hashed = await bcrypt.hash(password, 10);

        const user = new User({
            email: email.toLowerCase(),
            password: hashed,
            role: 'participant',
            participantType: iiit ? 'iiit' : 'non-iiit',
            firstName,
            lastName,
            contactNumber: contactNumber || '',
            college: iiit ? 'IIIT Hyderabad' : (college || ''),
            onboardingComplete: false,
        });
        await user.save();

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'Registered successfully',
            token,
            user: {
                id: user._id,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                participantType: user.participantType,
                onboardingComplete: user.onboardingComplete,
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/auth/login  – all roles
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });
        if (!user.isActive) return res.status(403).json({ message: 'Account disabled. Contact admin.' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        const payload = {
            id: user._id,
            role: user.role,
            email: user.email,
        };

        if (user.role === 'participant') {
            payload.firstName = user.firstName;
            payload.lastName = user.lastName;
            payload.participantType = user.participantType;
            payload.onboardingComplete = user.onboardingComplete;
        } else if (user.role === 'organizer') {
            payload.organizerName = user.organizerName;
            payload.category = user.category;
        } else {
            payload.name = 'Admin';
        }

        res.json({ token, user: payload });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// GET /api/auth/me  – get current user profile
router.get('/me', protect, async (req, res) => {
    res.json(req.user);
});

// PUT /api/auth/change-password
router.put('/change-password', protect, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });

    try {
        const user = await User.findById(req.user._id);
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) return res.status(400).json({ message: 'Current password incorrect' });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    const { email, role } = req.body;
    if (!email || !role) return res.status(400).json({ message: 'Email and role are required' });

    try {
        const user = await User.findOne({ email: email.toLowerCase(), role });
        if (!user) {
            // Return success even if not found to prevent email enumeration
            const msg = role === 'organizer'
                ? 'Admin approval required for Organizer resets. A request has been sent to the Admin.'
                : 'If an account with that email exists, a reset link has been sent.';
            return res.json({ message: msg });
        }

        if (role === 'participant') {
            // Generate a secure reset token
            const resetToken = crypto.randomBytes(32).toString('hex');

            // Hash token before saving to DB
            user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
            await user.save();

            // Create reset URL
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

            // Send email
            try {
                await sendPasswordResetEmail({
                    to: user.email,
                    resetLink: resetUrl
                });
            } catch (err) {
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;
                await user.save();
                return res.status(500).json({ message: 'Error sending email' });
            }

            res.json({ message: 'If an account with that email exists, a reset link has been sent.' });

        } else if (role === 'organizer') {
            const { reason } = req.body;
            // Check if a pending request already exists
            const existingRequest = await PasswordResetRequest.findOne({ organizer: user._id, status: 'pending' });
            if (!existingRequest) {
                await PasswordResetRequest.create({ organizer: user._id, reason });
            }
            res.json({ message: 'Admin approval required for Organizer resets. A request has been sent to the Admin.' });
        } else {
            res.status(400).json({ message: 'Invalid role for password reset' });
        }

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', async (req, res) => {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    try {
        // Hash the token from URL to compare with DB
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() },
            role: 'participant'
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired password reset token' });
        }

        // Set new password
        user.password = await bcrypt.hash(password, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successfully. You can now log in.' });

    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
