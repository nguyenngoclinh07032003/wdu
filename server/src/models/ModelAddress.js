const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        fullName: {
            type: String,
            required: true,
            trim: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
            match: [/^(0|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ'],
        },

        province: {
            type: String,
            required: true,
            trim: true,
        },

        district: {
            type: String,
            trim: true,
            default: '',
        },

        ward: {
            type: String,
            required: true,
            trim: true,
        },

        detail: {
            type: String,
            required: true,
            trim: true,
        },

        // GOOGLE MAP LOCATION
        lat: {
            type: Number,
            default: null,
        },

        lng: {
            type: Number,
            default: null,
        },

        mapAddress: {
            type: String,
            default: '',
            trim: true,
        },

        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    },
);

// index tối ưu query — `user` already has index: true above
// addressSchema.index({ user: 1 });

// tự động set địa chỉ đầu tiên thành mặc định
addressSchema.pre('save', async function () {
    if (this.isNew) {
        const count = await mongoose.model('address').countDocuments({
            user: this.user,
        });

        if (count === 0) {
            this.isDefault = true;
        }
    }
});

module.exports = mongoose.model('address', addressSchema, 'shoe.addresses');
