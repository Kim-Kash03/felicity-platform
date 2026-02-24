const mongoose = require('mongoose');

const RegistrationSchema = new mongoose.Schema({
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },

    // Ticket
    ticketId: { type: String, unique: true, sparse: true },
    qrCode: { type: String }, // base64 encoded QR image

    // Status
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'attended', 'cancelled', 'rejected'],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['free', 'pending', 'paid', 'refunded'],
        default: 'free'
    },

    // For normal events - custom form responses
    formResponses: { type: Map, of: mongoose.Schema.Types.Mixed },

    // For merchandise events
    merchandiseVariants: [{
        variantId: mongoose.Schema.Types.ObjectId,
        size: String,
        color: String,
        quantity: { type: Number, default: 1 }
    }],
    totalAmount: { type: Number, default: 0 },

    // Payment proof
    paymentProofUrl: { type: String, default: null },

    // Metadata
    registeredAt: { type: Date, default: Date.now },
    emailSent: { type: Boolean, default: false },
}, { timestamps: true });
module.exports = mongoose.model('Registration', RegistrationSchema);
