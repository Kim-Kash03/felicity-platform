const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // Common fields
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['participant', 'organizer', 'admin'], required: true },
    isActive: { type: Boolean, default: true },

    // Participant fields
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    participantType: { type: String, enum: ['iiit', 'non-iiit'] },
    contactNumber: { type: String, trim: true },
    college: { type: String, trim: true },
    interests: [{ type: String }],
    followedOrganizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    onboardingComplete: { type: Boolean, default: false },
    readAnnouncements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Announcement' }],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    // Organizer fields
    organizerName: { type: String, trim: true },
    category: { type: String, trim: true },
    description: { type: String },
    contactEmail: { type: String, trim: true },
    discordWebhook: { type: String },
    generatedPassword: { type: String },
}, { timestamps: true });

UserSchema.virtual('fullName').get(function () {
    if (this.firstName && this.lastName) return `${this.firstName} ${this.lastName}`;
    return this.organizerName || 'Admin';
});

module.exports = mongoose.model('User', UserSchema);
