const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelPayment = new Schema({
    products: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'product',
                index: true,
            },

            nameProduct: { type: String, default: '' },
            quantity: { type: Number, default: 0 },
            price: { type: Number, default: 0 },
            size: { type: Number, default: 0 },
            img: { type: String, default: '' },
            type: { type: Number, default: 0 },
        },
    ],

    subtotal: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    productDiscount: { type: Number, default: 0 },
    shippingDiscount: { type: Number, default: 0 },
    sumprice: { type: Number, default: 0 },

    voucher: {
        code: { type: String, default: '' },
        title: { type: String, default: '' },
        category: {
            type: String,
            enum: ['shipping', 'device', 'food', 'test'],
            default: 'device',
        },
        discountType: {
            type: String,
            enum: ['money', 'percent'],
            default: 'money',
        },
        discountValue: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
    },

    voucherConsumed: { type: Boolean, default: false },

    paymentMethod: {
        type: String,
        enum: ['COD', 'MOMO', 'VNPAY'],
        default: 'COD',
    },

    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid', 'failed', 'refunded'],
        default: 'unpaid',
    },

    status: {
        type: String,
        enum: ['pending', 'confirmed', 'shipping', 'completed', 'failed', 'returning', 'returned', 'cancelled'],
        default: 'pending',
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        index: true,
    },
    shipperId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null,
    },

    shipperName: {
        type: String,
        default: '',
    },

    assignedAt: {
        type: Date,
        default: null,
    },

    deliveredAt: {
        type: Date,
        default: null,
    },
    cancelInfo: {
        reason: {
            type: String,
            default: '',
        },
        cancelledBy: {
            type: String,
            enum: ['user', 'admin', 'system'],
            default: null,
        },
        cancelledAt: {
            type: Date,
            default: null,
        },
    },
    phone: { type: Number, default: 0 },
    email: { type: String, default: '' },
    username: { type: String, default: '' },
    address: { type: String, default: '' },
    note: { type: String, default: '' },
    user: { type: String, default: '' },

    gatewayOrderId: { type: String, default: '' },
    gatewayTxnRef: { type: String, default: '' },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('payment', modelPayment, 'shoe.payments');
