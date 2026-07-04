const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const modelCart = new Schema({
    user: { type: String, default: '' },
    products: [
        {
            nameProduct: { type: String, default: '' },
            quantity: { type: Number, default: 0 },
            price: { type: Number, default: 0 },
            size: { type: Number, default: 0 },
            img: { type: String, default: '' },
            type: { type: Number, default: 0 },
        },
    ],
    address: { type: String, default: '' },
    name: { type: String, default: '' },
    phone: { type: Number, default: 0 },
    sumprice: { type: Number, default: 0 },
    phone: { type: Number, default: 0 },

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
});

module.exports = mongoose.model('cart', modelCart, 'shoe.carts');
