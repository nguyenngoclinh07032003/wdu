const mongoose = require('mongoose');

const BlogCommentSchema = new mongoose.Schema(
    {
        blogId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'blog',
            required: true,
        },

        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },

        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },

        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'user',
            },
        ],

        hearts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'user',
            },
        ],
        dislikes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'user',
            },
        ],
        parentCommentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'blogComment',
            default: null,
        },
        editedAt: {
            type: Date,
            default: null,
        },

        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model('blogComment', BlogCommentSchema, 'shoe.blogcomments');
