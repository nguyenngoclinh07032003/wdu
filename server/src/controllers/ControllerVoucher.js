const ModelVoucher = require('../models/ModelVoucher');
const ModelPayment = require('../models/ModelPayment');
const autoDisableExpiredVouchers = async () => {
    try {
        await ModelVoucher.updateMany(
            {
                isActive: true,
                expiredAt: { $lt: new Date() },
            },
            {
                $set: {
                    isActive: false,
                },
            },
        );
    } catch (error) {
        console.log('AUTO EXPIRE VOUCHER ERROR:', error.message);
    }
};
class ControllerVoucher {
    async getAll(req, res) {
        try {
            await autoDisableExpiredVouchers();

            const now = new Date();

            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(now);
            endOfDay.setHours(23, 59, 59, 999);

            const vouchers = await ModelVoucher.find().sort({ createdAt: -1 }).lean();

            const vouchersWithStats = await Promise.all(
                vouchers.map(async (voucher) => {
                    const usedToday = await ModelPayment.countDocuments({
                        status: 'completed',
                        deliveredAt: {
                            $gte: startOfDay,
                            $lte: endOfDay,
                        },
                        'voucher.code': voucher.code,
                    });

                    const totalSavedResult = await ModelPayment.aggregate([
                        {
                            $match: {
                                status: 'completed',
                                'voucher.code': voucher.code,
                            },
                        },
                        {
                            $group: {
                                _id: null,
                                totalSaved: {
                                    $sum: '$voucher.discountAmount',
                                },
                            },
                        },
                    ]);

                    return {
                        ...voucher,
                        usedToday,
                        totalSaved: totalSavedResult[0]?.totalSaved || 0,
                    };
                }),
            );

            return res.status(200).json(vouchersWithStats);
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi lấy danh sách voucher',
                error: error.message,
            });
        }
    }

    async getPublic(req, res) {
        try {
            await autoDisableExpiredVouchers();

            const now = new Date();

            const vouchers = await ModelVoucher.find({
                isActive: true,
                expiredAt: { $gte: now },
                $or: [{ quantity: 0 }, { $expr: { $lt: ['$used', '$quantity'] } }],
            }).sort({ createdAt: -1 });

            return res.status(200).json(vouchers);
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi lấy voucher',
            });
        }
    }

    async create(req, res) {
        try {
            const data = req.body;

            if (!data.title || !data.code || !data.discountValue || !data.expiredAt) {
                return res.status(400).json({
                    message: 'Vui lòng nhập đầy đủ thông tin voucher',
                });
            }

            if (Number(data.discountValue) <= 0) {
                return res.status(400).json({
                    message: 'Giá trị giảm phải lớn hơn 0',
                });
            }

            if (Number(data.quantity) < 0) {
                return res.status(400).json({
                    message: 'Số lượng voucher không hợp lệ',
                });
            }

            const code = String(data.code).trim().toUpperCase();

            const existed = await ModelVoucher.findOne({ code });

            if (existed) {
                return res.status(400).json({
                    message: 'Mã voucher đã tồn tại',
                });
            }

            const voucher = await ModelVoucher.create({
                title: data.title,
                code,
                category: data.category || 'device',
                discountType: data.discountType || 'money',
                discountValue: Number(data.discountValue),
                minOrderValue: Number(data.minOrderValue || 0),
                maxDiscount: Number(data.maxDiscount || 0),
                quantity: Number(data.quantity || 0),
                used: Number(data.used || 0),
                expiredAt: data.expiredAt,
                description: data.description || '',
                isActive: data.isActive ?? true,
            });

            return res.status(201).json(voucher);
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi tạo voucher',
                error: error.message,
            });
        }
    }

    async update(req, res) {
        try {
            const data = { ...req.body };

            if (data.code) {
                data.code = String(data.code).trim().toUpperCase();

                const existed = await ModelVoucher.findOne({
                    code: data.code,
                    _id: { $ne: req.params.id },
                });

                if (existed) {
                    return res.status(400).json({
                        message: 'Mã voucher đã tồn tại',
                    });
                }
            }

            if (data.discountValue !== undefined && Number(data.discountValue) <= 0) {
                return res.status(400).json({
                    message: 'Giá trị giảm phải lớn hơn 0',
                });
            }

            if (data.quantity !== undefined && Number(data.quantity) < 0) {
                return res.status(400).json({
                    message: 'Số lượng voucher không hợp lệ',
                });
            }

            const voucher = await ModelVoucher.findByIdAndUpdate(req.params.id, data, {
                new: true,
                runValidators: true,
            });

            if (!voucher) {
                return res.status(404).json({
                    message: 'Không tìm thấy voucher',
                });
            }

            return res.status(200).json(voucher);
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi cập nhật voucher',
                error: error.message,
            });
        }
    }

    async delete(req, res) {
        try {
            const voucher = await ModelVoucher.findByIdAndDelete(req.params.id);

            if (!voucher) {
                return res.status(404).json({
                    message: 'Voucher không tồn tại',
                });
            }

            return res.status(200).json({
                message: 'Xóa voucher thành công',
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi xóa voucher',
                error: error.message,
            });
        }
    }
}

module.exports = new ControllerVoucher();
