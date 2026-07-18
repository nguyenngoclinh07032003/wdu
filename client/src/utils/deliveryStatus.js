export const FAILURE_REASONS = [
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

export const DELIVERY_STATUS = {
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

export const DELIVERY_STATUS_LABEL = {
    ASSIGNED: 'Đã giao cho shipper',
    ACCEPTED: 'Shipper đã nhận đơn',
    DELIVERING: 'Đang giao hàng',
    FIRST_DELIVERY_FAILED: 'Giao hàng thất bại lần 1',
    REDELIVERING: 'Đang giao lại',
    DELIVERED: 'Giao hàng thành công',
    DELIVERED_AFTER_RETRY: 'Giao hàng thành công sau khi giao lại',
    RETURNING: 'Đang hoàn hàng',
    RETURNED: 'Đã hoàn hàng',
};

export const DELIVERY_STATUS_CLASS = {
    ASSIGNED: 'confirmed',
    ACCEPTED: 'picking',
    DELIVERING: 'shipping',
    FIRST_DELIVERY_FAILED: 'failed',
    REDELIVERING: 'shipping',
    DELIVERED: 'completed',
    DELIVERED_AFTER_RETRY: 'completed',
    RETURNING: 'returning',
    RETURNED: 'returned',
};

export function resolveDeliveryStatus(order) {
    if (order?.deliveryStatus) return order.deliveryStatus;

    // Chỉ suy ra deliveryStatus từ legacy khi đã có shipper (đơn đã được gán)
    const hasShipper = Boolean(order?.shipperId);
    const legacy = String(order?.status || '').toLowerCase();

    if (!hasShipper) {
        // confirmed/pending chưa gán shipper → không phải ASSIGNED
        return null;
    }

    if (legacy === 'confirmed' || legacy === 'picking') return 'ASSIGNED';
    if (legacy === 'shipping') return 'DELIVERING';
    if (legacy === 'completed') return 'DELIVERED';
    if (legacy === 'failed') return 'FIRST_DELIVERY_FAILED';
    if (legacy === 'returning') return 'RETURNING';
    if (legacy === 'returned') return 'RETURNED';
    return null;
}

export function getDeliveryStatusInfo(orderOrStatus) {
    const status =
        typeof orderOrStatus === 'string'
            ? orderOrStatus
            : resolveDeliveryStatus(orderOrStatus);

    if (!status) {
        return { label: 'Chưa giao shipper', className: 'pending', status: null };
    }

    return {
        status,
        label: DELIVERY_STATUS_LABEL[status] || status,
        className: DELIVERY_STATUS_CLASS[status] || 'unknown',
    };
}

export function formatOrderCode(order) {
    const id = String(order?._id || '');
    const date = order?.assignedAt || order?.createdAt || new Date();
    const d = new Date(date);
    const y = String(d.getFullYear()).slice(-2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `DH-${y}${m}${day}-${id.slice(-3).toUpperCase()}`;
}

/** true nếu chưa có lịch hoặc đã đến giờ giao lại */
export function isRedeliveryScheduleReady(order) {
    if (!order?.redeliveryScheduledAt) return true;
    const scheduled = new Date(order.redeliveryScheduledAt);
    if (Number.isNaN(scheduled.getTime())) return true;
    return Date.now() >= scheduled.getTime();
}
