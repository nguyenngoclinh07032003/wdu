const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ModelSupportCustomerNotification = new Schema(
    {
        customerUserId: { type: Schema.Types.ObjectId, ref: 'user', default: null },
        phone: { type: String, default: '', index: true },
        email: { type: String, default: '', lowercase: true, trim: true },
        supportRequestId: { type: Schema.Types.ObjectId, ref: 'support_request', required: true },
        requestCode: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ['accepted', 'reply', 'resolved', 'status_update'],
            required: true,
        },
        title: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        status: { type: String, default: '' },
        statusLabel: { type: String, default: '' },
        staffName: { type: String, default: '' },
        receivedAt: { type: Date, default: null },
        isRead: { type: Boolean, default: false },
    },
    { collection: 'shoe.support_customer_notifications', timestamps: true },
);

module.exports = mongoose.model('support_customer_notification', ModelSupportCustomerNotification);
