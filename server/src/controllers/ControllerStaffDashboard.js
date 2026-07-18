const ModelPayment = require('../models/ModelPayment');
const ModelUser = require('../models/ModelUser');
const ModelDoctorProfile = require('../models/ModelDoctorProfile');
const ModelDoctorInboxQuestion = require('../models/ModelDoctorInboxQuestion');
const ModelSupportRequest = require('../models/ModelSupportRequest');
const {
    enrichConversation,
    getStaffUnread,
    isDoctorOwned,
    matchesStaffPending,
} = require('../utils/doctorInboxWorkflow');

function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function startOfYesterday() {
    const d = startOfToday();
    d.setDate(d.getDate() - 1);
    return d;
}

function percentChange(today, yesterday) {
    if (!yesterday) return today ? 100 : 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
}

class ControllerStaffDashboard {
    async getDashboard(req, res) {
        try {
            const today = startOfToday();
            const yesterday = startOfYesterday();

            const [
                newOrdersToday,
                newOrdersYesterday,
                pendingOrders,
                shippingOrders,
                waitingPickup,
                deliveringNow,
                delivered,
                deliveryFailed,
                staffQuestions,
                supportPending,
                supportProcessing,
                supportToday,
                supportYesterday,
                doctorsProfiles,
                shippers,
                recentOrders,
                recentSupports,
                escalatedToday,
                escalatedYesterday,
                shippingToday,
                shippingYesterday,
            ] = await Promise.all([
                ModelPayment.countDocuments({ createdAt: { $gte: today }, status: { $ne: 'cancelled' } }),
                ModelPayment.countDocuments({
                    createdAt: { $gte: yesterday, $lt: today },
                    status: { $ne: 'cancelled' },
                }),
                ModelPayment.countDocuments({ status: 'pending' }),
                ModelPayment.countDocuments({
                    $or: [
                        { deliveryStatus: { $in: ['ASSIGNED', 'ACCEPTED', 'DELIVERING', 'REDELIVERING', 'FIRST_DELIVERY_FAILED'] } },
                        {
                            deliveryStatus: { $exists: false },
                            status: { $in: ['shipping', 'confirmed', 'picking'] },
                        },
                    ],
                }),
                ModelPayment.countDocuments({
                    $or: [
                        { deliveryStatus: { $in: ['ASSIGNED', 'ACCEPTED', 'FIRST_DELIVERY_FAILED'] } },
                        {
                            deliveryStatus: { $exists: false },
                            status: { $in: ['confirmed', 'picking'] },
                        },
                    ],
                }),
                ModelPayment.countDocuments({
                    $or: [
                        { deliveryStatus: { $in: ['DELIVERING', 'REDELIVERING'] } },
                        { deliveryStatus: { $exists: false }, status: 'shipping' },
                    ],
                }),
                ModelPayment.countDocuments({
                    $or: [
                        { deliveryStatus: { $in: ['DELIVERED', 'DELIVERED_AFTER_RETRY'] } },
                        { deliveryStatus: { $exists: false }, status: 'completed' },
                    ],
                }),
                ModelPayment.countDocuments({
                    $or: [
                        { deliveryStatus: { $in: ['FIRST_DELIVERY_FAILED', 'RETURNING', 'RETURNED'] } },
                        { deliveryStatus: { $exists: false }, status: { $in: ['failed', 'returning', 'returned'] } },
                    ],
                }),
                ModelDoctorInboxQuestion.find({
                    $or: [
                        { targetRole: 'staff' },
                        { escalatedToDoctor: true },
                        { workflowStatus: { $in: ['TRANSFERRED_BACK', 'REJECTED', 'WAITING_STAFF_REVIEW'] } },
                    ],
                })
                    .sort({ updatedAt: -1 })
                    .limit(200)
                    .lean(),
                ModelSupportRequest.countDocuments({
                    status: { $in: ['pending', 'received'] },
                }).catch(() => 0),
                ModelSupportRequest.countDocuments({
                    status: { $in: ['processing', 'waiting_customer'] },
                }).catch(() => 0),
                ModelSupportRequest.countDocuments({ createdAt: { $gte: today } }).catch(() => 0),
                ModelSupportRequest.countDocuments({
                    createdAt: { $gte: yesterday, $lt: today },
                }).catch(() => 0),
                ModelDoctorProfile.find({ status: 'approved' })
                    .select('userId specialty hospital')
                    .lean(),
                ModelUser.find({ role: 'shipper' }).select('fullname email phone avatar').lean(),
                ModelPayment.find({})
                    .sort({ createdAt: -1 })
                    .limit(8)
                    .lean(),
                ModelSupportRequest.find({})
                    .sort({ updatedAt: -1 })
                    .limit(6)
                    .select('requestCode fullName supportType supportTypeLabel message status createdAt updatedAt')
                    .lean()
                    .catch(() => []),
                ModelDoctorInboxQuestion.countDocuments({
                    escalatedToDoctor: true,
                    escalatedAt: { $gte: today },
                }),
                ModelDoctorInboxQuestion.countDocuments({
                    escalatedToDoctor: true,
                    escalatedAt: { $gte: yesterday, $lt: today },
                }),
                ModelPayment.countDocuments({
                    assignedAt: { $gte: today },
                    shipperId: { $ne: null },
                }),
                ModelPayment.countDocuments({
                    assignedAt: { $gte: yesterday, $lt: today },
                    shipperId: { $ne: null },
                }),
            ]);

            let pendingQuestions = 0;
            let transferredToDoctors = 0;
            let doctorUnreadPending = 0;
            let totalStaffUnread = 0;
            let pendingQuestionsToday = 0;
            let pendingQuestionsYesterday = 0;
            const recentQuestions = [];
            const activities = [];

            for (const q of staffQuestions) {
                const unread = getStaffUnread(q);
                if (!isDoctorOwned(q)) {
                    totalStaffUnread += unread;
                }
                const needsStaff = matchesStaffPending(q);

                if (needsStaff) {
                    pendingQuestions += 1;
                    const updated = new Date(q.updatedAt || q.createdAt || 0);
                    if (updated >= today) pendingQuestionsToday += 1;
                    else if (updated >= yesterday && updated < today) pendingQuestionsYesterday += 1;
                }
                if (q.escalatedToDoctor) {
                    transferredToDoctors += 1;
                    if (getStaffUnread({ ...q, staffUnreadCount: undefined }) >= 0 && (q.needsReply || !q.doctorLastReadAt)) {
                        // count doctor-side pending via needsReply after escalate
                    }
                    if (!q.doctorLastReadAt || q.needsReply) doctorUnreadPending += 1;
                }

                if (recentQuestions.length < 6 && (needsStaff || (!isDoctorOwned(q) && unread > 0) || q.escalatedToDoctor)) {
                    recentQuestions.push({
                        ...enrichConversation(q),
                        staffUnread: isDoctorOwned(q) ? 0 : unread,
                        sourceLabel: q.escalatedToDoctor
                            ? q.workflowStatus === 'ANSWERED' || q.status === 'answered'
                                ? 'Bác sĩ phản hồi'
                                : 'Chuyển tiếp'
                            : 'Khách hàng',
                    });
                }

                if (q.escalatedAt) {
                    activities.push({
                        type: 'escalate',
                        text: `Chuyển câu hỏi của ${q.askerName || 'khách'} cho bác sĩ${q.assignedDoctorName ? ` ${q.assignedDoctorName}` : ''}`,
                        at: q.escalatedAt,
                        actor: q.escalatedByName || 'Nhân viên',
                    });
                }
                if (q.answeredAt && q.targetRole === 'staff') {
                    activities.push({
                        type: 'answer',
                        text: `Đã trả lời câu hỏi từ ${q.askerName || 'khách hàng'}`,
                        at: q.answeredAt,
                        actor: q.answeredByName || 'Nhân viên',
                    });
                }
            }

            // Doctor workload
            const doctorUserIds = doctorsProfiles.map((p) => p.userId);
            const doctorUsers = await ModelUser.find({ _id: { $in: doctorUserIds } })
                .select('fullname email')
                .lean();
            const doctorUserMap = Object.fromEntries(doctorUsers.map((u) => [String(u._id), u]));

            const doctorLoadAgg = await ModelDoctorInboxQuestion.aggregate([
                {
                    $match: {
                        assignedDoctorId: { $ne: null },
                        workflowStatus: { $nin: ['CLOSED'] },
                    },
                },
                { $group: { _id: '$assignedDoctorId', count: { $sum: 1 } } },
            ]);
            const loadMap = Object.fromEntries(doctorLoadAgg.map((x) => [String(x._id), x.count]));

            const doctors = doctorsProfiles.map((p) => {
                const u = doctorUserMap[String(p.userId)];
                const load = loadMap[String(p.userId)] || 0;
                let status = 'available';
                if (load >= 20) status = 'busy';
                else if (load >= 8) status = 'busy';
                return {
                    doctorId: String(p.userId),
                    fullname: u?.fullname || u?.email || 'Bác sĩ',
                    specialty: p.specialty || 'Chưa cập nhật',
                    hospital: p.hospital || '',
                    status,
                    statusLabel: status === 'busy' ? 'Bận' : 'Rảnh',
                    activeCases: load,
                };
            });

            // Shipper status from orders
            const activeShipOrders = await ModelPayment.find({
                shipperId: { $ne: null },
                $or: [
                    {
                        deliveryStatus: {
                            $in: [
                                'ASSIGNED',
                                'ACCEPTED',
                                'DELIVERING',
                                'REDELIVERING',
                                'FIRST_DELIVERY_FAILED',
                                'RETURNING',
                            ],
                        },
                    },
                    {
                        deliveryStatus: { $exists: false },
                        status: { $in: ['shipping', 'confirmed', 'picking', 'failed', 'returning'] },
                    },
                ],
            })
                .select('shipperId status deliveryStatus')
                .lean();

            const shipperOutcomes = await ModelPayment.aggregate([
                {
                    $match: {
                        shipperId: { $ne: null },
                        $or: [
                            { deliveryStatus: { $in: ['DELIVERED', 'DELIVERED_AFTER_RETRY', 'RETURNED'] } },
                            {
                                deliveryStatus: { $exists: false },
                                status: { $in: ['completed', 'returned', 'failed'] },
                            },
                        ],
                    },
                },
                {
                    $group: {
                        _id: '$shipperId',
                        success: {
                            $sum: {
                                $cond: [
                                    {
                                        $or: [
                                            { $in: ['$deliveryStatus', ['DELIVERED', 'DELIVERED_AFTER_RETRY']] },
                                            { $eq: ['$status', 'completed'] },
                                        ],
                                    },
                                    1,
                                    0,
                                ],
                            },
                        },
                        total: { $sum: 1 },
                    },
                },
            ]);
            const outcomeMap = Object.fromEntries(
                shipperOutcomes.map((row) => [
                    String(row._id),
                    row.total ? Math.round((row.success / row.total) * 50) / 10 : null,
                ]),
            );

            const shipperLoad = {};
            for (const o of activeShipOrders) {
                const id = String(o.shipperId);
                if (!shipperLoad[id]) shipperLoad[id] = { shipping: 0, waiting: 0 };
                const ds = o.deliveryStatus;
                if (ds === 'DELIVERING' || ds === 'REDELIVERING' || o.status === 'shipping') {
                    shipperLoad[id].shipping += 1;
                } else {
                    shipperLoad[id].waiting += 1;
                }
            }

            const shipperList = shippers.slice(0, 8).map((s) => {
                const load = shipperLoad[String(s._id)] || { shipping: 0, waiting: 0 };
                let status = 'idle';
                let statusLabel = 'Đang rảnh';
                if (load.shipping > 0) {
                    status = 'shipping';
                    statusLabel = 'Đang giao';
                } else if (load.waiting > 0) {
                    status = 'picking';
                    statusLabel = 'Chờ lấy hàng';
                }
                const rating = outcomeMap[String(s._id)];
                return {
                    shipperId: String(s._id),
                    fullname: s.fullname || s.email || 'Shipper',
                    phone: s.phone || '',
                    status,
                    statusLabel,
                    activeOrders: load.shipping + load.waiting,
                    rating: rating != null ? rating : null,
                };
            });

            activities.sort((a, b) => new Date(b.at) - new Date(a.at));

            const mappedOrders = recentOrders.map((o) => {
                const products = Array.isArray(o.products) ? o.products : [];
                const firstName = products[0]?.nameProduct || products[0]?.name || 'Sản phẩm';
                return {
                    _id: o._id,
                    orderCode: o.orderId || o.orderCode || `DH${String(o._id).slice(-5).toUpperCase()}`,
                    productName: firstName,
                    total: o.sumprice || o.total || 0,
                    status: o.status,
                    deliveryStatus: o.deliveryStatus || null,
                    customerName: o.fullname || o.fullName || o.phone || 'Khách',
                    createdAt: o.createdAt,
                };
            });

            const mappedSupports = (recentSupports || []).map((s) => ({
                _id: s._id,
                code: s.requestCode || `HT${String(s._id).slice(-5).toUpperCase()}`,
                title: s.supportTypeLabel || s.supportType || (s.message || '').slice(0, 60) || 'Yêu cầu hỗ trợ',
                sender: s.fullName || 'Khách hàng',
                status: s.status || 'pending',
                updatedAt: s.updatedAt || s.createdAt,
            }));

            const questionsPendingCount = pendingQuestions;
            const supportTotal = (supportPending || 0) + (supportProcessing || 0);

            return res.status(200).json({
                statistics: {
                    newOrders: newOrdersToday || pendingOrders,
                    newOrdersChange: percentChange(newOrdersToday, newOrdersYesterday),
                    pendingQuestions: questionsPendingCount,
                    pendingQuestionsChange: percentChange(pendingQuestionsToday, pendingQuestionsYesterday),
                    transferredToDoctors,
                    transferredToDoctorsChange: percentChange(escalatedToday, escalatedYesterday),
                    shippingOrders,
                    shippingOrdersChange: percentChange(shippingToday, shippingYesterday),
                    supportRequests: supportTotal,
                    supportRequestsChange: percentChange(supportToday, supportYesterday),
                    supportPending: supportPending || 0,
                    totalStaffUnread,
                    internalNotifications: totalStaffUnread,
                    internalNotificationsChange: null,
                    transferredDoctorPending: doctorUnreadPending,
                },
                shippingStats: {
                    waitingPickup: waitingPickup || 0,
                    shipping: deliveringNow || 0,
                    delivered: delivered || 0,
                    failed: deliveryFailed || 0,
                },
                progressBreakdown: [
                    { key: 'orders', label: 'Đơn hàng', value: pendingOrders + shippingOrders },
                    { key: 'questions', label: 'Câu hỏi', value: questionsPendingCount },
                    { key: 'shipping', label: 'Shipping', value: waitingPickup + deliveringNow },
                    { key: 'support', label: 'Hỗ trợ', value: supportTotal },
                ],
                recentQuestions: recentQuestions.slice(0, 5),
                doctors: doctors.sort((a, b) => a.activeCases - b.activeCases).slice(0, 6),
                shippers: shipperList,
                recentOrders: mappedOrders,
                recentSupports: mappedSupports,
                recentActivities: activities.slice(0, 8),
                updatedAt: new Date(),
                workflow: {
                    user: ['Gửi câu hỏi', 'Đặt hàng', 'Theo dõi giao hàng'],
                    staff: ['Tiếp nhận', 'Phân loại', 'Điều phối'],
                    doctor: ['Tư vấn', 'Trả lời', 'Ghi chú nội bộ'],
                    shipper: ['Nhận đơn', 'Giao hàng', 'Cập nhật trạng thái'],
                    admin: ['Duyệt', 'Giám sát', 'Báo cáo'],
                },
            });
        } catch (error) {
            console.error('getDashboard staff error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async getUnreadSummary(req, res) {
        try {
            const questions = await ModelDoctorInboxQuestion.find({
                $or: [
                    { targetRole: 'staff' },
                    { escalatedToDoctor: true },
                    { workflowStatus: { $in: ['TRANSFERRED_BACK', 'REJECTED'] } },
                ],
            })
                .select('staffUnreadCount needsReply status targetRole staffLastReadAt workflowStatus escalatedToDoctor priority assignedDoctorId')
                .lean();

            let totalUnread = 0;
            let conversationsWithUnread = 0;
            for (const q of questions) {
                if (isDoctorOwned(q)) continue;
                const u = getStaffUnread(q);
                totalUnread += u;
                if (u > 0) conversationsWithUnread += 1;
            }

            return res.status(200).json({ totalUnread, conversationsWithUnread });
        } catch (error) {
            console.error('getUnreadSummary staff error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async markConversationRead(req, res) {
        try {
            const { id } = req.params;
            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });

            if (req.user?.role !== 'staff' && !req.user?.isAdmin) {
                return res.status(403).json({ message: 'Không có quyền' });
            }

            if (isDoctorOwned(record)) {
                return res.status(403).json({
                    message: 'Case đang bác sĩ xử lý — không đánh dấu đọc phía nhân viên',
                });
            }

            if (
                record.targetRole !== 'staff' &&
                !['TRANSFERRED_BACK', 'REJECTED'].includes(record.workflowStatus)
            ) {
                return res.status(403).json({ message: 'Không thuộc hộp thư nhân viên' });
            }

            record.staffUnreadCount = 0;
            record.staffLastReadAt = new Date();
            if (
                record.workflowStatus !== 'CLOSED' &&
                (['NEW', 'WAITING_STAFF_REVIEW'].includes(record.workflowStatus) ||
                    (!record.workflowStatus && record.status === 'pending'))
            ) {
                record.workflowStatus = 'WAITING_STAFF_REVIEW';
            }
            await record.save();

            try {
                const io = req.app?.get('io');
                if (io) {
                    io.to('staff-inbox').emit('staff-inbox:update', {
                        type: 'read',
                        conversationId: String(record._id),
                    });
                }
            } catch (e) {
                // ignore
            }

            return res.status(200).json({
                message: 'Đã đánh dấu đã đọc',
                data: { conversationId: String(record._id), unreadCount: 0 },
            });
        } catch (error) {
            console.error('markConversationRead staff error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }
}

module.exports = new ControllerStaffDashboard();
