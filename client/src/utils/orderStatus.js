import {
    getDeliveryStatusInfo,
    resolveDeliveryStatus,
} from './deliveryStatus';

export const ORDER_STATUSES = [
    'pending',
    'confirmed',
    'shipping',
    'completed',
    'failed',
    'returning',
    'returned',
    'cancelled',
];

export const normalizeStatusValue = (value, fallback = 'pending') => {
    const normalized = String(value || '')
        .trim()
        .toLowerCase();

    return ORDER_STATUSES.includes(normalized) ? normalized : fallback;
};

export const normalizeOrderStatus = (orderOrStatus) => {
    if (typeof orderOrStatus === 'string') {
        return normalizeStatusValue(orderOrStatus, 'pending');
    }

    return normalizeStatusValue(orderOrStatus?.status || orderOrStatus?.trangthai, 'pending');
};

/** Prefer deliveryStatus display when present */
export const getOrderStatusInfo = (orderOrStatus) => {
    if (orderOrStatus && typeof orderOrStatus === 'object') {
        const delivery = resolveDeliveryStatus(orderOrStatus);
        if (delivery) {
            const info = getDeliveryStatusInfo(orderOrStatus);
            return {
                text: info.label,
                label: info.label,
                className: info.className,
                deliveryStatus: delivery,
            };
        }
    }

    const normalizedStatus = normalizeStatusValue(
        typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus?.status,
        'pending',
    );

    switch (normalizedStatus) {
        case 'pending':
            return {
                text: 'Chờ xác nhận',
                label: 'Chờ xác nhận',
                className: 'pending',
            };

        case 'confirmed':
            return {
                text: 'Đã xác nhận',
                label: 'Đã xác nhận',
                className: 'confirmed',
            };

        case 'picking':
            return {
                text: 'Shipper đã nhận đơn',
                label: 'Shipper đã nhận đơn',
                className: 'confirmed',
            };

        case 'shipping':
            return {
                text: 'Đang giao hàng',
                label: 'Đang giao hàng',
                className: 'shipping',
            };

        case 'completed':
            return {
                text: 'Giao hàng thành công',
                label: 'Giao hàng thành công',
                className: 'completed',
            };

        case 'failed':
            return {
                text: 'Giao hàng thất bại lần 1',
                label: 'Giao hàng thất bại lần 1',
                className: 'failed',
            };

        case 'returning':
            return {
                text: 'Đang hoàn hàng',
                label: 'Đang hoàn hàng',
                className: 'returning',
            };

        case 'returned':
            return {
                text: 'Đã hoàn hàng',
                label: 'Đã hoàn hàng',
                className: 'returned',
            };

        case 'cancelled':
            return {
                text: 'Đã hủy',
                label: 'Đã hủy',
                className: 'cancelled',
            };

        default:
            return {
                text: 'Chờ xác nhận',
                label: 'Chờ xác nhận',
                className: 'pending',
            };
    }
};

export const getNextStatusOptions = (currentStatus = 'pending', order = null) => {
    // When order is in delivery flow, admin should not manually change shipper results
    if (order?.deliveryStatus) {
        if (order.deliveryStatus === 'RETURNING') {
            return []; // use confirm-return button instead
        }
        return [];
    }

    const normalizedStatus = normalizeStatusValue(currentStatus, 'pending');

    switch (normalizedStatus) {
        case 'pending':
            return [
                { value: 'confirmed', label: 'Đã xác nhận' },
                { value: 'cancelled', label: 'Hủy đơn' },
            ];

        case 'confirmed':
            return [
                { value: 'cancelled', label: 'Hủy đơn' },
            ];

        default:
            return [];
    }
};

export const canUserCancelOrder = (status) => {
    const normalizedStatus = normalizeStatusValue(status, 'pending');

    return normalizedStatus === 'pending' || normalizedStatus === 'confirmed';
};

export const canAdminUpdateOrder = (statusOrOrder) => {
    if (statusOrOrder && typeof statusOrOrder === 'object') {
        if (statusOrOrder.deliveryStatus) {
            return statusOrOrder.deliveryStatus === 'RETURNING';
        }
        statusOrOrder = statusOrOrder.status;
    }

    const normalizedStatus = normalizeStatusValue(statusOrOrder, 'pending');

    return !['completed', 'returned', 'cancelled', 'shipping', 'failed', 'returning'].includes(
        normalizedStatus,
    );
};

export const isLockedOrderStatus = (status) => {
    const normalizedStatus = normalizeStatusValue(status, 'pending');

    return ['completed', 'returned', 'cancelled'].includes(normalizedStatus);
};

export const isDoneOrderStatus = (status) => {
    const normalizedStatus = normalizeStatusValue(status, 'pending');

    return normalizedStatus === 'completed' || normalizedStatus === 'returned';
};

export const isCancelledOrderStatus = (status) => {
    const normalizedStatus = normalizeStatusValue(status, 'pending');

    return normalizedStatus === 'cancelled';
};
