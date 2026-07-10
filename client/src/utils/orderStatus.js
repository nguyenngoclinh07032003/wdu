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

export const getOrderStatusInfo = (status) => {
    const normalizedStatus = normalizeStatusValue(status, 'pending');

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

        case 'shipping':
            return {
                text: 'Đang giao',
                label: 'Đang giao',
                className: 'shipping',
            };

        case 'completed':
            return {
                text: 'Hoàn tất',
                label: 'Hoàn tất',
                className: 'completed',
            };

        case 'failed':
            return {
                text: 'Giao thất bại',
                label: 'Giao thất bại',
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

export const getNextStatusOptions = (currentStatus = 'pending') => {
    const normalizedStatus = normalizeStatusValue(currentStatus, 'pending');

    switch (normalizedStatus) {
        case 'pending':
            return [
                { value: 'confirmed', label: 'Đã xác nhận' },
                { value: 'cancelled', label: 'Hủy đơn' },
            ];

        case 'confirmed':
            return [
                { value: 'shipping', label: 'Đang giao' },
                { value: 'cancelled', label: 'Hủy đơn' },
            ];

        case 'shipping':
            return [
                { value: 'completed', label: 'Giao thành công' },
                { value: 'failed', label: 'Giao thất bại' },
            ];

        case 'failed':
            return [{ value: 'returning', label: 'Đang hoàn hàng' }];

        case 'returning':
            return [{ value: 'returned', label: 'Đã hoàn hàng' }];

        default:
            return [];
    }
};

export const canUserCancelOrder = (status) => {
    const normalizedStatus = normalizeStatusValue(status, 'pending');

    return normalizedStatus === 'pending' || normalizedStatus === 'confirmed';
};

export const canAdminUpdateOrder = (status) => {
    const normalizedStatus = normalizeStatusValue(status, 'pending');

    return !['completed', 'returned', 'cancelled'].includes(normalizedStatus);
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
