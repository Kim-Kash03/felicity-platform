const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT and attach user to request
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password -generatedPassword');
        if (!user) return res.status(401).json({ message: 'User not found' });
        if (!user.isActive) return res.status(403).json({ message: 'Account disabled' });
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Token invalid or expired' });
    }
};

// Role-based gate — usage: authorize('admin', 'organizer')
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied. Required role: ${roles.join(' or ')}` });
        }
        next();
    };
};

module.exports = { protect, authorize };
