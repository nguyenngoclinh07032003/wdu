const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            default: 'system',
        },
        voucherCode: {
            type: String,
            default: '',
        },
        isPublic: {
            type: Boolean,
            default: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('notification', NotificationSchema, 'shoe.notifications');
