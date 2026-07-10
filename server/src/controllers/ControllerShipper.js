const ModelPayment = require('../models/ModelPayment');

const USER_POPULATE_FIELDS = 'fullname email phone';
const ACTIVE_ORDER_STATUSES = ['confirmed', 'shipping', 'failed', 'returning'];
const HISTORY_ORDER_STATUSES = ['completed', 'returned'];
const WAITING_ORDER_STATUSES = ['confirmed', 'shipping'];
const SHIPPER_EDITABLE_STATUSES = ['completed', 'failed', 'returning'];
const STATUS_FLOW = {
    shipping: ['completed', 'failed'],
    failed: ['returning'],
};
const STATUS_TIMESTAMP_FIELD = {
    completed: 'deliveredAt',
    failed: 'failedAt',
    returning: 'returningAt',
};

const buildDayRange = () => {
    const start = new Date();
    const end = new Date();

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
};

const findOrdersByStatus = (shipperId, statuses, sortField) => {
    return ModelPayment.find({
        shipperId,
        status: { $in: statuses },
    })
        .sort({ [sortField]: -1 })
        .populate('userId', USER_POPULATE_FIELDS);
};

const sendServerError = (res, error, message = 'Lỗi server') => {
    console.log(error);

    return res.status(500).json({ message });
};

class ControllerShipper {
    async getMyOrders(req, res) {
        try {
            const orders = await findOrdersByStatus(req.user.id, ACTIVE_ORDER_STATUSES, 'assignedAt');

            return res.status(200).json({
                message: 'Lấy đơn hàng shipper thành công',
                data: orders,
            });
        } catch (error) {
            return sendServerError(res, error);
        }
    }

    async getHistory(req, res) {
        try {
            const orders = await findOrdersByStatus(req.user.id, HISTORY_ORDER_STATUSES, 'deliveredAt');

            return res.status(200).json({
                message: 'Lấy lịch sử giao hàng thành công',
                data: orders,
            });
        } catch (error) {
            return sendServerError(res, error);
        }
    }

    async startDelivery(req, res) {
        try {
            const { orderId } = req.params;
            const order = await ModelPayment.findOne({
                _id: orderId,
                shipperId: req.user.id,
                status: 'confirmed',
            });

            if (!order) {
                return res.status(404).json({
                    message: 'Không tìm thấy đơn hoặc đơn không thể bắt đầu giao',
                });
            }

            order.status = 'shipping';
            await order.save();

            return res.status(200).json({
                message: 'Đã bắt đầu giao hàng',
                data: order,
            });
        } catch (error) {
            return sendServerError(res, error);
        }
    }

    async updateDeliveryStatus(req, res) {
        try {
            const { orderId } = req.params;
            const { status, deliveryNote } = req.body;

            if (!SHIPPER_EDITABLE_STATUSES.includes(status)) {
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

            if (!STATUS_FLOW[order.status]?.includes(status)) {
                return res.status(400).json({
                    message: `Không thể chuyển từ ${order.status} sang ${status}`,
                });
            }

            order.status = status;
            order.deliveryNote = deliveryNote || '';

            const timestampField = STATUS_TIMESTAMP_FIELD[status];
            if (timestampField) {
                order[timestampField] = new Date();
            }

            await order.save();

            return res.status(200).json({
                message: 'Cập nhật trạng thái giao hàng thành công',
                data: order,
            });
        } catch (error) {
            return sendServerError(res, error, 'Lỗi cập nhật trạng thái giao hàng');
        }
    }

    async getStats(req, res) {
        try {
            const shipperId = req.user.id;
            const { start, end } = buildDayRange();

            const [totalReceived, waiting, completedToday, totalCompleted, totalFailed] = await Promise.all([
                ModelPayment.countDocuments({ shipperId }),
                ModelPayment.countDocuments({
                    shipperId,
                    status: { $in: WAITING_ORDER_STATUSES },
                }),
                ModelPayment.countDocuments({
                    shipperId,
                    status: 'completed',
                    deliveredAt: {
                        $gte: start,
                        $lte: end,
                    },
                }),
                ModelPayment.countDocuments({
                    shipperId,
                    status: 'completed',
                }),
                ModelPayment.countDocuments({
                    shipperId,
                    status: 'failed',
                }),
            ]);

            const finishedOrders = totalCompleted + totalFailed;
            const successRate = finishedOrders === 0 ? 0 : Math.round((totalCompleted / finishedOrders) * 100);

            return res.status(200).json({
                totalReceived,
                waiting,
                completedToday,
                successRate,
            });
        } catch (error) {
            return sendServerError(res, error, 'Lỗi lấy thống kê shipper');
        }
    }
}

module.exports = new ControllerShipper();
