import {
    DELIVERY_STATUS_LABEL,
    DELIVERY_STATUS_CLASS,
    resolveDeliveryStatus,
    getDeliveryStatusInfo,
} from './deliveryStatus';

/** @deprecated Prefer getDeliveryStatusInfo from deliveryStatus.js */
export const SHIPPER_STATUS = {
    confirmed: {
        label: 'Chờ lấy hàng',
        className: 'confirmed',
    },
    picking: {
        label: 'Đang lấy hàng',
        className: 'picking',
    },
    shipping: {
        label: 'Đang giao',
        className: 'shipping',
    },
    completed: {
        label: 'Đã giao thành công',
        className: 'completed',
    },
    failed: {
        label: 'Giao thất bại',
        className: 'failed',
    },
    returning: {
        label: 'Đang hoàn hàng',
        className: 'returning',
    },
    returned: {
        label: 'Đã hoàn hàng',
        className: 'returned',
    },
};

export const getShipperStatus = (statusOrOrder) => {
    if (statusOrOrder && typeof statusOrOrder === 'object') {
        return getDeliveryStatusInfo(statusOrOrder);
    }

    const delivery = resolveDeliveryStatus({ status: statusOrOrder });
    if (delivery) {
        return {
            label: DELIVERY_STATUS_LABEL[delivery] || delivery,
            className: DELIVERY_STATUS_CLASS[delivery] || 'unknown',
        };
    }

    return (
        SHIPPER_STATUS[statusOrOrder] || {
            label: 'Không xác định',
            className: 'unknown',
        }
    );
};

export { formatOrderCode } from './deliveryStatus';
