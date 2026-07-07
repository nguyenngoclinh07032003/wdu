export const SHIPPER_STATUS = {
    confirmed: {
        label: 'Chờ giao',
        className: 'confirmed',
    },
    shipping: {
        label: 'Đang giao',
        className: 'shipping',
    },
    completed: {
        label: 'Giao thành công',
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

export const getShipperStatus = (status) => {
    return (
        SHIPPER_STATUS[status] || {
            label: 'Không xác định',
            className: 'unknown',
        }
    );
};
