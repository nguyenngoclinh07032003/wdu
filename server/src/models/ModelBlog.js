const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, trim: true },
        excerpt: { type: String, default: '' },
        content: { type: String, default: '' },
        thumbnail: { type: String, default: '' },
        category: { type: String, default: 'kiến thức' },
        tags: [{ type: String }],
        author: { type: String, default: 'Admin' },
        readTime: { type: String, default: '5 phút đọc' },
        views: { type: Number, default: 0 },
        featured: { type: Boolean, default: false },

        status: {
            type: String,
            enum: ['draft', 'published'],
            default: 'draft',
        },

        deleted: { type: Boolean, default: false },

        seoTitle: { type: String, default: '' },
        metaDescription: { type: String, default: '' },
        publishMode: {
            type: String,
            enum: ['now', 'schedule'],
            default: 'now',
        },
        scheduleDate: { type: String, default: '' },
        publishedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

module.exports = mongoose.model('Blog', PostSchema);
