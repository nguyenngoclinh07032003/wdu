const mongoose = require('mongoose');

const VoucherSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },

        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },

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

        discountValue: {
            type: Number,
            required: true,
            min: 1,
        },

        minOrderValue: {
            type: Number,
            default: 0,
            min: 0,
        },

        maxDiscount: {
            type: Number,
            default: 0,
            min: 0,
        },

        quantity: {
            type: Number,
            default: 0,
            min: 0,
        },

        used: {
            type: Number,
            default: 0,
            min: 0,
        },

        expiredAt: {
            type: Date,
            required: true,
        },

        description: {
            type: String,
            default: '',
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('voucher', VoucherSchema, 'shoe.vouchers');
