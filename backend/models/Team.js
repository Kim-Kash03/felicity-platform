const mongoose = require('mongoose');

const TeamMemberSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
}, { _id: false });

const TeamSchema = new mongoose.Schema({
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    maxSize: { type: Number, required: true, min: 2, max: 10 },
    code: { type: String, required: true, unique: true }, // unique invite code/link
    members: [TeamMemberSchema], // includes leader as 'accepted'
    status: { type: String, enum: ['incomplete', 'complete'], default: 'incomplete' },
}, { timestamps: true });

// Prevent a user from leading/joining multiple teams for the same event
TeamSchema.index({ eventId: 1, leaderId: 1 }, { unique: true });

module.exports = mongoose.model('Team', TeamSchema);
