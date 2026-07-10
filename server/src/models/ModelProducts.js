const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelProduct = new Schema({
    img: [{ type: String, default: '' }],
    videos: {
        type: [String],
        default: [],
    },
    name: { type: String, default: '' },
    price: { type: Number, default: 0 },
    slug: { type: String, default: '' },
    description: { type: String, default: '' },
    type: { type: Number, default: 0 },
    sold: {
        type: Number,
        default: 0,
    },
    isCombo: { type: Boolean, default: false },
});

module.exports = mongoose.model('products', modelProduct);
