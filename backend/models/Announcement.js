const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    target: { type: String, enum: ['followers', 'registered'], default: 'followers' },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
