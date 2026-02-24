const mongoose = require('mongoose');

const DirectMessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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

// Add indexes for fast fetching of conversation between two users
DirectMessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
DirectMessageSchema.index({ receiver: 1, sender: 1, createdAt: -1 });

module.exports = mongoose.model('DirectMessage', DirectMessageSchema);
