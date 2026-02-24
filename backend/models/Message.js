const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'file'], default: 'text' },
    fileName: { type: String },
    fileUrl: { type: String },
    fileType: { type: String },
    reactions: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String }
    }]
}, { timestamps: true });

MessageSchema.index({ teamId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
