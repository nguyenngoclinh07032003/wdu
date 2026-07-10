const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelReminderLog = new Schema(
    {
        reminderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'reminders',
            required: true,
            index: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
            required: true,
            index: true,
        },

        status: {
            type: String,
            enum: ['completed', 'missed'],
            default: 'completed',
        },

        type: {
            type: String,
            enum: ['completed', 'missed', 'email_sent'],
            default: 'completed',
        },

        note: {
            type: String,
            default: '',
        },

        completedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('reminder_logs', modelReminderLog);
