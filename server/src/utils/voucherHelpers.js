const ModelVoucher = require('../models/ModelVoucher');
const ModelPayment = require('../models/ModelPayment');

const SHIPPING_FEE = 30000;

const getExpiryEnd = (date) => {
    const expiry = new Date(date);
    expiry.setHours(23, 59, 59, 999);
    return expiry;
};

const isVoucherExpired = (expiredAt) => new Date() > getExpiryEnd(expiredAt);

const normalizeExpiredAt = (dateInput) => getExpiryEnd(dateInput);

const isVoucherOutOfStock = (voucher) => {
    const quantity = Number(voucher?.quantity || 0);
    const used = Number(voucher?.used || 0);
    return quantity !== 0 && used >= quantity;
};

const isVoucherUnlimited = (voucher) => Number(voucher?.quantity || 0) === 0;

const getVoucherAvailabilityError = (voucher, { orderTotal = 0 } = {}) => {
    if (!voucher) return 'Voucher không tồn tại';
    if (!voucher.isActive) return 'Voucher đã bị tắt';
    if (isVoucherExpired(voucher.expiredAt)) return 'Voucher đã hết hạn';
    if (isVoucherOutOfStock(voucher)) return 'Voucher đã hết lượt sử dụng';

    if (orderTotal > 0 && orderTotal < Number(voucher.minOrderValue || 0)) {
        return `Đơn hàng tối thiểu ${Number(voucher.minOrderValue).toLocaleString('vi-VN')}đ`;
    }

    return null;
};

const calculateVoucherDiscount = (voucher, { orderTotal = 0, shippingFee = SHIPPING_FEE } = {}) => {
    const baseAmount = voucher.category === 'shipping' ? shippingFee : orderTotal;
    let discountAmount = 0;

    if (voucher.discountType === 'percent') {
        discountAmount = (baseAmount * voucher.discountValue) / 100;

        if (voucher.maxDiscount > 0 && discountAmount > voucher.maxDiscount) {
            discountAmount = voucher.maxDiscount;
        }
    } else {
        discountAmount = voucher.discountValue;
    }

    if (discountAmount > baseAmount) {
        discountAmount = baseAmount;
    }

    return discountAmount;
};

const buildCartVoucherPayload = (voucher, discountAmount) => ({
    code: voucher.code,
    title: voucher.title,
    category: voucher.category,
    discountType: voucher.discountType,
    discountValue: voucher.discountValue,
    discountAmount,
});

const autoDisableExpiredVouchers = async () => {
    try {
        const activeVouchers = await ModelVoucher.find({ isActive: true }).select('_id expiredAt').lean();
        const expiredIds = activeVouchers
            .filter((voucher) => isVoucherExpired(voucher.expiredAt))
            .map((voucher) => voucher._id);

        if (!expiredIds.length) return;

        await ModelVoucher.updateMany({ _id: { $in: expiredIds } }, { $set: { isActive: false } });
    } catch (error) {
        console.log('AUTO EXPIRE VOUCHER ERROR:', error.message);
    }
};

const autoDisableDepletedVouchers = async () => {
    try {
        await ModelVoucher.updateMany(
            {
                isActive: true,
                quantity: { $gt: 0 },
                $expr: { $gte: ['$used', '$quantity'] },
            },
            { $set: { isActive: false } },
        );
    } catch (error) {
        console.log('AUTO DEPLETE VOUCHER ERROR:', error.message);
    }
};

const syncVoucherUsedCounts = async () => {
    try {
        const vouchers = await ModelVoucher.find().select('_id code used quantity isActive').lean();

        await Promise.all(
            vouchers.map(async (voucher) => {
                const actualUsed = await ModelPayment.countDocuments({
                    'voucher.code': voucher.code,
                    status: { $ne: 'cancelled' },
                });

                if (actualUsed === Number(voucher.used || 0)) return;

                const updates = { used: actualUsed };

                if (Number(voucher.quantity || 0) !== 0 && actualUsed >= Number(voucher.quantity || 0)) {
                    updates.isActive = false;
                }

                await ModelVoucher.updateOne({ _id: voucher._id }, { $set: updates });
            }),
        );
    } catch (error) {
        console.log('SYNC VOUCHER USED ERROR:', error.message);
    }
};

const maintainVoucherStatuses = async () => {
    await syncVoucherUsedCounts();
    await autoDisableExpiredVouchers();
    await autoDisableDepletedVouchers();
};

const consumeVoucher = async (voucherCode) => {
    const code = String(voucherCode || '').trim().toUpperCase();
    if (!code) return null;

    const voucher = await ModelVoucher.findOneAndUpdate(
        {
            code,
            isActive: true,
            $or: [{ quantity: 0 }, { $expr: { $lt: ['$used', '$quantity'] } }],
        },
        { $inc: { used: 1 } },
        { new: true },
    );

    if (!voucher) {
        const existing = await ModelVoucher.findOne({ code }).lean();
        if (!existing) throw new Error('Voucher không tồn tại');
        if (!existing.isActive) throw new Error('Voucher đã bị tắt');
        if (isVoucherExpired(existing.expiredAt)) throw new Error('Voucher đã hết hạn');
        throw new Error('Voucher đã hết lượt sử dụng');
    }

    if (isVoucherExpired(voucher.expiredAt)) {
        await ModelVoucher.updateOne({ _id: voucher._id }, { $inc: { used: -1 }, $set: { isActive: false } });
        throw new Error('Voucher đã hết hạn');
    }

    if (!isVoucherUnlimited(voucher) && voucher.used > voucher.quantity) {
        await ModelVoucher.updateOne(
            { _id: voucher._id },
            { $set: { used: voucher.quantity, isActive: false } },
        );
        throw new Error('Voucher đã hết lượt sử dụng');
    }

    if (!isVoucherUnlimited(voucher) && voucher.used >= voucher.quantity) {
        voucher.isActive = false;
        await voucher.save();
    }

    return voucher;
};

const releaseVoucher = async (voucherCode) => {
    const code = String(voucherCode || '').trim().toUpperCase();
    if (!code) return null;

    return ModelVoucher.findOneAndUpdate({ code, used: { $gt: 0 } }, { $inc: { used: -1 } }, { new: true });
};

module.exports = {
    SHIPPING_FEE,
    getExpiryEnd,
    isVoucherExpired,
    normalizeExpiredAt,
    isVoucherOutOfStock,
    isVoucherUnlimited,
    getVoucherAvailabilityError,
    calculateVoucherDiscount,
    buildCartVoucherPayload,
    maintainVoucherStatuses,
    consumeVoucher,
    releaseVoucher,
};
