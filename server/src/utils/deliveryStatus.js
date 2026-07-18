const FAILURE_REASONS = [
    'Không liên hệ được khách hàng',
    'Khách hàng không có mặt',
    'Khách hàng hẹn giao lại',
    'Khách hàng từ chối nhận hàng',
    'Sai địa chỉ giao hàng',
    'Không tìm thấy địa chỉ',
    'Khách hàng không đủ tiền thanh toán',
    'Hàng hóa bị hư hỏng',
    'Thời tiết hoặc giao thông không thuận lợi',
    'Lý do khác',
];

const DELIVERY_STATUS = {
    ASSIGNED: 'ASSIGNED',
    ACCEPTED: 'ACCEPTED',
    DELIVERING: 'DELIVERING',
    DELIVERED: 'DELIVERED',
    FIRST_DELIVERY_FAILED: 'FIRST_DELIVERY_FAILED',
    REDELIVERING: 'REDELIVERING',
    DELIVERED_AFTER_RETRY: 'DELIVERED_AFTER_RETRY',
    RETURNING: 'RETURNING',
    RETURNED: 'RETURNED',
};

const STATUS_DISPLAY = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    ASSIGNED: 'Đã giao cho shipper',
    ACCEPTED: 'Shipper đã nhận đơn',
    DELIVERING: 'Đang giao hàng',
    FIRST_DELIVERY_FAILED: 'Giao hàng thất bại lần 1',
    WAITING_REDELIVERY: 'Chờ giao lại',
    REDELIVERING: 'Đang giao lại',
    DELIVERED: 'Giao hàng thành công',
    DELIVERED_AFTER_RETRY: 'Giao hàng thành công sau khi giao lại',
    RETURNING: 'Đang hoàn hàng',
    RETURNED: 'Đã hoàn hàng',
    cancelled: 'Đã hủy',
};

const LEGACY_STATUS_MAP = {
    ASSIGNED: 'confirmed',
    ACCEPTED: 'confirmed',
    DELIVERING: 'shipping',
    DELIVERED: 'completed',
    FIRST_DELIVERY_FAILED: 'failed',
    REDELIVERING: 'shipping',
    DELIVERED_AFTER_RETRY: 'completed',
    RETURNING: 'returning',
    RETURNED: 'returned',
};

/** Allowed next statuses from current deliveryStatus (shipper-driven unless noted) */
const TRANSITIONS = {
    ASSIGNED: ['ACCEPTED', 'DELIVERING'],
    ACCEPTED: ['DELIVERING'],
    DELIVERING: ['DELIVERED', 'FIRST_DELIVERY_FAILED'],
    FIRST_DELIVERY_FAILED: ['REDELIVERING'],
    REDELIVERING: ['DELIVERED_AFTER_RETRY', 'RETURNING'],
    RETURNING: ['RETURNED'], // admin/staff only
    DELIVERED: [],
    DELIVERED_AFTER_RETRY: [],
    RETURNED: [],
};

function getStatusDisplay(orderOrStatus) {
    if (!orderOrStatus) return STATUS_DISPLAY.pending;

    if (typeof orderOrStatus === 'string') {
        return STATUS_DISPLAY[orderOrStatus] || orderOrStatus;
    }

    const deliveryStatus = orderOrStatus.deliveryStatus;
    if (deliveryStatus) {
        return STATUS_DISPLAY[deliveryStatus] || deliveryStatus;
    }

    const legacy = String(orderOrStatus.status || 'pending').toLowerCase();
    if (legacy === 'picking') return STATUS_DISPLAY.ACCEPTED;
    if (legacy === 'shipping') return STATUS_DISPLAY.DELIVERING;
    if (legacy === 'completed') return STATUS_DISPLAY.DELIVERED;
    if (legacy === 'failed') return STATUS_DISPLAY.FIRST_DELIVERY_FAILED;
    return STATUS_DISPLAY[legacy] || STATUS_DISPLAY.pending;
}

function syncLegacyStatus(order) {
    const mapped = LEGACY_STATUS_MAP[order.deliveryStatus];
    if (mapped) {
        order.status = mapped;
    }
    return order;
}

function validateTransition(currentStatus, nextStatus, role = 'shipper', order = null) {
    const current = currentStatus || null;
    if (!current) {
        return { ok: false, message: 'Đơn chưa được gán cho shipper' };
    }

    const allowed = TRANSITIONS[current] || [];
    if (!allowed.includes(nextStatus)) {
        return {
            ok: false,
            message: `Không thể chuyển từ ${current} sang ${nextStatus}`,
        };
    }

    if (nextStatus === 'RETURNED' && !['admin', 'staff'].includes(role)) {
        return {
            ok: false,
            message: 'Chỉ Admin hoặc Staff được xác nhận đã nhận lại hàng',
        };
    }

    if (role === 'shipper' && nextStatus === 'RETURNED') {
        return {
            ok: false,
            message: 'Shipper không được tự xác nhận hoàn hàng',
        };
    }

    if (nextStatus === 'REDELIVERING' && order?.redeliveryScheduledAt) {
        const scheduled = new Date(order.redeliveryScheduledAt);
        if (!Number.isNaN(scheduled.getTime()) && Date.now() < scheduled.getTime()) {
            return {
                ok: false,
                message: `Chưa đến giờ giao lại (dự kiến ${scheduled.toLocaleString('vi-VN')})`,
            };
        }
    }

    return { ok: true };
}

