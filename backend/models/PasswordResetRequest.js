const mongoose = require('mongoose');

const PasswordResetRequestSchema = new mongoose.Schema({
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'resolved', 'rejected'], default: 'pending' },
    reason: { type: String },
    adminComment: { type: String },
    resolvedAt: { type: Date },
    newPasswordPlain: { type: String }, // set by admin after resolution (shown once)
}, { timestamps: true });

module.exports = mongoose.model('PasswordResetRequest', PasswordResetRequestSchema);
