const mongoose = require('mongoose');
const { create } = require('./ModelRegisterOTP');

const Schema = mongoose.Schema;

const ModelUser = new Schema({
    fullname: {
        type: String,
        required: true,
    },

    password: {
        type: String,
        required: function () {
            return !this.isGoogleAccount;
        },
    },

    phone: {
        type: Number,
        required: function () {
            return !this.isGoogleAccount;
        },
        unique: true,
        sparse: true,
    },

    isGoogleAccount: {
        type: Boolean,
        default: false,
    },
    email: { type: String, required: true, lowercase: true, unique: true },
    isAdmin: { type: Boolean, default: false },
    role: {
        type: String,
        enum: ['user', 'admin', 'shipper'],
        default: 'user',
    },
    isActive: { type: Boolean, default: true },
    sex: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    brirthday: { type: Date, default: null },
    avatar: { type: String, default: '' },
    surplus: { type: Number, default: 0 },
    // for password reset OTP
    resetOtp: { type: String, default: '' },
    resetOtpExpiry: { type: Date, default: null },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: null },
});

module.exports = mongoose.model('user', ModelUser, 'shoe.users');
