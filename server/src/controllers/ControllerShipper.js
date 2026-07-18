const {
    applyDeliveryStatusChange,
} = require('./ControllerDeliveryStatus');
const { getStatusDisplay, ensureDeliveryStatus } = require('../utils/deliveryStatus');
const ModelPayment = require('../models/ModelPayment');

const ACTIVE_DELIVERY = [
    'ASSIGNED',
    'ACCEPTED',
    'DELIVERING',
    'FIRST_DELIVERY_FAILED',
    'REDELIVERING',
    'RETURNING',
];

const DONE_DELIVERY = ['DELIVERED', 'DELIVERED_AFTER_RETRY', 'RETURNED'];

class ControllerShipper {
    async getMyOrders(req, res) {
        try {
            const shipperId = req.user.id;

            const orders = await ModelPayment.find({
                shipperId,
                $or: [
                    { deliveryStatus: { $in: ACTIVE_DELIVERY } },
                    {
                        deliveryStatus: { $exists: false },
                        status: { $in: ['confirmed', 'picking', 'shipping', 'failed', 'returning'] },
                    },
                    {
                        deliveryStatus: null,
                        status: { $in: ['confirmed', 'picking', 'shipping', 'failed', 'returning'] },
                    },
                ],
            })
                .sort({ assignedAt: -1 })
                .populate('userId', 'fullname email phone');

            const data = [];
            for (const order of orders) {
                await ensureDeliveryStatus(order);
                data.push(order);
            }

            return res.status(200).json({
                message: 'Lấy đơn hàng shipper thành công',
                data,
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
                $or: [
                    { deliveryStatus: { $in: DONE_DELIVERY } },
                    {
                        deliveryStatus: { $exists: false },
                        status: { $in: ['completed', 'returned'] },
                    },
                    {
                        deliveryStatus: null,
                        status: { $in: ['completed', 'returned'] },
                    },
                ],
            })
                .sort({ deliveredAt: -1 })
                .populate('userId', 'fullname email phone');

            const data = [];
            for (const order of orders) {
                await ensureDeliveryStatus(order);
                data.push(order);
            }

            return res.status(200).json({
                message: 'Lấy lịch sử giao hàng thành công',
                data,
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
            });

            if (!order) {
                return res.status(404).json({
                    message: 'Không tìm thấy đơn hoặc đơn không thể bắt đầu giao',
                });
            }

            // Migrate legacy orders without deliveryStatus
            await ensureDeliveryStatus(order);
            if (!order.deliveryStatus) {
                return res.status(400).json({ message: 'Không thể bắt đầu giao đơn này' });
            }

            let nextStatus = 'DELIVERING';
            if (order.deliveryStatus === 'ASSIGNED') {
                nextStatus = 'DELIVERING';
            } else if (order.deliveryStatus === 'ACCEPTED') {
                nextStatus = 'DELIVERING';
            } else if (order.deliveryStatus === 'FIRST_DELIVERY_FAILED') {
                nextStatus = 'REDELIVERING';
            } else {
                return res.status(400).json({
                    message: `Không thể bắt đầu giao từ trạng thái ${order.deliveryStatus}`,
                });
            }

            await applyDeliveryStatusChange({
                order,
                nextStatus,
                payload: {},
                actor: { userId: shipperId, role: 'shipper' },
                req,
            });

            return res.status(200).json({
                message: 'Đã bắt đầu giao hàng',
                data: order,
                statusDisplay: getStatusDisplay(order),
            });
        } catch (error) {
            console.log(error);
            return res.status(error.statusCode || 500).json({
                message: error.message || 'Lỗi server',
            });
        }
    }