function validateFailurePayload(nextStatus, payload = {}) {
    const {
        failureReason = '',
        failureNote = '',
        redeliveryScheduledAt,
        confirmReturn,
    } = payload;

    if (nextStatus === 'FIRST_DELIVERY_FAILED') {
        if (!failureReason) {
            return { ok: false, message: 'Bắt buộc chọn lý do giao thất bại' };
        }
        if (failureReason === 'Lý do khác' && !String(failureNote || '').trim()) {
            return { ok: false, message: 'Lý do khác bắt buộc nhập ghi chú' };
        }
        if (!redeliveryScheduledAt) {
            return { ok: false, message: 'Bắt buộc chọn thời gian giao lại dự kiến' };
        }
        const scheduled = new Date(redeliveryScheduledAt);
        if (Number.isNaN(scheduled.getTime())) {
            return { ok: false, message: 'Thời gian giao lại không hợp lệ' };
        }
    }

    if (nextStatus === 'RETURNING') {
        if (!failureReason) {
            return { ok: false, message: 'Bắt buộc chọn lý do thất bại lần 2' };
        }
        if (failureReason === 'Lý do khác' && !String(failureNote || '').trim()) {
            return { ok: false, message: 'Lý do khác bắt buộc nhập ghi chú' };
        }
        if (!String(failureNote || '').trim()) {
            return { ok: false, message: 'Bắt buộc nhập ghi chú chi tiết khi thất bại lần 2' };
        }
        if (confirmReturn === false || confirmReturn === 'false') {
            return { ok: false, message: 'Phải xác nhận sẽ hoàn hàng về hệ thống' };
        }
    }

    return { ok: true };
}

function applyDeliveryFields(order, nextStatus, payload = {}, actor = {}) {
    const now = new Date();
    const previousStatus = order.deliveryStatus || null;

    order.deliveryStatus = nextStatus;
    order.updatedAt = now;

    if (nextStatus === 'ACCEPTED' || (nextStatus === 'DELIVERING' && previousStatus === 'ASSIGNED')) {
        if (!order.deliveryAttempt || order.deliveryAttempt < 1) {
            order.deliveryAttempt = 1;
        }
    }

    if (nextStatus === 'DELIVERING' && previousStatus === 'ASSIGNED') {
        order.deliveryAttempt = 1;
    }

    if (nextStatus === 'REDELIVERING') {
        order.deliveryAttempt = 2;
    }

    if (nextStatus === 'DELIVERED') {
        order.deliveredAt = now;
        order.deliveredBy = actor.userId || order.shipperId;
        order.deliverySuccessAttempt = 1;
        order.deliveryAttempt = Math.max(order.deliveryAttempt || 1, 1);
    }

    if (nextStatus === 'DELIVERED_AFTER_RETRY') {
        order.deliveredAt = now;
        order.deliveredBy = actor.userId || order.shipperId;
        order.deliverySuccessAttempt = 2;
        order.deliveryAttempt = 2;
    }

    if (nextStatus === 'FIRST_DELIVERY_FAILED') {
        order.firstFailureReason = payload.failureReason || '';
        order.firstFailureNote = payload.failureNote || '';
        order.firstFailureTime = now;
        order.firstFailureEvidence = payload.evidenceImage || order.firstFailureEvidence || '';
        order.redeliveryScheduledAt = payload.redeliveryScheduledAt
            ? new Date(payload.redeliveryScheduledAt)
            : null;
        order.deliveryAttempt = 1;
        order.failedAt = now;
    }

    if (nextStatus === 'RETURNING') {
        order.secondFailureReason = payload.failureReason || '';
        order.secondFailureNote = payload.failureNote || '';
        order.secondFailureTime = now;
        order.secondFailureEvidence = payload.evidenceImage || order.secondFailureEvidence || '';
        order.deliveryAttempt = 2;
        order.returningAt = now;
    }

    if (nextStatus === 'RETURNED') {
        order.returnedAt = now;
        order.returnConfirmedBy = actor.userId || null;
    }

    syncLegacyStatus(order);
    return order;
}

