const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ModelChatHistory = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            default: null,
            index: true,
        },

        sessionId: {
            type: String,
            default: '',
            index: true,
        },

        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true,
        },

        content: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    },
);

module.exports = mongoose.model('chat_history', ModelChatHistory);
