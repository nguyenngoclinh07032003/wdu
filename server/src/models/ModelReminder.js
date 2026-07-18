const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelReminder = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
            required: true,
            index: true,
        },
        userEmail: {
            type: String,
            default: '',
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'products',
            default: null,
        },

        title: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            default: '',
        },

        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'custom'],
            default: 'daily',
        },

        times: {
            type: [String],
            default: [],
        },

        methods: {
            type: [String],
            enum: ['push', 'email', 'sms'],
            default: ['push'],
        },

        isActive: {
            type: Boolean,
            default: true,
        },
        lastCompletedAt: {
            type: Date,
            default: null,
        },
        lastSentAt: {
            type: Date,
            default: null,
        },
    },

    {
        timestamps: true,
    },
);

module.exports = mongoose.model('reminders', modelReminder, 'shoe.reminders');
