const ModelSupportRequest = require('../models/ModelSupportRequest');

const SUPPORT_TYPE_LABELS = {
    'product-advice': 'Tư vấn sản phẩm',
    'order-support': 'Kiểm tra đơn hàng',
    'return-warranty': 'Đổi trả hoặc bảo hành',
    feedback: 'Góp ý hoặc khiếu nại',
    partnership: 'Hợp tác kinh doanh',
    other: 'Nội dung khác',
};

const SUPPORT_STATUS_LABELS = {
    pending: 'Chờ tiếp nhận',
    received: 'Đã tiếp nhận',
    processing: 'Đang xử lý',
    waiting_customer: 'Chờ khách hàng phản hồi',
    resolved: 'Đã giải quyết',
    closed: 'Đã đóng',
    cancelled: 'Đã hủy',
};

const PENDING_RECEPTION_STATUSES = ['pending'];
const IN_PROGRESS_STATUSES = ['received', 'processing', 'waiting_customer'];
const UNPROCESSED_STATUSES = [...PENDING_RECEPTION_STATUSES, ...IN_PROGRESS_STATUSES];

const isValidPhone = (phone = '') => /^0\d{9}$/.test(String(phone).replace(/\s/g, ''));

async function generateRequestCode() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const prefix = `YC-${dateStr}-`;
    const count = await ModelSupportRequest.countDocuments({
        requestCode: { $regex: `^${prefix}` },
    });

    return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

function appendStatusHistory(record, nextStatus, note, user, action = 'status_change') {
    const previousStatus = record.status;
    record.status = nextStatus;
    record.statusHistory = record.statusHistory || [];
    record.statusHistory.push({
        status: nextStatus,
        previousStatus,
        action,
        note: note || '',
        updatedBy: user?.id || user?._id || null,
        updatedByName: user?.fullname || user?.email || '',
        createdAt: new Date(),
    });
    record.updatedAt = new Date();
}

module.exports = {
    SUPPORT_TYPE_LABELS,
    SUPPORT_STATUS_LABELS,
    PENDING_RECEPTION_STATUSES,
    IN_PROGRESS_STATUSES,
    UNPROCESSED_STATUSES,
    isValidPhone,
    generateRequestCode,
    appendStatusHistory,
};