    async updateDeliveryStatus(req, res) {
        try {
            const { orderId } = req.params;
            let { status, deliveryNote } = req.body;

            // Map legacy statuses to new delivery statuses
            const legacyMap = {
                picking: 'ACCEPTED',
                shipping: 'DELIVERING',
                completed: 'DELIVERED',
                failed: 'FIRST_DELIVERY_FAILED',
                returning: 'RETURNING',
            };

            const normalized = String(status || '').trim();
            const nextStatus = legacyMap[normalized.toLowerCase()] || normalized.toUpperCase();

            const order = await ModelPayment.findOne({
                _id: orderId,
                shipperId: req.user.id,
            });

            if (!order) {
                return res.status(404).json({
                    message: 'Không tìm thấy đơn hàng',
                });
            }

            await ensureDeliveryStatus(order);

            // Infer correct success/fail based on attempt
            let resolved = nextStatus;
            if (nextStatus === 'DELIVERED' && order.deliveryStatus === 'REDELIVERING') {
                resolved = 'DELIVERED_AFTER_RETRY';
            }
            if (nextStatus === 'FIRST_DELIVERY_FAILED' && order.deliveryStatus === 'REDELIVERING') {
                resolved = 'RETURNING';
            }

            await applyDeliveryStatusChange({
                order,
                nextStatus: resolved,
                payload: {
                    failureNote: deliveryNote || '',
                    failureReason: req.body?.failureReason || '',
                    redeliveryScheduledAt: req.body?.redeliveryScheduledAt,
                    confirmReturn: req.body?.confirmReturn ?? true,
                    evidenceImage: req.body?.evidenceImage || '',
                },
                actor: { userId: req.user.id, role: 'shipper' },
                req,
            });

            return res.status(200).json({
                message: 'Cập nhật trạng thái giao hàng thành công',
                data: order,
                statusDisplay: getStatusDisplay(order),
            });
        } catch (error) {
            console.log(error);
            return res.status(error.statusCode || 500).json({
                message: error.message || 'Lỗi cập nhật trạng thái giao hàng',
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

            const [
                totalReceived,
                waitingPickup,
                shipping,
                completedToday,
                totalCompleted,
                totalFailed,
            ] = await Promise.all([
                ModelPayment.countDocuments({ shipperId }),
                ModelPayment.countDocuments({
                    shipperId,
                    $or: [
                        { deliveryStatus: 'ASSIGNED' },
                        { deliveryStatus: 'ACCEPTED' },
                        { deliveryStatus: 'FIRST_DELIVERY_FAILED' },
                        {
                            deliveryStatus: { $exists: false },
                            status: 'confirmed',
                        },
                    ],
                }),
                ModelPayment.countDocuments({
                    shipperId,
                    deliveryStatus: { $in: ['DELIVERING', 'REDELIVERING'] },
                }),
                ModelPayment.countDocuments({
                    shipperId,
                    deliveryStatus: { $in: ['DELIVERED', 'DELIVERED_AFTER_RETRY'] },
                    deliveredAt: { $gte: startToday, $lte: endToday },
                }),
                ModelPayment.countDocuments({
                    shipperId,
                    deliveryStatus: { $in: ['DELIVERED', 'DELIVERED_AFTER_RETRY'] },
                }),
                ModelPayment.countDocuments({
                    shipperId,
                    deliveryStatus: { $in: ['FIRST_DELIVERY_FAILED', 'RETURNING', 'RETURNED'] },
                }),
            ]);

            const successRate =
                totalCompleted + totalFailed === 0
                    ? 0
                    : Math.round((totalCompleted / (totalCompleted + totalFailed)) * 100);

            return res.status(200).json({
                totalReceived,
                waitingPickup,
                waiting: waitingPickup + shipping,
                shipping,
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

    async getOverview(req, res) {
        try {
            const shipperId = req.user.id;
            const now = new Date();
            const startToday = new Date(now);
            startToday.setHours(0, 0, 0, 0);
            const endToday = new Date(now);
            endToday.setHours(23, 59, 59, 999);

            const activeOrders = await ModelPayment.find({
                shipperId,
                $or: [
                    { deliveryStatus: { $in: ACTIVE_DELIVERY } },
                    {
                        deliveryStatus: { $exists: false },
                        status: { $in: ['confirmed', 'picking', 'shipping', 'failed', 'returning'] },
                    },
                ],
            })
                .sort({ assignedAt: -1 })
                .populate('userId', 'fullname email phone')
                .lean();

            const recentAll = await ModelPayment.find({ shipperId })
                .sort({ updatedAt: -1 })
                .limit(20)
                .populate('userId', 'fullname email phone')
                .lean();

            const [
                totalReceived,
                waitingPickup,
                shipping,
                completedToday,
                totalCompleted,
                totalFailed,
            ] = await Promise.all([
                ModelPayment.countDocuments({ shipperId }),
                ModelPayment.countDocuments({
                    shipperId,
                    deliveryStatus: { $in: ['ASSIGNED', 'ACCEPTED', 'FIRST_DELIVERY_FAILED'] },
                }),
                ModelPayment.countDocuments({
                    shipperId,
                    deliveryStatus: { $in: ['DELIVERING', 'REDELIVERING'] },
                }),
                ModelPayment.countDocuments({
                    shipperId,
                    deliveryStatus: { $in: ['DELIVERED', 'DELIVERED_AFTER_RETRY'] },
                    deliveredAt: { $gte: startToday, $lte: endToday },
                }),
                ModelPayment.countDocuments({
                    shipperId,
                    deliveryStatus: { $in: ['DELIVERED', 'DELIVERED_AFTER_RETRY'] },
                }),
                ModelPayment.countDocuments({
                    shipperId,
                    deliveryStatus: { $in: ['RETURNING', 'RETURNED'] },
                }),
            ]);

            const successRate =
                totalCompleted + totalFailed === 0
                    ? 0
                    : Math.round((totalCompleted / (totalCompleted + totalFailed)) * 100);

            const todaySchedule = activeOrders
                .filter((o) => {
                    const t = o.redeliveryScheduledAt || o.assignedAt || o.createdAt;
                    if (!t) return true;
                    const d = new Date(t);
                    return d >= startToday && d <= endToday;
                })
                .sort((a, b) => {
                    const ta = new Date(
                        a.redeliveryScheduledAt || a.assignedAt || a.createdAt || 0,
                    ).getTime();
                    const tb = new Date(
                        b.redeliveryScheduledAt || b.assignedAt || b.createdAt || 0,
                    ).getTime();
                    return ta - tb;
                })
                .slice(0, 8);

            const notifications = [];
            let unreadCount = 0;

            recentAll.forEach((order) => {
                const code = String(order._id).slice(-6).toUpperCase();
                const ds = order.deliveryStatus;
                if (ds === 'ASSIGNED') {
                    unreadCount += 1;
                    notifications.push({
                        id: `${order._id}-assigned`,
                        type: 'assigned',
                        title: 'Đơn hàng mới đã được giao cho bạn',
                        text: `Đơn ${code} chờ bạn nhận và bắt đầu giao.`,
                        at: order.assignedAt || order.updatedAt,
                    });
                } else if (ds === 'FIRST_DELIVERY_FAILED') {
                    notifications.push({
                        id: `${order._id}-fail1`,
                        type: 'failed',
                        title: 'Giao thất bại lần 1 — chờ giao lại',
                        text: `Đơn ${code}: ${order.firstFailureReason || 'Có lịch giao lại'}.`,
                        at: order.firstFailureTime || order.updatedAt,
                    });
                } else if (ds === 'DELIVERED' || ds === 'DELIVERED_AFTER_RETRY') {
                    notifications.push({
                        id: `${order._id}-done`,
                        type: 'success',
                        title: 'Giao hàng thành công',
                        text: `Đơn ${code} đã hoàn tất.`,
                        at: order.deliveredAt || order.updatedAt,
                    });
                } else if (ds === 'RETURNING') {
                    notifications.push({
                        id: `${order._id}-return`,
                        type: 'failed',
                        title: 'Đang hoàn hàng',
                        text: `Đơn ${code} chờ Admin/Staff xác nhận nhận lại hàng.`,
                        at: order.secondFailureTime || order.updatedAt,
                    });
                } else if (ds === 'DELIVERING' || ds === 'REDELIVERING') {
                    notifications.push({
                        id: `${order._id}-progress`,
                        type: 'progress',
                        title: 'Đang giao hàng',
                        text: `Đơn ${code} — ${ds === 'REDELIVERING' ? 'lần 2' : 'lần 1'}.`,
                        at: order.updatedAt,
                    });
                }
            });

            notifications.sort((a, b) => new Date(b.at) - new Date(a.at));

            return res.status(200).json({
                statistics: {
                    totalReceived,
                    waitingPickup,
                    waiting: waitingPickup + shipping,
                    shipping,
                    completedToday,
                    successRate,
                },
                assignedOrders: activeOrders,
                todaySchedule,
                notifications: notifications.slice(0, 12),
                unreadCount: Math.min(unreadCount, 9),
                updatedAt: new Date(),
            });
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                message: 'Lỗi lấy tổng quan shipper',
            });
        }
    }
}

module.exports = new ControllerShipper();
