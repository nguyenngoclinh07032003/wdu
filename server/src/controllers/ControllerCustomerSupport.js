const ModelSupportRequest = require('../models/ModelSupportRequest');
const ModelSupportCustomerNotification = require('../models/ModelSupportCustomerNotification');
const { SUPPORT_STATUS_LABELS } = require('../utils/supportRequestHelpers');
const { buildCustomerMatchQuery, normalizePhone } = require('../utils/supportCustomerNotify');

function buildNotificationOwnerQuery(user) {
    const userId = user?.id || user?._id;
    const role = user?.role;
    const isCustomerFacing = !role || role === 'user';
    const or = [];

    if (userId) or.push({ customerUserId: userId });

    if (isCustomerFacing) {
        const phone = normalizePhone(user?.phone || '');
        const email = String(user?.email || '')
            .trim()
            .toLowerCase();
        if (phone) or.push({ customerUserId: null, phone });
        if (email) or.push({ customerUserId: null, email });
    }

    return or.length ? { $or: or } : null;
}

function sanitizeSupportRequestForCustomer(record) {
    const data = record.toObject ? record.toObject() : { ...record };
    delete data.staffNotes;
    delete data.imageData;
    data.statusLabel = SUPPORT_STATUS_LABELS[data.status] || data.status;
    data.replyTimeline = buildReplyTimeline(data);
    return data;
}

function buildReplyTimeline(detail) {
    const timeline = [
        {
            id: 'customer-initial',
            senderRole: 'customer',
            senderName: detail.fullName || 'Khách hàng',
            message: detail.message,
            createdAt: detail.createdAt,
        },
    ];

    if (Array.isArray(detail.replyHistory) && detail.replyHistory.length) {
        detail.replyHistory.forEach((item, index) => {
            if (item.senderRole === 'staff') {
                timeline.push({
                    id: `reply-${index}`,
                    senderRole: 'staff',
                    senderName: item.senderName || 'Nhân viên',
                    message: item.message,
                    createdAt: item.createdAt,
                });
            }
        });
    } else if (detail.staffReply) {
        timeline.push({
            id: 'legacy-reply',
            senderRole: 'staff',
            senderName: detail.staffReplyByName || 'Nhân viên',
            message: detail.staffReply,
            createdAt: detail.staffReplyAt,
        });
    }

    return timeline;
}

async function findOwnedRequest(req, requestId) {
    const matchQuery = buildCustomerMatchQuery(req.user);
    if (!matchQuery) return null;

    const record = await ModelSupportRequest.findOne({
        _id: requestId,
        ...matchQuery,
    });

    return record;
}

const ControllerCustomerSupport = {
    async getMyRequests(req, res) {
        try {
            const matchQuery = buildCustomerMatchQuery(req.user);
            if (!matchQuery) {
                return res.status(401).json({ message: 'Bạn cần đăng nhập để xem yêu cầu hỗ trợ' });
            }

            const data = await ModelSupportRequest.find(matchQuery)
                .select('-staffNotes -imageData')
                .sort({ createdAt: -1 })
                .lean();

            const mapped = data.map((item) => ({
                ...item,
                statusLabel: SUPPORT_STATUS_LABELS[item.status] || item.status,
            }));

            return res.status(200).json({ data: mapped });
        } catch (error) {
            console.error('getMyRequests error:', error);
            return res.status(500).json({ message: 'Không thể tải yêu cầu hỗ trợ của bạn' });
        }
    },

    async getMyRequestById(req, res) {
        try {
            const record = await findOwnedRequest(req, req.params.id);
            if (!record) {
                return res.status(404).json({ message: 'Không tìm thấy yêu cầu hỗ trợ' });
            }

            return res.status(200).json({ data: sanitizeSupportRequestForCustomer(record) });
        } catch (error) {
            console.error('getMyRequestById error:', error);
            return res.status(500).json({ message: 'Không thể tải chi tiết yêu cầu' });
        }
    },

    async getNotifications(req, res) {
        try {
            const matchQuery = buildCustomerMatchQuery(req.user);
            if (!matchQuery) {
                return res.status(401).json({ message: 'Bạn cần đăng nhập để xem thông báo' });
            }

            const notificationQuery = buildNotificationOwnerQuery(req.user);
            if (!notificationQuery) {
                return res.status(200).json({ data: [], unreadCount: 0 });
            }

            const [data, unreadCount] = await Promise.all([
                ModelSupportCustomerNotification.find(notificationQuery).sort({ createdAt: -1 }).lean(),
                ModelSupportCustomerNotification.countDocuments({ ...notificationQuery, isRead: false }),
            ]);

            return res.status(200).json({ data, unreadCount });
        } catch (error) {
            console.error('getNotifications error:', error);
            return res.status(500).json({ message: 'Không thể tải thông báo' });
        }
    },

    async markNotificationRead(req, res) {
        try {
            const matchQuery = buildCustomerMatchQuery(req.user);
            if (!matchQuery) {
                return res.status(401).json({ message: 'Bạn cần đăng nhập' });
            }

            const notificationQuery = buildNotificationOwnerQuery(req.user);
            if (!notificationQuery) {
                return res.status(404).json({ message: 'Không tìm thấy thông báo' });
            }

            const notification = await ModelSupportCustomerNotification.findOneAndUpdate(
                {
                    _id: req.params.id,
                    ...notificationQuery,
                },
                { isRead: true },
                { new: true },
            );

            if (!notification) {
                return res.status(404).json({ message: 'Không tìm thấy thông báo' });
            }

            return res.status(200).json({ message: 'Đã đánh dấu đã đọc', data: notification });
        } catch (error) {
            console.error('markNotificationRead error:', error);
            return res.status(500).json({ message: 'Không thể cập nhật thông báo' });
        }
    },

    async markAllNotificationsRead(req, res) {
        try {
            const notificationQuery = buildNotificationOwnerQuery(req.user);
            if (!notificationQuery) {
                return res.status(200).json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
            }

            await ModelSupportCustomerNotification.updateMany(
                {
                    isRead: false,
                    ...notificationQuery,
                },
                { isRead: true },
            );

            return res.status(200).json({ message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
        } catch (error) {
            console.error('markAllNotificationsRead error:', error);
            return res.status(500).json({ message: 'Không thể cập nhật thông báo' });
        }
    },
};

module.exports = ControllerCustomerSupport;
