export const SUPPORT_STATUS_OPTIONS = [
    { value: 'pending', label: 'Chờ tiếp nhận' },
    { value: 'received', label: 'Đã tiếp nhận' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'waiting_customer', label: 'Chờ khách hàng phản hồi' },
    { value: 'resolved', label: 'Đã giải quyết' },
    { value: 'closed', label: 'Đã đóng' },
    { value: 'cancelled', label: 'Đã hủy' },
];

export const SUPPORT_STATUS_LABELS = SUPPORT_STATUS_OPTIONS.reduce((acc, item) => {
    acc[item.value] = item.label;
    return acc;
}, {});
