const ModelPayment = require('../models/ModelPayment');
const ModelDeliveryHistory = require('../models/ModelDeliveryHistory');
const { applyOrderStatusSideEffects } = require('../utils/orderStatusEffects');
const {
    DELIVERY_STATUS,
    FAILURE_REASONS,
    validateTransition,
    validateFailurePayload,
    applyDeliveryFields,
    toPublicDeliveryView,
    getStatusDisplay,
    resolveRole,
    syncLegacyStatus,
    ensureDeliveryStatus,
} = require('../utils/deliveryStatus');
const { isOrderOwnedByUser, buildOwnedOrderFilter } = require('../utils/orderOwnership');

function emitDeliveryUpdate(req, order, roleForPublic = 'user') {
    try {
        const io = req.app?.get?.('io');
        if (!io) return;

        const orderId = String(order._id);
        const userId = order.userId ? String(order.userId) : null;
        const shipperId = order.shipperId ? String(order.shipperId) : null;

        const payload = {
            orderId,
            deliveryStatus: order.deliveryStatus,
            status: order.status,
            statusDisplay: getStatusDisplay(order),
            deliveryAttempt: order.deliveryAttempt || 0,
            updatedAt: order.updatedAt || new Date(),
            publicView: toPublicDeliveryView(order, 'user'),
            staffView: toPublicDeliveryView(order, 'staff'),
        };

        io.to(`order:${orderId}`).emit('order:delivery-updated', payload);
        io.to('role:admin').emit('order:delivery-updated', payload);
        io.to('role:staff').emit('order:delivery-updated', payload);
        if (userId) io.to(`user:${userId}`).emit('order:delivery-updated', payload);
        if (shipperId) io.to(`shipper:${shipperId}`).emit('order:delivery-updated', payload);
    } catch (error) {
        console.error('emitDeliveryUpdate error:', error.message);
    }
}

async function appendHistory({
    order,
    previousStatus,
    newStatus,
    attemptNumber,
    failureReason,
    note,
    evidenceImage,
    actor,
}) {
    await ModelDeliveryHistory.create({
        orderId: order._id,
        shipperId: order.shipperId || null,
        attemptNumber: attemptNumber ?? order.deliveryAttempt ?? 0,
        previousStatus: previousStatus || '',
        newStatus,
        failureReason: failureReason || '',
        note: note || '',
        evidenceImage: evidenceImage || '',
        createdBy: actor?.userId || null,
        createdByRole: actor?.role || '',
    });
}

async function applyDeliveryStatusChange({
    order,
    nextStatus,
    payload = {},
    actor = {},
    req = null,
}) {
    const role = actor.role || 'shipper';
    await ensureDeliveryStatus(order, { save: false });
    const previousStatus = order.deliveryStatus || null;
    const previousLegacy = order.status;

    const transition = validateTransition(previousStatus, nextStatus, role, order);
    if (!transition.ok) {
        const err = new Error(transition.message);
        err.statusCode = 400;
        throw err;
    }

    const failCheck = validateFailurePayload(nextStatus, payload);
    if (!failCheck.ok) {
        const err = new Error(failCheck.message);
        err.statusCode = 400;
        throw err;
    }

    applyDeliveryFields(order, nextStatus, payload, actor);

    // Side effects for completed / COD / sold — use legacy status sync
    const nextLegacy = order.status;
    if (previousLegacy !== nextLegacy) {
        // applyOrderStatusSideEffects sets status again and saves
        await applyOrderStatusSideEffects(order, previousLegacy, nextLegacy);
    } else {
        await order.save();
    }

    await appendHistory({
        order,
        previousStatus,
        newStatus: nextStatus,
        attemptNumber: order.deliveryAttempt,
        failureReason: payload.failureReason || '',
        note: payload.failureNote || payload.note || '',
        evidenceImage: payload.evidenceImage || '',
        actor,
    });

    if (req) {
        emitDeliveryUpdate(req, order, role);
    }

    return order;
}

