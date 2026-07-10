const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelReview = new Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'payment',
            required: true,
        },
        productIndex: {
            type: Number,
            default: 0,
        },
        avatar: {
            type: String,
            default: '',
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
        },

        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
            default: null,
        },

        nameProduct: {
            type: String,
            required: true,
        },

        img: {
            type: String,
            default: '',
        },

        username: {
            type: String,
            default: '',
        },

        email: {
            type: String,
            default: '',
        },

        rating: {
            type: Number,
            min: 1,
            max: 5,
            required: true,
        },

        content: {
            type: String,
            default: '',
        },

        tags: {
            type: [String],
            default: [],
        },

        images: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    },
);
modelReview.index({ orderId: 1, productIndex: 1, userId: 1 }, { unique: true });
module.exports = mongoose.model('review', modelReview);
