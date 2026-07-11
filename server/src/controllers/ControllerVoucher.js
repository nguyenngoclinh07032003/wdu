const ModelVoucher = require('../models/ModelVoucher');
const ModelPayment = require('../models/ModelPayment');
const {
    isVoucherExpired,
    isVoucherOutOfStock,
    normalizeExpiredAt,
    maintainVoucherStatuses,
} = require('../utils/voucherHelpers');

class ControllerVoucher {
    async getAll(req, res) {
        try {
            await maintainVoucherStatuses();

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
            await maintainVoucherStatuses();

            const vouchers = await ModelVoucher.find({
                isActive: true,
                $or: [{ quantity: 0 }, { $expr: { $lt: ['$used', '$quantity'] } }],
            })
                .sort({ createdAt: -1 })
                .lean();

            const activeVouchers = vouchers.filter((voucher) => !isVoucherExpired(voucher.expiredAt));

            return res.status(200).json(activeVouchers);
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

            const quantity = Number(data.quantity || 0);
            const used = Number(data.used || 0);

            if (quantity !== 0 && used > quantity) {
                return res.status(400).json({
                    message: 'Lượt đã dùng không được lớn hơn số lượng voucher',
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
                quantity,
                used,
                expiredAt: normalizeExpiredAt(data.expiredAt),
                description: data.description || '',
                isActive: data.isActive ?? true,
            });

            if (isVoucherOutOfStock(voucher) || isVoucherExpired(voucher.expiredAt)) {
                voucher.isActive = false;
                await voucher.save();
            }

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
            const existingVoucher = await ModelVoucher.findById(req.params.id);

            if (!existingVoucher) {
                return res.status(404).json({
                    message: 'Không tìm thấy voucher',
                });
            }

            const allowedFields = [
                'title',
                'code',
                'category',
                'discountType',
                'discountValue',
                'minOrderValue',
                'maxDiscount',
                'quantity',
                'expiredAt',
                'description',
                'isActive',
            ];

            const data = {};

            allowedFields.forEach((field) => {
                if (req.body[field] !== undefined) {
                    data[field] = req.body[field];
                }
            });

            const nextQuantity =
                data.quantity !== undefined ? Number(data.quantity) : Number(existingVoucher.quantity || 0);
            const nextUsed = Number(existingVoucher.used || 0);
            const nextExpiredAt = data.expiredAt ? normalizeExpiredAt(data.expiredAt) : existingVoucher.expiredAt;

            if (data.isActive === true) {
                if (isVoucherExpired(nextExpiredAt)) {
                    return res.status(400).json({
                        message: 'Voucher đã hết hạn, không thể kích hoạt',
                    });
                }

                if (nextQuantity !== 0 && nextUsed >= nextQuantity) {
                    return res.status(400).json({
                        message: 'Voucher đã hết lượt sử dụng, vui lòng tăng số lượng trước khi bật lại',
                    });
                }
            }

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

            if (data.quantity !== undefined) {
                const newQuantity = Number(data.quantity);

                if (newQuantity < 0) {
                    return res.status(400).json({
                        message: 'Số lượng voucher không hợp lệ',
                    });
                }

                if (newQuantity !== 0 && newQuantity < nextUsed) {
                    return res.status(400).json({
                        message: `Số lượng không được nhỏ hơn lượt đã dùng (${nextUsed})`,
                    });
                }
            }

            if (data.expiredAt) {
                data.expiredAt = normalizeExpiredAt(data.expiredAt);
            }

            const voucher = await ModelVoucher.findByIdAndUpdate(req.params.id, data, {
                new: true,
                runValidators: true,
            });

            if (voucher && (isVoucherOutOfStock(voucher) || isVoucherExpired(voucher.expiredAt))) {
                voucher.isActive = false;
                await voucher.save();
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