class ControllerDeliveryStatus {
    async updateDeliveryStatus(req, res) {
        try {
            const { orderId } = req.params;
            const user = req.user;
            const role = resolveRole(user);

            const nextStatus = String(req.body?.status || '')
                .trim()
                .toUpperCase();

            if (!nextStatus || !Object.values(DELIVERY_STATUS).includes(nextStatus)) {
                return res.status(400).json({
                    message: 'Trạng thái giao hàng không hợp lệ',
                });
            }

            const order = await ModelPayment.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
            }

            if (role === 'shipper') {
                if (String(order.shipperId) !== String(user.id)) {
                    return res.status(403).json({ message: 'Bạn không được cập nhật đơn này' });
                }
            } else if (!['admin', 'staff'].includes(role)) {
                return res.status(403).json({ message: 'Không có quyền cập nhật trạng thái giao hàng' });
            }

            // Shipper cannot set RETURNED
            if (role === 'shipper' && nextStatus === 'RETURNED') {
                return res.status(403).json({
                    message: 'Shipper không được tự xác nhận hoàn hàng',
                });
            }

            // Admin/Staff should use confirm-return for RETURNED; allow only confirm path here for shipper-driven statuses
            if (['admin', 'staff'].includes(role) && !['RETURNING', 'RETURNED'].includes(nextStatus)) {
                // Allow staff/admin only for return confirmation typically; block overriding shipper results
                if (order.deliveryStatus && !['RETURNING'].includes(order.deliveryStatus)) {
                    return res.status(403).json({
                        message:
                            'Admin/Staff không được sửa kết quả giao của shipper. Chỉ xác nhận hoàn hàng.',
                    });
                }
            }

            const evidenceImage = req.file
                ? `/uploads/delivery-evidence/${req.file.filename}`
                : '';

            const payload = {
                failureReason: req.body?.failureReason || '',
                failureNote: req.body?.failureNote || req.body?.note || '',
                redeliveryScheduledAt: req.body?.redeliveryScheduledAt || null,
                confirmReturn: req.body?.confirmReturn,
                evidenceImage,
                attemptNumber: Number(req.body?.attemptNumber) || undefined,
            };

            if (
                payload.failureReason &&
                !FAILURE_REASONS.includes(payload.failureReason) &&
                payload.failureReason !== 'Lý do khác'
            ) {
                // allow custom but treat as other if not in list
            }

            await applyDeliveryStatusChange({
                order,
                nextStatus,
                payload,
                actor: { userId: user.id, role },
                req,
            });

            return res.status(200).json({
                orderId: order._id,
                status: order.deliveryStatus,
                statusDisplay: getStatusDisplay(order),
                updatedAt: order.updatedAt,
                deliveryAttempt: order.deliveryAttempt || 0,
                legacyStatus: order.status,
                data: toPublicDeliveryView(order, role),
            });
        } catch (error) {
            console.error('updateDeliveryStatus error:', error);
            return res.status(error.statusCode || 500).json({
                message: error.message || 'Lỗi cập nhật trạng thái giao hàng',
            });
        }
    }

    async confirmReturn(req, res) {
        try {
            const { orderId } = req.params;
            const user = req.user;
            const role = resolveRole(user);

            if (!['admin', 'staff'].includes(role)) {
                return res.status(403).json({
                    message: 'Chỉ Admin hoặc Staff được xác nhận đã nhận lại hàng',
                });
            }

            const order = await ModelPayment.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
            }

            if (order.deliveryStatus !== 'RETURNING') {
                return res.status(400).json({
                    message: 'Đơn chưa ở trạng thái đang hoàn hàng',
                });
            }

            await applyDeliveryStatusChange({
                order,
                nextStatus: 'RETURNED',
                payload: { note: req.body?.note || 'Hệ thống đã nhận lại hàng' },
                actor: { userId: user.id, role },
                req,
            });

            // Hoàn tồn kho khi đã nhận hàng trả về
            try {
                const { releaseStockForOrder } = require('../utils/inventory');
                if (order.stockReserved && !order.stockReleased) {
                    await releaseStockForOrder(order);
                    await order.save();
                }
            } catch (stockErr) {
                console.error('release stock on return error:', stockErr.message);
            }

            return res.status(200).json({
                message: 'Đã xác nhận nhận lại hàng',
                orderId: order._id,
                status: order.deliveryStatus,
                statusDisplay: getStatusDisplay(order),
                updatedAt: order.updatedAt,
                deliveryAttempt: order.deliveryAttempt || 0,
                data: toPublicDeliveryView(order, role),
            });
        } catch (error) {
            console.error('confirmReturn error:', error);
            return res.status(error.statusCode || 500).json({
                message: error.message || 'Lỗi xác nhận hoàn hàng',
            });
        }
    }

    async getDelivery(req, res) {
        try {
            const { orderId } = req.params;
            const user = req.user;
            const role = resolveRole(user);

            const order = await ModelPayment.findById(orderId)
                .populate('shipperId', 'fullname email phone')
                .populate('userId', 'fullname email phone');

            if (!order) {
                return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
            }

            await ensureDeliveryStatus(order);

            const canStaff = ['admin', 'staff'].includes(role);
            if (role === 'shipper' && String(order.shipperId?._id || order.shipperId) !== String(user.id)) {
                return res.status(403).json({ message: 'Không có quyền xem đơn này' });
            }
            if (!canStaff && role !== 'shipper' && !isOrderOwnedByUser(order, user)) {
                return res.status(403).json({ message: 'Không có quyền xem đơn này' });
            }

            return res.status(200).json({
                data: toPublicDeliveryView(order, role === 'doctor' ? 'user' : role),
            });
        } catch (error) {
            console.error('getDelivery error:', error);
            return res.status(500).json({ message: 'Lỗi lấy thông tin giao hàng' });
        }
    }

    async getDeliveryHistory(req, res) {
        try {
            const { orderId } = req.params;
            const user = req.user;
            const role = resolveRole(user);

            const order = await ModelPayment.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
            }

            await ensureDeliveryStatus(order);

            const canStaff = ['admin', 'staff'].includes(role);
            if (role === 'shipper' && String(order.shipperId) !== String(user.id)) {
                return res.status(403).json({ message: 'Không có quyền xem lịch sử đơn này' });
            }
            if (!canStaff && role !== 'shipper' && !isOrderOwnedByUser(order, user)) {
                return res.status(403).json({ message: 'Không có quyền xem lịch sử đơn này' });
            }

            const history = await ModelDeliveryHistory.find({ orderId })
                .sort({ createdAt: 1 })
                .populate('createdBy', 'fullname email role')
                .populate('shipperId', 'fullname email')
                .lean();

            const mapped = history.map((item) => {
                const base = {
                    id: item._id,
                    orderId: item.orderId,
                    attemptNumber: item.attemptNumber,
                    previousStatus: item.previousStatus,
                    newStatus: item.newStatus,
                    statusDisplay: getStatusDisplay(item.newStatus),
                    failureReason: item.failureReason || '',
                    createdAt: item.createdAt,
                    createdByRole: item.createdByRole,
                };

                if (role === 'user') {
                    return base;
                }

                return {
                    ...base,
                    note: item.note || '',
                    evidenceImage: item.evidenceImage || '',
                    shipperId: item.shipperId,
                    createdBy: item.createdBy,
                };
            });

            return res.status(200).json({ data: mapped });
        } catch (error) {
            console.error('getDeliveryHistory error:', error);
            return res.status(500).json({ message: 'Lỗi lấy lịch sử giao hàng' });
        }
    }

    getFailureReasons(req, res) {
        return res.status(200).json({ data: FAILURE_REASONS });
    }

    async serveEvidenceFile(req, res) {
        try {
            const fs = require('fs');
            const path = require('path');
            let rel = String(req.query.path || '').trim();
            if (!rel) {
                return res.status(400).json({ message: 'Thiếu đường dẫn' });
            }

            rel = rel.replace(/\\/g, '/');
            if (rel.startsWith('http://') || rel.startsWith('https://')) {
                try {
                    rel = new URL(rel).pathname;
                } catch (e) {
                    return res.status(400).json({ message: 'Đường dẫn không hợp lệ' });
                }
            }
            if (rel.startsWith('/uploads/')) rel = rel.slice('/uploads/'.length);
            if (rel.startsWith('uploads/')) rel = rel.slice('uploads/'.length);
            if (!rel.startsWith('delivery-evidence/') || rel.includes('..')) {
                return res.status(403).json({ message: 'Chỉ phục vụ ảnh bằng chứng giao hàng' });
            }

            const user = req.user;
            if (!user) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const isStaffOrAdmin = user.role === 'staff' || !!user.isAdmin;
            const escaped = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const evidenceMatch = {
                $or: [
                    { firstFailureEvidence: new RegExp(escaped) },
                    { secondFailureEvidence: new RegExp(escaped) },
                ],
            };

            if (!isStaffOrAdmin) {
                if (user.role === 'shipper') {
                    const owned = await ModelPayment.findOne({
                        shipperId: user.id,
                        ...evidenceMatch,
                    }).select('_id');
                    if (!owned) {
                        return res.status(403).json({ message: 'Không có quyền xem bằng chứng này' });
                    }
                } else {
                    const owned = await ModelPayment.findOne({
                        $and: [buildOwnedOrderFilter(user), evidenceMatch],
                    }).select('_id');
                    if (!owned) {
                        return res.status(403).json({ message: 'Không có quyền xem bằng chứng này' });
                    }
                }
            }

            const abs = path.join(__dirname, '../uploads', rel);
            if (!fs.existsSync(abs)) {
                return res.status(404).json({ message: 'Không tìm thấy file' });
            }

            return res.sendFile(abs);
        } catch (error) {
            console.error('serveEvidenceFile error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }
}

module.exports = new ControllerDeliveryStatus();
module.exports.applyDeliveryStatusChange = applyDeliveryStatusChange;
module.exports.appendHistory = appendHistory;
module.exports.emitDeliveryUpdate = emitDeliveryUpdate;
