const mongoose = require('mongoose');

// Custom form field schema for normal events
const FormFieldSchema = new mongoose.Schema({
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'textarea', 'dropdown', 'checkbox', 'radio', 'file', 'number', 'date'], required: true },
    options: [{ type: String }], // for dropdown/radio/checkbox
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
}, { _id: true });

// Merchandise variant schema
const MerchandiseVariantSchema = new mongoose.Schema({
    size: { type: String },
    color: { type: String },
    stock: { type: Number, default: 0 },
    additionalPrice: { type: Number, default: 0 },
}, { _id: true });

const EventSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['normal', 'merchandise'], required: true },
    eligibility: { type: String, default: 'all' }, // 'iiit', 'non-iiit', 'all'
    registrationDeadline: { type: Date, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    registrationLimit: { type: Number, default: 0 }, // 0 = unlimited
    registrationFee: { type: Number, default: 0 },
    tags: [{ type: String }],
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['draft', 'published', 'ongoing', 'completed', 'closed'], default: 'draft' },

    // Normal event fields
    customForm: [FormFieldSchema],
    formLocked: { type: Boolean, default: false }, // locked after first registration

    // Team/Hackathon event fields
    isTeamEvent: { type: Boolean, default: false },
    teamSizeMin: { type: Number, default: 2 },
    teamSizeMax: { type: Number, default: 10 },

    // Merchandise event fields
    variants: [MerchandiseVariantSchema],
    purchaseLimitPerParticipant: { type: Number, default: 1 },
    totalStock: { type: Number, default: 0 }, // computed / managed

    // Analytics
    viewCount: { type: Number, default: 0 },
    recentViews: [{ type: Date }], // for trending (last 24h)
}, { timestamps: true });

// Text index for full-text search
EventSchema.index({ name: 'text', description: 'text', tags: 'text' });
EventSchema.index({ organizer: 1, status: 1 });
EventSchema.index({ status: 1, registrationDeadline: 1 });

module.exports = mongoose.model('Event', EventSchema);
