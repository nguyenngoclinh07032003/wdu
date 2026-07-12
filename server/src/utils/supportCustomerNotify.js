const ModelSupportCustomerNotification = require('../models/ModelSupportCustomerNotification');
const createMailTransport = require('../SendMail/mailTransport');
const { SUPPORT_STATUS_LABELS } = require('./supportRequestHelpers');

const normalizePhone = (phone = '') => {
    const digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('84') && digits.length === 11) {
        return `0${digits.slice(2)}`;
    }
    if (digits.length === 9) {
        return `0${digits}`;
    }
    return digits;
};

const buildCustomerMatchQuery = (user) => {
    const userId = user?.id || user?._id;
    const phone = normalizePhone(user?.phone || '');
    const email = String(user?.email || '')
        .trim()
        .toLowerCase();

    const orConditions = [];
    if (userId) orConditions.push({ customerUserId: userId });
    if (phone) orConditions.push({ phone });
    if (email) orConditions.push({ email });

    return orConditions.length ? { $or: orConditions } : null;
};

async function createSupportCustomerNotification({
    supportRequest,
    type,
    title,
    message,
    staffName = '',
    receivedAt = null,
    status = '',
}) {
    const payload = {
        customerUserId: supportRequest.customerUserId || null,
        phone: normalizePhone(supportRequest.phone),
        email: String(supportRequest.email || '').trim().toLowerCase(),
        supportRequestId: supportRequest._id,
        requestCode: supportRequest.requestCode,
        type,
        title,
        message,
        staffName,
        receivedAt,
        status: status || supportRequest.status,
        statusLabel: SUPPORT_STATUS_LABELS[status || supportRequest.status] || '',
        isRead: false,
    };

    return ModelSupportCustomerNotification.create(payload);
}

async function sendSupportCustomerEmail({ to, subject, html }) {
    if (!to) return;

    try {
        const transport = await createMailTransport();
        await transport.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            html,
        });
    } catch (error) {
        console.error('Support customer email error:', error);
    }
}

async function notifyCustomerRequestAccepted(supportRequest, staff) {
    const staffName = staff?.fullname || staff?.email || supportRequest.assignedToName || 'Nhân viên Mộc Xoa';
    const receivedAt = supportRequest.receivedAt || new Date();
    const statusLabel = SUPPORT_STATUS_LABELS.received;
    const title = 'Yêu cầu đã được tiếp nhận';
    const message = `Mã ${supportRequest.requestCode} đã được tiếp nhận bởi ${staffName} lúc ${receivedAt.toLocaleString('vi-VN')}. Trạng thái: ${statusLabel}.`;

    await createSupportCustomerNotification({
        supportRequest,
        type: 'accepted',
        title,
        message,
        staffName,
        receivedAt,
        status: 'received',
    });

    if (supportRequest.email) {
        sendSupportCustomerEmail({
            to: supportRequest.email,
            subject: `[Mộc Xoa] ${supportRequest.requestCode} đã được tiếp nhận`,
            html: `
                <h2>Yêu cầu hỗ trợ đã được tiếp nhận</h2>
                <p><strong>Mã yêu cầu:</strong> ${supportRequest.requestCode}</p>
                <p><strong>Trạng thái:</strong> ${statusLabel}</p>
                <p><strong>Nhân viên phụ trách:</strong> ${staffName}</p>
                <p><strong>Thời gian tiếp nhận:</strong> ${receivedAt.toLocaleString('vi-VN')}</p>
                <p>Bạn có thể theo dõi tiến độ tại mục "Yêu cầu hỗ trợ của tôi" trên website.</p>
            `,
        });
    }
}

async function notifyCustomerStaffReply(supportRequest, staff, replyText) {
    const staffName = staff?.fullname || staff?.email || supportRequest.staffReplyByName || 'Nhân viên Mộc Xoa';
    const title = 'Phản hồi từ Mộc Xoa';
    const message = replyText.trim();

    await createSupportCustomerNotification({
        supportRequest,
        type: 'reply',
        title,
        message,
        staffName,
        status: supportRequest.status,
    });

    if (supportRequest.email) {
        sendSupportCustomerEmail({
            to: supportRequest.email,
            subject: `[Mộc Xoa] Phản hồi yêu cầu ${supportRequest.requestCode}`,
            html: `
                <h2>Mộc Xoa đã phản hồi yêu cầu của bạn</h2>
                <p><strong>Mã yêu cầu:</strong> ${supportRequest.requestCode}</p>
                <p><strong>Nhân viên:</strong> ${staffName}</p>
                <p><strong>Nội dung phản hồi:</strong></p>
                <p>${message.replace(/\n/g, '<br/>')}</p>
            `,
        });
    }
}

async function notifyCustomerRequestResolved(supportRequest, staff) {
    const staffName = staff?.fullname || staff?.email || 'Nhân viên Mộc Xoa';
    const statusLabel = SUPPORT_STATUS_LABELS.resolved;
    const title = 'Yêu cầu đã được giải quyết';
    const message = `Mã ${supportRequest.requestCode} đã được xử lý xong. Vui lòng xác nhận kết quả hỗ trợ trong mục "Yêu cầu hỗ trợ của tôi".`;

    await createSupportCustomerNotification({
        supportRequest,
        type: 'resolved',
        title,
        message,
        staffName,
        status: 'resolved',
    });

    if (supportRequest.email) {
        sendSupportCustomerEmail({
            to: supportRequest.email,
            subject: `[Mộc Xoa] ${supportRequest.requestCode} đã được giải quyết`,
            html: `
                <h2>Yêu cầu hỗ trợ đã được giải quyết</h2>
                <p><strong>Mã yêu cầu:</strong> ${supportRequest.requestCode}</p>
                <p><strong>Trạng thái:</strong> ${statusLabel}</p>
                <p><strong>Nhân viên xử lý:</strong> ${staffName}</p>
                <p>Vui lòng đăng nhập và kiểm tra mục "Yêu cầu hỗ trợ của tôi" để xác nhận kết quả.</p>
            `,
        });
    }
}

module.exports = {
    normalizePhone,
    buildCustomerMatchQuery,
    notifyCustomerRequestAccepted,
    notifyCustomerStaffReply,
    notifyCustomerRequestResolved,
};
