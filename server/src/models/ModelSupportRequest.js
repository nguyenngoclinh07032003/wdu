const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ModelSupportRequest = new Schema(
    {
        requestCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        fullName: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        email: { type: String, default: '', trim: true },
        supportType: { type: String, required: true },
        supportTypeLabel: { type: String, default: '' },
        orderCode: { type: String, default: '', trim: true },
        message: { type: String, required: true, trim: true },
        imageName: { type: String, default: '' },
        imageData: { type: String, default: '' },
        agreeTerms: { type: Boolean, default: false },
        customerUserId: { type: Schema.Types.ObjectId, ref: 'user', default: null },
        status: {
            type: String,
            enum: [
                'pending',
                'received',
                'processing',
                'waiting_customer',
                'resolved',
                'closed',
                'cancelled',
            ],
            default: 'pending',
        },
        assignedTo: { type: Schema.Types.ObjectId, ref: 'user', default: null },
        assignedToName: { type: String, default: '' },
        receivedBy: { type: Schema.Types.ObjectId, ref: 'user', default: null },
        receivedByName: { type: String, default: '' },
        receivedAt: { type: Date, default: null },
        staffReply: { type: String, default: '' },
        staffReplyAt: { type: Date, default: null },
        staffReplyBy: { type: Schema.Types.ObjectId, ref: 'user', default: null },
        staffReplyByName: { type: String, default: '' },
        staffNotes: [
            {
                text: { type: String, default: '' },
                createdBy: { type: Schema.Types.ObjectId, ref: 'user', default: null },
                createdByName: { type: String, default: '' },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        statusHistory: [
            {
                status: { type: String, default: 'pending' },
                previousStatus: { type: String, default: '' },
                action: { type: String, default: 'status_change' },
                note: { type: String, default: '' },
                updatedBy: { type: Schema.Types.ObjectId, ref: 'user', default: null },
                updatedByName: { type: String, default: '' },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        replyHistory: [
            {
                message: { type: String, default: '' },
                senderRole: { type: String, enum: ['staff', 'customer'], default: 'staff' },
                senderName: { type: String, default: '' },
                createdBy: { type: Schema.Types.ObjectId, ref: 'user', default: null },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { collection: 'shoe.support_requests' },
);

module.exports = mongoose.model('support_request', ModelSupportRequest);