function toPublicDeliveryView(order, role = 'user') {
    const isStaffLike = ['admin', 'staff', 'shipper'].includes(role);
    const deliveryStatus = order.deliveryStatus || null;
    const statusDisplay = getStatusDisplay(order);

    const base = {
        orderId: order._id,
        deliveryStatus,
        statusDisplay,
        deliveryAttempt: order.deliveryAttempt || 0,
        updatedAt: order.updatedAt,
        assignedAt: order.assignedAt,
        deliveredAt: order.deliveredAt,
        returnedAt: order.returnedAt,
        redeliveryScheduledAt: order.redeliveryScheduledAt,
        shipperName: order.shipperName || '',
    };

    if (deliveryStatus === 'FIRST_DELIVERY_FAILED' || order.firstFailureReason) {
        base.failureReason = order.firstFailureReason || '';
        base.failureTime = order.firstFailureTime || null;
    }

    if (deliveryStatus === 'RETURNING' || deliveryStatus === 'RETURNED' || order.secondFailureReason) {
        if (deliveryStatus === 'RETURNING' || deliveryStatus === 'RETURNED') {
            base.failureReason = order.secondFailureReason || order.firstFailureReason || '';
            base.failureTime = order.secondFailureTime || order.firstFailureTime || null;
        }
    }

    if (!isStaffLike) {
        // User-safe: no internal notes, no evidence URLs required, no shipper internal fields
        return base;
    }

    return {
        ...base,
        shipperId: order.shipperId,
        firstFailureReason: order.firstFailureReason || '',
        firstFailureNote: order.firstFailureNote || '',
        firstFailureTime: order.firstFailureTime || null,
        firstFailureEvidence: order.firstFailureEvidence || '',
        secondFailureReason: order.secondFailureReason || '',
        secondFailureNote: order.secondFailureNote || '',
        secondFailureTime: order.secondFailureTime || null,
        secondFailureEvidence: order.secondFailureEvidence || '',
        deliveredBy: order.deliveredBy || null,
        deliverySuccessAttempt: order.deliverySuccessAttempt || null,
        returnConfirmedBy: order.returnConfirmedBy || null,
    };
}

function resolveRole(user) {
    if (!user) return 'user';
    if (user.isAdmin || user.role === 'admin') return 'admin';
    if (user.role === 'staff') return 'staff';
    if (user.role === 'shipper') return 'shipper';
    if (user.role === 'doctor') return 'doctor';
    return 'user';
}

/** Infer deliveryStatus from legacy `status` + shipper assignment (for pre-redesign orders). */
function inferDeliveryStatusFromLegacy(order) {
    if (!order) return null;
    if (order.deliveryStatus) return order.deliveryStatus;

    const legacy = String(order.status || '').toLowerCase();
    if (!order.shipperId) {
        if (legacy === 'completed') return null;
        return null;
    }

    if (legacy === 'confirmed' || legacy === 'picking') return DELIVERY_STATUS.ASSIGNED;
    if (legacy === 'shipping') return DELIVERY_STATUS.DELIVERING;
    if (legacy === 'completed') return DELIVERY_STATUS.DELIVERED;
    if (legacy === 'failed') return DELIVERY_STATUS.FIRST_DELIVERY_FAILED;
    if (legacy === 'returning') return DELIVERY_STATUS.RETURNING;
    if (legacy === 'returned') return DELIVERY_STATUS.RETURNED;
    return DELIVERY_STATUS.ASSIGNED;
}

function applyInferredDeliveryFields(order, inferred) {
    if (!order || !inferred) return order;
    order.deliveryStatus = inferred;

    if (inferred === DELIVERY_STATUS.DELIVERING && (!order.deliveryAttempt || order.deliveryAttempt < 1)) {
        order.deliveryAttempt = 1;
    }
    if (inferred === DELIVERY_STATUS.REDELIVERING) {
        order.deliveryAttempt = 2;
    }
    if (
        (inferred === DELIVERY_STATUS.DELIVERED || inferred === DELIVERY_STATUS.DELIVERED_AFTER_RETRY) &&
        !order.deliveredAt
    ) {
        order.deliveredAt = order.updatedAt || new Date();
    }
    return order;
}

/**
 * Persist missing deliveryStatus from legacy status. Safe to call on read paths.
 * @returns {Promise<{order: any, migrated: boolean}>}
 */
async function ensureDeliveryStatus(order, { save = true } = {}) {
    if (!order) return { order, migrated: false };
    if (order.deliveryStatus) return { order, migrated: false };

    const inferred = inferDeliveryStatusFromLegacy(order);
    if (!inferred) return { order, migrated: false };

    applyInferredDeliveryFields(order, inferred);

    if (save && typeof order.save === 'function') {
        await order.save();
    }

    return { order, migrated: true };
}

module.exports = {
    FAILURE_REASONS,
    DELIVERY_STATUS,
    STATUS_DISPLAY,
    LEGACY_STATUS_MAP,
    TRANSITIONS,
    getStatusDisplay,
    syncLegacyStatus,
    validateTransition,
    validateFailurePayload,
    applyDeliveryFields,
    toPublicDeliveryView,
    resolveRole,
    inferDeliveryStatusFromLegacy,
    applyInferredDeliveryFields,
    ensureDeliveryStatus,
};
