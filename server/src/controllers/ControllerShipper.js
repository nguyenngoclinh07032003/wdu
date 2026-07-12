const ModelPayment = require('../models/ModelPayment');
const { applyOrderStatusSideEffects } = require('../utils/orderStatusEffects');

class ControllerShipper {
    async getMyOrders(req, res) {
        try {
            const shipperId = req.user.id;

            const orders = await ModelPayment.find({
                shipperId,
                status: { $in: ['confirmed', 'shipping', 'failed', 'returning'] },
            })
                .sort({ assignedAt: -1 })
                .populate('userId', 'fullname email phone');

            return res.status(200).json({
                message: 'Lấy đơn hàng shipper thành công',
                data: orders,
            });
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                message: 'Lỗi server',
            });
        }
    }

    async getHistory(req, res) {
        try {
            const shipperId = req.user.id;

            const orders = await ModelPayment.find({
                shipperId,
                status: { $in: ['completed', 'returned'] },
            })
                .sort({ deliveredAt: -1 })
                .populate('userId', 'fullname email phone');

            return res.status(200).json({
                message: 'Lấy lịch sử giao hàng thành công',
                data: orders,
            });
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                message: 'Lỗi server',
            });
        }
    }

    async startDelivery(req, res) {
        try {
            const shipperId = req.user.id;
            const { orderId } = req.params;

            const order = await ModelPayment.findOne({
                _id: orderId,
                shipperId,
                status: 'confirmed',
            });

            if (!order) {
                return res.status(404).json({
                    message: 'Không tìm thấy đơn hoặc đơn không thể bắt đầu giao',
                });
            }

            const previousStatus = order.status;
            await applyOrderStatusSideEffects(order, previousStatus, 'shipping');

            return res.status(200).json({
                message: 'Đã bắt đầu giao hàng',
                data: order,
            });
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                message: 'Lỗi server',
            });
        }
    }

    async updateDeliveryStatus(req, res) {
        try {
            const { orderId } = req.params;
            const { status, deliveryNote } = req.body;

            const allowStatus = ['completed', 'failed', 'returning'];

            if (!allowStatus.includes(status)) {
                return res.status(400).json({
                    message: 'Shipper không được cập nhật trạng thái này',
                });
            }

            const order = await ModelPayment.findOne({
                _id: orderId,
                shipperId: req.user.id,
            });

            if (!order) {
                return res.status(404).json({
                    message: 'Không tìm thấy đơn hàng',
                });
            }

            const validFlow = {
                shipping: ['completed', 'failed'],
                failed: ['returning'],
            };

            if (!validFlow[order.status]?.includes(status)) {
                return res.status(400).json({
                    message: `Không thể chuyển từ ${order.status} sang ${status}`,
                });
            }

            const previousStatus = order.status;
            order.deliveryNote = deliveryNote || '';
            await applyOrderStatusSideEffects(order, previousStatus, status);

            return res.status(200).json({
                message: 'Cập nhật trạng thái giao hàng thành công',
                data: order,
            });
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                message: 'Lỗi cập nhật trạng thái giao hàng',
            });
        }
    }

    async getStats(req, res) {
        try {
            const shipperId = req.user.id;

            const now = new Date();

            const startToday = new Date(now);
            startToday.setHours(0, 0, 0, 0);

            const endToday = new Date(now);
            endToday.setHours(23, 59, 59, 999);

            const totalReceived = await ModelPayment.countDocuments({
                shipperId,
            });

            const waiting = await ModelPayment.countDocuments({
                shipperId,
                status: { $in: ['confirmed', 'shipping'] },
            });

            const completedToday = await ModelPayment.countDocuments({
                shipperId,
                status: 'completed',
                deliveredAt: {
                    $gte: startToday,
                    $lte: endToday,
                },
            });

            const totalCompleted = await ModelPayment.countDocuments({
                shipperId,
                status: 'completed',
            });

            const totalFailed = await ModelPayment.countDocuments({
                shipperId,
                status: 'failed',
            });

            const successRate =
                totalCompleted + totalFailed === 0
                    ? 0
                    : Math.round((totalCompleted / (totalCompleted + totalFailed)) * 100);

            return res.status(200).json({
                totalReceived,
                waiting,
                completedToday,
                successRate,
            });
        } catch (error) {
            console.log(error);

            return res.status(500).json({
                message: 'Lỗi lấy thống kê shipper',
            });
        }
    }
}

module.exports = new ControllerShipper();
