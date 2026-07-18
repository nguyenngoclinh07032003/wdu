const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const DELIVERY_STATUSES = [
    'ASSIGNED',
    'ACCEPTED',
    'DELIVERING',
    'DELIVERED',
    'FIRST_DELIVERY_FAILED',
    'REDELIVERING',
    'DELIVERED_AFTER_RETRY',
    'RETURNING',
    'RETURNED',
];

const modelDeliveryHistory = new Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'payment',
            required: true,
            index: true,
        },
        shipperId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            default: null,
            index: true,
        },
        attemptNumber: {
            type: Number,
            default: 0,
            min: 0,
            max: 2,
        },
        previousStatus: {
            type: String,
            default: '',
        },
        newStatus: {
            type: String,
            enum: DELIVERY_STATUSES,
            required: true,
        },
        failureReason: {
            type: String,
            default: '',
        },
        note: {
            type: String,
            default: '',
        },
        evidenceImage: {
            type: String,
            default: '',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            default: null,
        },
        createdByRole: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    },
);

module.exports = mongoose.model('deliveryHistory', modelDeliveryHistory, 'shoe.delivery_histories');
module.exports.DELIVERY_STATUSES = DELIVERY_STATUSES;
