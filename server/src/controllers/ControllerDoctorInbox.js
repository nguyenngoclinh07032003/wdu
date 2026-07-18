const ModelDoctorInboxQuestion = require('../models/ModelDoctorInboxQuestion');
const ModelDoctorProfile = require('../models/ModelDoctorProfile');
const ModelUser = require('../models/ModelUser');
const {
    WORKFLOW_LABELS,
    resolveWorkflowStatus,
    getDoctorUnread,
    getStaffUnread,
    isDoctorVisible,
    isDoctorOwned,
    matchesStaffPending,
    matchesDoctorFilter,
    enrichConversation,
} = require('../utils/doctorInboxWorkflow');

const ASKER_ROLES = ['user', 'admin'];

const REJECT_REASONS = {
    OUT_OF_SPECIALTY: 'Không đúng chuyên khoa',
    INSUFFICIENT_INFORMATION: 'Nội dung không đủ thông tin',
    NEED_OFFLINE_EXAMINATION: 'Cần khám trực tiếp',
    INAPPROPRIATE_CONTENT: 'Nội dung không phù hợp',
    DOCTOR_UNAVAILABLE: 'Bác sĩ không thể tiếp nhận',
};

function canAskAsCustomer(user) {
    if (!user) return false;
    const role = user.role;
    if (role === 'doctor' || role === 'staff' || role === 'shipper') return false;
    return ASKER_ROLES.includes(role) || user.isAdmin === true;
}

async function isApprovedDoctor(userId) {
    const profile = await ModelDoctorProfile.findOne({ userId });
    return profile?.status === 'approved';
}

function buildMessages(record, { includeInternal = true } = {}) {
    let msgs;
    if (Array.isArray(record.messages) && record.messages.length) {
        msgs = record.messages;
    } else {
        msgs = [
            {
                senderId: record.askerId,
                senderRole: record.askerRole,
                senderName: record.askerName,
                text: record.question,
                isInternal: false,
                createdAt: record.createdAt,
            },
        ];
        if (record.status === 'answered' && record.answer) {
            msgs.push({
                senderId: record.answeredBy,
                senderRole: record.targetRole === 'staff' ? 'staff' : 'doctor',
                senderName: record.answeredByName,
                text: record.answer,
                isInternal: false,
                createdAt: record.answeredAt || record.updatedAt,
            });
        }
    }

    if (!includeInternal) {
        return msgs.filter((m) => !m.isInternal && m.messageType !== 'internal');
    }
    return msgs;
}

function emitDoctorInboxUpdate(req, payload = {}) {
    try {
        const io = req.app?.get('io');
        if (io) {
            io.to('doctor-inbox').emit('doctor-inbox:update', {
                at: new Date().toISOString(),
                ...payload,
            });
        }
    } catch (error) {
        console.warn('emitDoctorInboxUpdate failed:', error.message);
    }
}

function emitStaffInboxUpdate(req, payload = {}) {
    try {
        const io = req.app?.get('io');
        if (io) {
            io.to('staff-inbox').emit('staff-inbox:update', {
                at: new Date().toISOString(),
                ...payload,
            });
        }
    } catch (error) {
        console.warn('emitStaffInboxUpdate failed:', error.message);
    }
}

function buildDoctorTabCounts(questions) {
    const keys = [
        'all',
        'unread',
        'pending',
        'reviewing',
        'answered',
        'escalated',
        'request_info',
        'urgent',
        'closed',
        'transferred_back',
    ];
    const tabCounts = Object.fromEntries(keys.map((k) => [k, 0]));
    let totalUnread = 0;

    for (const q of questions) {
        if (!isDoctorVisible(q)) continue;
        const unread = getDoctorUnread(q);
        totalUnread += unread;
        for (const key of keys) {
            if (matchesDoctorFilter(q, key === 'all' ? '' : key)) {
                // Đếm số hội thoại (không cộng dồn unread)
                tabCounts[key] += 1;
            }
        }
    }

    return { totalUnread, tabCounts };
}

async function loadDoctorVisibleQuestions(selectExtra = '') {
    const base =
        'doctorUnreadCount staffUnreadCount needsReply status workflowStatus priority targetRole escalatedToDoctor assignedDoctorId source updatedAt createdAt answeredAt doctorLastReadAt firstViewedByDoctorAt';
    return ModelDoctorInboxQuestion.find({
        $or: [{ targetRole: 'doctor' }, { escalatedToDoctor: true }, { assignedDoctorId: { $ne: null } }],
    })
        .select(`${base} ${selectExtra}`.trim())
        .lean();
}

function appendMessage(record, payload) {
    const existing = buildMessages(record);
    existing.push({
        senderId: payload.senderId || null,
        senderRole: payload.senderRole || 'user',
        senderName: payload.senderName || '',
        text: payload.text,
        messageType: payload.messageType || 'normal',
        isInternal: !!payload.isInternal,
        usedAiAssist: !!payload.usedAiAssist,
        createdAt: payload.createdAt || new Date(),
    });
    record.messages = existing;
    if (!payload.isInternal) {
        record.lastMessage = payload.text;
        record.lastMessageSenderRole = payload.senderRole || '';
    }
    record.updatedAt = new Date();
    return existing;
}

function canSendMessage(access, record, userId) {
    if (record.workflowStatus === 'CLOSED') return false;

    if (access === 'asker') {
        return (
            record.status === 'answered' ||
            record.escalatedToDoctor ||
            record.workflowStatus === 'WAITING_CUSTOMER_INFORMATION' ||
            record.workflowStatus === 'ANSWERED' ||
            record.workflowStatus === 'DOCTOR_REVIEWING' ||
            record.workflowStatus === 'WAITING_DOCTOR_RESPONSE'
        );
    }

    if (access === 'staff' && (record.targetRole === 'staff' || record.escalatedToDoctor || record.workflowStatus === 'TRANSFERRED_BACK')) {
        return true;
    }

    if (access === 'doctor') {
        if (record.assignedDoctorId && String(record.assignedDoctorId) !== String(userId)) {
            // Allow if unassigned escalated or direct doctor queue
            if (!(record.escalatedToDoctor && !record.assignedDoctorId) && record.targetRole !== 'doctor') {
                return false;
            }
        }
        if (record.escalatedToDoctor) return true;
        if (record.targetRole === 'doctor') return true;
    }

    return false;
}

async function resolveConversationAccess(user, record) {
    const userId = String(user.id);

    if (String(record.askerId) === userId) return 'asker';

    if (user.role === 'staff' && (record.targetRole === 'staff' || record.escalatedToDoctor || record.workflowStatus === 'TRANSFERRED_BACK' || record.workflowStatus === 'REJECTED')) {
        return 'staff';
    }

    if (user.role === 'doctor') {
        const approved = await isApprovedDoctor(user.id);
        if (!approved) return null;

        if (record.assignedDoctorId && String(record.assignedDoctorId) !== userId) {
            // Đã giao bác sĩ khác — không cho bác sĩ ngoài thao tác
            if (record.escalatedToDoctor || record.targetRole === 'doctor') {
                return null;
            }
        }

        if (record.assignedDoctorId && String(record.assignedDoctorId) === userId) return 'doctor';
        if (record.escalatedToDoctor) return 'doctor';
        if (record.targetRole === 'doctor') {
            if (record.status === 'pending' || record.workflowStatus === 'ASSIGNED_TO_DOCTOR' || record.workflowStatus === 'NEW') {
                return 'doctor';
            }
            if (record.answeredBy && String(record.answeredBy) === userId) return 'doctor';
        }
    }

    return null;
}

function rejectIfClosed(record, res) {
    if (record.workflowStatus === 'CLOSED') {
        res.status(400).json({ message: 'Hội thoại đã đóng' });
        return true;
    }
    return false;
}

function rejectIfAssignedToOtherDoctor(record, doctorId, res) {
    if (record.assignedDoctorId && String(record.assignedDoctorId) !== String(doctorId)) {
        res.status(403).json({ message: 'Câu hỏi đã được giao cho bác sĩ khác' });
        return true;
    }
    return false;
}

function canStaffEscalate(record) {
    return (
        record.targetRole === 'staff' &&
        ((!record.escalatedToDoctor && record.status === 'answered') ||
            ['TRANSFERRED_BACK', 'REJECTED'].includes(record.workflowStatus))
    );
}

function formatConversationMeta(record, access, userId) {
    const includeInternal = access === 'doctor' || access === 'staff';
    const messages = buildMessages(record, { includeInternal });
    let partnerName = record.askerName || 'Khách hàng';

    if (access === 'asker') {
        if (record.escalatedToDoctor && record.assignedDoctorName) {
            partnerName = `${record.answeredByName || 'Nhân viên'} & ${record.assignedDoctorName}`;
        } else {
            partnerName = record.answeredByName || (record.targetRole === 'doctor' ? 'Bác sĩ' : 'Nhân viên');
        }
    }

    const enriched = enrichConversation(record.toObject ? record.toObject() : record);

    return {
        ...enriched,
        messages,
        partnerName,
        myRole: access,
        canSend: canSendMessage(access, record, userId),
        canEscalate:
            access === 'staff' &&
            record.targetRole === 'staff' &&
            ((!record.escalatedToDoctor && record.status === 'answered') ||
                ['TRANSFERRED_BACK', 'REJECTED'].includes(record.workflowStatus)),
        canDoctorActions: access === 'doctor' && record.workflowStatus !== 'CLOSED',
    };
}

function doctorQueryForFilter(status) {
    const baseOr = [{ targetRole: 'doctor' }, { escalatedToDoctor: true }, { assignedDoctorId: { $ne: null } }];

    if (!status || status === 'all') {
        return { $or: baseOr };
    }

    // Broad fetch then filter in JS for complex workflow matching
    return { $or: baseOr };
}

class ControllerDoctorInbox {
    async askDoctor(req, res) {
        try {
            const userId = req.user?.id;
            const {
                question,
                targetRole: rawTarget,
                title,
                specialty,
                severity,
                symptomSummary,
            } = req.body;
            const targetRole = rawTarget === 'staff' ? 'staff' : 'doctor';

            if (!canAskAsCustomer(req.user)) {
                return res.status(403).json({ message: 'Chỉ khách hàng và admin mới được gửi câu hỏi' });
            }

            if (!question || !String(question).trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập câu hỏi' });
            }

            const asker = await ModelUser.findById(userId).select('fullname email role isAdmin');
            if (!asker) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            const askerRole = asker.isAdmin ? 'admin' : asker.role;
            const trimmedQuestion = String(question).trim();
            const workflowStatus = targetRole === 'staff' ? 'WAITING_STAFF_REVIEW' : 'ASSIGNED_TO_DOCTOR';

            const record = await ModelDoctorInboxQuestion.create({
                askerId: userId,
                askerRole,
                askerName: asker.fullname || asker.email,
                title: title ? String(title).trim() : trimmedQuestion.slice(0, 80),
                question: trimmedQuestion,
                specialty: specialty ? String(specialty).trim() : '',
                severity: ['mild', 'moderate', 'severe'].includes(severity) ? severity : '',
                symptomSummary: symptomSummary ? String(symptomSummary).trim() : '',
                targetRole,
                source: targetRole === 'staff' ? 'customer_to_staff' : 'customer_to_doctor',
                workflowStatus,
                status: 'pending',
                priority: severity === 'severe' ? 'high' : 'normal',
                doctorUnreadCount: targetRole === 'doctor' ? 1 : 0,
                staffUnreadCount: targetRole === 'staff' ? 1 : 0,
                askerUnreadCount: 0,
                lastMessage: trimmedQuestion,
                lastMessageSenderRole: askerRole,
                messages: [
                    {
                        senderId: userId,
                        senderRole: askerRole,
                        senderName: asker.fullname || asker.email,
                        text: trimmedQuestion,
                        messageType: 'normal',
                        isInternal: false,
                        createdAt: new Date(),
                    },
                ],
            });

            if (targetRole === 'doctor') {
                emitDoctorInboxUpdate(req, { type: 'new_question', conversationId: String(record._id) });
            } else {
                emitStaffInboxUpdate(req, { type: 'new_question', conversationId: String(record._id) });
            }

            const recipientLabel = targetRole === 'staff' ? 'nhân viên' : 'bác sĩ';
            return res.status(201).json({
                message: `Đã gửi câu hỏi tới ${recipientLabel}. Vui lòng chờ phản hồi.`,
                data: enrichConversation(record.toObject()),
            });
        } catch (error) {
            console.error('askDoctor error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async getMyQuestions(req, res) {
        try {
            if (!canAskAsCustomer(req.user)) {
                return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
            }

            const userId = req.user?.id;
            const { targetRole: rawTarget } = req.query;
            const targetRole = rawTarget === 'staff' ? 'staff' : 'doctor';

            const questions = await ModelDoctorInboxQuestion.find({ askerId: userId, targetRole })
                .sort({ updatedAt: -1 })
                .limit(50)
                .lean();

            return res.status(200).json(questions.map((q) => enrichConversation(q)));
        } catch (error) {
            console.error('getMyQuestions error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async getUnreadSummaryForDoctor(req, res) {
        try {
            const questions = await loadDoctorVisibleQuestions();
            const { totalUnread, tabCounts } = buildDoctorTabCounts(questions);
            return res.status(200).json({
                totalUnread,
                tabCounts,
                conversationsWithUnread: questions.filter((q) => getDoctorUnread(q) > 0).length,
            });
        } catch (error) {
            console.error('getUnreadSummaryForDoctor error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async getOverviewForDoctor(req, res) {
        try {
            const doctorId = req.user?.id;
            const questions = await loadDoctorVisibleQuestions(
                'title question askerName escalatedByName specialty priority workflowStatus lastMessage lastMessageSenderRole escalatedAt escalatedToDoctor',
            );

            const mine = questions.filter((q) => {
                if (q.assignedDoctorId && String(q.assignedDoctorId) === String(doctorId)) return true;
                if (q.targetRole === 'doctor' || q.escalatedToDoctor) return true;
                return false;
            });

            const { totalUnread } = buildDoctorTabCounts(mine);

            let pending = 0;
            let answered = 0;
            let reviewing = 0;
            let transferredBack = 0;
            let urgent = 0;
            let responseMsSum = 0;
            let responseCount = 0;
            const activities = [];

            for (const q of mine) {
                if (matchesDoctorFilter(q, 'pending')) pending += 1;
                if (matchesDoctorFilter(q, 'reviewing')) reviewing += 1;
                if (matchesDoctorFilter(q, 'answered')) answered += 1;
                if (matchesDoctorFilter(q, 'transferred_back')) transferredBack += 1;
                if (matchesDoctorFilter(q, 'urgent')) urgent += 1;
                if (q.answeredAt && q.createdAt) {
                    const ms = new Date(q.answeredAt) - new Date(q.createdAt);
                    if (ms > 0) {
                        responseMsSum += ms;
                        responseCount += 1;
                    }
                }
            }

            const recentAnswered = [...mine]
                .filter((q) => q.answeredAt)
                .sort((a, b) => new Date(b.answeredAt) - new Date(a.answeredAt))
                .slice(0, 3);
            for (const q of recentAnswered) {
                activities.push({
                    type: 'answered',
                    text: `Đã trả lời câu hỏi của ${q.askerName || 'khách hàng'}`,
                    at: q.answeredAt,
                });
            }
            const recentEscalated = [...mine]
                .filter((q) => q.escalatedAt)
                .sort((a, b) => new Date(b.escalatedAt) - new Date(a.escalatedAt))
                .slice(0, 2);
            for (const q of recentEscalated) {
                activities.push({
                    type: 'escalated',
                    text: `${q.escalatedByName || 'Nhân viên'} chuyển tiếp câu hỏi từ ${q.askerName || 'khách'}`,
                    at: q.escalatedAt,
                });
            }
            activities.sort((a, b) => new Date(b.at) - new Date(a.at));

            const recent = [...mine]
                .filter((q) => matchesDoctorFilter(q, 'pending') || getDoctorUnread(q) > 0 || q.priority === 'urgent')
                .sort((a, b) => {
                    const ua = getDoctorUnread(a);
                    const ub = getDoctorUnread(b);
                    if (ub !== ua) return ub - ua;
                    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
                })
                .slice(0, 8)
                .map((q) => enrichConversation(q));

            const avgResponseMinutes =
                responseCount > 0 ? Math.round(responseMsSum / responseCount / 60000) : null;

            let onTimeCount = 0;
            for (const q of mine) {
                if (!q.answeredAt) continue;
                const start = new Date(q.escalatedAt || q.createdAt);
                const end = new Date(q.answeredAt);
                const minutes = (end - start) / 60000;
                if (minutes >= 0 && minutes <= 60) onTimeCount += 1;
            }
            const answeredWithTime = mine.filter((q) => q.answeredAt).length;
            const onTimeRate =
                answeredWithTime > 0 ? Math.round((onTimeCount / answeredWithTime) * 100) : null;

            return res.status(200).json({
                stats: {
                    assignedTotal: mine.length,
                    unread: totalUnread,
                    pending,
                    reviewing,
                    answered,
                    transferredBack,
                    urgent,
                    avgRating: null,
                    avgResponseMinutes,
                    onTimeRate,
                },
                recent,
                activities: activities.slice(0, 6),
                workflowLabels: WORKFLOW_LABELS,
            });
        } catch (error) {
            console.error('getOverviewForDoctor error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async listApprovedDoctors(req, res) {
        try {
            const profiles = await ModelDoctorProfile.find({ status: 'approved' })
                .select('userId specialty hospital')
                .lean();
            const userIds = profiles.map((p) => p.userId);
            const users = await ModelUser.find({ _id: { $in: userIds } })
                .select('fullname email')
                .lean();
            const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

            const data = profiles
                .map((p) => {
                    const u = userMap[String(p.userId)];
                    if (!u) return null;
                    return {
                        doctorId: String(p.userId),
                        fullname: u.fullname || u.email,
                        email: u.email,
                        specialty: p.specialty || '',
                        hospital: p.hospital || '',
                    };
                })
                .filter(Boolean);

            return res.status(200).json({ data });
        } catch (error) {
            console.error('listApprovedDoctors error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async markConversationRead(req, res) {
        try {
            const doctorId = req.user?.id;
            const { id } = req.params;

            const approved = await isApprovedDoctor(doctorId);
            if (!approved) {
                return res.status(403).json({ message: 'Chỉ bác sĩ đã được duyệt chứng chỉ mới xem hộp thư' });
            }

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });

            const access = await resolveConversationAccess(req.user, record);
            if (access !== 'doctor') {
                return res.status(403).json({ message: 'Bạn không có quyền xem hội thoại này' });
            }
            if (
                record.assignedDoctorId &&
                String(record.assignedDoctorId) !== String(doctorId)
            ) {
                return res.status(403).json({ message: 'Câu hỏi đã được giao cho bác sĩ khác' });
            }

            const previousUnread = getDoctorUnread(record);
            record.doctorUnreadCount = 0;
            record.doctorLastReadAt = new Date();
            if (!record.firstViewedByDoctorAt) {
                record.firstViewedByDoctorAt = new Date();
            }
            if (
                record.workflowStatus !== 'CLOSED' &&
                ['ASSIGNED_TO_DOCTOR', 'NEW', 'WAITING_DOCTOR_RESPONSE', 'WAITING_DOCTOR_ASSIGNMENT'].includes(
                    resolveWorkflowStatus(record),
                )
            ) {
                record.workflowStatus = 'DOCTOR_REVIEWING';
            }
            await record.save();

            emitDoctorInboxUpdate(req, {
                type: 'read',
                conversationId: String(record._id),
                previousUnread,
            });
            emitStaffInboxUpdate(req, {
                type: 'doctor_viewed',
                conversationId: String(record._id),
            });

            const questions = await loadDoctorVisibleQuestions();
            const { totalUnread, tabCounts } = buildDoctorTabCounts(questions);

            return res.status(200).json({
                message: 'Đã đánh dấu đã đọc',
                data: {
                    conversationId: String(record._id),
                    unreadCount: 0,
                    totalUnread,
                    tabCounts,
                    doctorViewed: true,
                },
            });
        } catch (error) {
            console.error('markConversationRead error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async getInboxForDoctor(req, res) {
        try {
            const { status, q: search } = req.query;
            const query = doctorQueryForFilter(status);
            let questions = await ModelDoctorInboxQuestion.find(query)
                .sort({ priority: -1, doctorUnreadCount: -1, updatedAt: -1, createdAt: -1 })
                .limit(200)
                .lean();

            if (status && status !== 'all') {
                questions = questions.filter((item) => matchesDoctorFilter(item, status));
            }

            if (search && String(search).trim()) {
                const term = String(search).trim().toLowerCase();
                questions = questions.filter((item) => {
                    const hay = [
                        item.askerName,
                        item.title,
                        item.question,
                        item.lastMessage,
                        item.specialty,
                        item.escalatedByName,
                        String(item._id),
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase();
                    return hay.includes(term);
                });
            }

            questions = questions.slice(0, 100);

            const askerIds = [...new Set(questions.map((q) => String(q.askerId)))];
            const askers = await ModelUser.find({ _id: { $in: askerIds } })
                .select('fullname email role')
                .lean();
            const askerMap = Object.fromEntries(askers.map((a) => [String(a._id), a]));
            const roleLabels = { user: 'Khách hàng', staff: 'Nhân viên', admin: 'Admin' };

            const data = questions.map((q) => ({
                ...enrichConversation(q),
                asker: askerMap[String(q.askerId)] || null,
                askerRoleLabel: roleLabels[q.askerRole] || q.askerRole,
            }));

            const allVisible = await loadDoctorVisibleQuestions();
            const { totalUnread, tabCounts } = buildDoctorTabCounts(allVisible);

            const pendingCount = allVisible.filter((q) => matchesDoctorFilter(q, 'pending')).length;

            return res.status(200).json({ data, pendingCount, totalUnread, tabCounts });
        } catch (error) {
            console.error('getInboxForDoctor error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async answerQuestion(req, res) {
        try {
            const doctorId = req.user?.id;
            const { id } = req.params;
            const { answer, usedAiAssist } = req.body;

            const approved = await isApprovedDoctor(doctorId);
            if (!approved) {
                return res.status(403).json({ message: 'Chỉ bác sĩ đã được duyệt chứng chỉ mới trả lời câu hỏi' });
            }

            if (!answer || !String(answer).trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập câu trả lời' });
            }

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });

            if (record.workflowStatus === 'CLOSED') {
                return res.status(400).json({ message: 'Hội thoại đã đóng' });
            }

            const access = await resolveConversationAccess(req.user, record);
            if (access !== 'doctor') {
                return res.status(403).json({ message: 'Bạn không có quyền trả lời hội thoại này' });
            }
            if (
                record.assignedDoctorId &&
                String(record.assignedDoctorId) !== String(doctorId)
            ) {
                return res.status(403).json({ message: 'Câu hỏi đã được giao cho bác sĩ khác' });
            }

            const doctor = await ModelUser.findById(doctorId).select('fullname email');
            const doctorName = doctor?.fullname || doctor?.email || 'Bác sĩ';
            const trimmedAnswer = String(answer).trim();
            const now = new Date();

            appendMessage(record, {
                senderId: doctorId,
                senderRole: 'doctor',
                senderName: doctorName,
                text: trimmedAnswer,
                messageType: 'normal',
                usedAiAssist: !!usedAiAssist,
                createdAt: now,
            });

            record.answer = trimmedAnswer;
            record.answeredBy = doctorId;
            record.answeredByName = doctorName;
            record.assignedDoctorId = doctorId;
            record.assignedDoctorName = doctorName;
            record.status = 'answered';
            record.workflowStatus = 'ANSWERED';
            record.needsReply = false;
            record.lastMessage = trimmedAnswer;
            record.lastMessageSenderRole = 'doctor';
            record.answeredAt = now;
            record.updatedAt = now;
            record.doctorUnreadCount = 0;
            record.doctorLastReadAt = now;
            record.askerUnreadCount = (record.askerUnreadCount || 0) + 1;
            record.staffUnreadCount = record.escalatedToDoctor ? (record.staffUnreadCount || 0) + 1 : record.staffUnreadCount;

            await record.save();

            emitDoctorInboxUpdate(req, { type: 'answered', conversationId: String(record._id) });
            if (record.escalatedToDoctor || record.targetRole === 'staff') {
                emitStaffInboxUpdate(req, { type: 'answered', conversationId: String(record._id) });
            }

            return res.status(200).json({
                message: 'Đã gửi câu trả lời cho khách hàng',
                data: enrichConversation(record.toObject()),
            });
        } catch (error) {
            console.error('answerQuestion error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async requestMoreInfo(req, res) {
        try {
            const doctorId = req.user?.id;
            const { id } = req.params;
            const { message } = req.body;

            if (!(await isApprovedDoctor(doctorId))) {
                return res.status(403).json({ message: 'Không có quyền' });
            }

            const text =
                message && String(message).trim()
                    ? String(message).trim()
                    : 'Vui lòng bổ sung thêm thông tin để bác sĩ tư vấn chính xác hơn.';

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });
            if (rejectIfClosed(record, res)) return;

            const access = await resolveConversationAccess(req.user, record);
            if (access !== 'doctor') {
                return res.status(403).json({ message: 'Không có quyền thao tác hội thoại này' });
            }
            if (rejectIfAssignedToOtherDoctor(record, doctorId, res)) return;

            const doctor = await ModelUser.findById(doctorId).select('fullname email');
            const doctorName = doctor?.fullname || doctor?.email || 'Bác sĩ';
            const now = new Date();

            appendMessage(record, {
                senderId: doctorId,
                senderRole: 'doctor',
                senderName: doctorName,
                text: `📋 Yêu cầu bổ sung: ${text}`,
                messageType: 'request_info',
                createdAt: now,
            });

            record.workflowStatus = 'WAITING_CUSTOMER_INFORMATION';
            record.needsReply = false;
            record.askerUnreadCount = (record.askerUnreadCount || 0) + 1;
            record.doctorUnreadCount = 0;
            record.doctorLastReadAt = now;
            record.updatedAt = now;
            if (!record.assignedDoctorId) {
                record.assignedDoctorId = doctorId;
                record.assignedDoctorName = doctorName;
            }
            await record.save();

            emitDoctorInboxUpdate(req, { type: 'request_info', conversationId: String(record._id) });
            return res.status(200).json({ message: 'Đã gửi yêu cầu bổ sung thông tin', data: enrichConversation(record.toObject()) });
        } catch (error) {
            console.error('requestMoreInfo error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async transferBackToStaff(req, res) {
        try {
            const doctorId = req.user?.id;
            const { id } = req.params;
            const { note } = req.body;

            if (!(await isApprovedDoctor(doctorId))) {
                return res.status(403).json({ message: 'Không có quyền' });
            }

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });
            if (rejectIfClosed(record, res)) return;

            const access = await resolveConversationAccess(req.user, record);
            if (access !== 'doctor') {
                return res.status(403).json({ message: 'Không có quyền thao tác hội thoại này' });
            }
            if (rejectIfAssignedToOtherDoctor(record, doctorId, res)) return;

            const doctor = await ModelUser.findById(doctorId).select('fullname email');
            const doctorName = doctor?.fullname || doctor?.email || 'Bác sĩ';
            const noteText = note && String(note).trim() ? String(note).trim() : 'Vui lòng hỗ trợ tiếp khách hàng.';
            const now = new Date();

            appendMessage(record, {
                senderId: doctorId,
                senderRole: 'doctor',
                senderName: doctorName,
                text: `↩️ Bác sĩ chuyển lại nhân viên: ${noteText}`,
                messageType: 'system',
                isInternal: true,
                createdAt: now,
            });

            record.workflowStatus = 'TRANSFERRED_BACK';
            record.transferBackNote = noteText;
            record.needsReply = true;
            // Cho phép staff escalate lại: không còn "đang giữ" ở phía bác sĩ
            record.escalatedToDoctor = false;
            record.assignedDoctorId = null;
            record.assignedDoctorName = '';
            record.staffUnreadCount = (record.staffUnreadCount || 0) + 1;
            record.doctorUnreadCount = 0;
            record.updatedAt = now;
            await record.save();

            emitDoctorInboxUpdate(req, { type: 'transfer_back', conversationId: String(record._id) });
            emitStaffInboxUpdate(req, { type: 'transfer_back', conversationId: String(record._id) });

            return res.status(200).json({ message: 'Đã chuyển lại cho nhân viên', data: enrichConversation(record.toObject()) });
        } catch (error) {
            console.error('transferBackToStaff error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async rejectQuestion(req, res) {
        try {
            const doctorId = req.user?.id;
            const { id } = req.params;
            const { reasonCode, note } = req.body;

            if (!(await isApprovedDoctor(doctorId))) {
                return res.status(403).json({ message: 'Không có quyền' });
            }

            if (!reasonCode || !REJECT_REASONS[reasonCode]) {
                return res.status(400).json({
                    message: 'Vui lòng chọn lý do từ chối',
                    reasons: REJECT_REASONS,
                });
            }

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });
            if (rejectIfClosed(record, res)) return;

            const access = await resolveConversationAccess(req.user, record);
            if (access !== 'doctor') {
                return res.status(403).json({ message: 'Không có quyền thao tác hội thoại này' });
            }
            if (rejectIfAssignedToOtherDoctor(record, doctorId, res)) return;

            const doctor = await ModelUser.findById(doctorId).select('fullname email');
            const doctorName = doctor?.fullname || doctor?.email || 'Bác sĩ';
            const reasonLabel = REJECT_REASONS[reasonCode];
            const extra = note && String(note).trim() ? ` — ${String(note).trim()}` : '';
            const now = new Date();

            appendMessage(record, {
                senderId: doctorId,
                senderRole: 'doctor',
                senderName: doctorName,
                text: `⛔ Từ chối xử lý: ${reasonLabel}${extra}`,
                messageType: 'system',
                isInternal: true,
                createdAt: now,
            });

            record.workflowStatus = 'REJECTED';
            record.rejectReason = `${reasonCode}:${reasonLabel}${extra}`;
            record.needsReply = true;
            record.escalatedToDoctor = false;
            record.assignedDoctorId = null;
            record.assignedDoctorName = '';
            record.staffUnreadCount = (record.staffUnreadCount || 0) + 1;
            record.doctorUnreadCount = 0;
            record.updatedAt = now;
            await record.save();

            emitDoctorInboxUpdate(req, { type: 'rejected', conversationId: String(record._id) });
            emitStaffInboxUpdate(req, { type: 'rejected', conversationId: String(record._id) });

            return res.status(200).json({ message: 'Đã từ chối và chuyển về nhân viên', data: enrichConversation(record.toObject()) });
        } catch (error) {
            console.error('rejectQuestion error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async markUrgent(req, res) {
        try {
            const doctorId = req.user?.id;
            const { id } = req.params;

            if (!(await isApprovedDoctor(doctorId))) {
                return res.status(403).json({ message: 'Không có quyền' });
            }

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });
            if (rejectIfClosed(record, res)) return;

            const access = await resolveConversationAccess(req.user, record);
            if (access !== 'doctor') {
                return res.status(403).json({ message: 'Không có quyền thao tác hội thoại này' });
            }
            if (rejectIfAssignedToOtherDoctor(record, doctorId, res)) return;

            const doctor = await ModelUser.findById(doctorId).select('fullname email');
            const doctorName = doctor?.fullname || doctor?.email || 'Bác sĩ';
            const now = new Date();

            record.priority = 'urgent';
            if (record.workflowStatus !== 'CLOSED') {
                // Keep current workflow but flag urgent via priority; optionally stamp URGENT if still pending
                if (['NEW', 'ASSIGNED_TO_DOCTOR', 'DOCTOR_REVIEWING', 'WAITING_DOCTOR_RESPONSE'].includes(resolveWorkflowStatus(record))) {
                    record.workflowStatus = 'URGENT';
                }
            }

            appendMessage(record, {
                senderId: doctorId,
                senderRole: 'system',
                senderName: 'Hệ thống',
                text: `🚨 Bác sĩ ${doctorName} đã đánh dấu câu hỏi này là KHẨN CẤP. Không chỉ tư vấn trực tuyến — hãy hướng dẫn liên hệ cơ sở y tế / cấp cứu nếu cần.`,
                messageType: 'system',
                createdAt: now,
            });

            record.staffUnreadCount = (record.staffUnreadCount || 0) + 1;
            record.updatedAt = now;
            await record.save();

            emitDoctorInboxUpdate(req, { type: 'urgent', conversationId: String(record._id) });
            emitStaffInboxUpdate(req, { type: 'urgent', conversationId: String(record._id) });

            return res.status(200).json({ message: 'Đã đánh dấu khẩn cấp', data: enrichConversation(record.toObject()) });
        } catch (error) {
            console.error('markUrgent error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async closeConversation(req, res) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const role = req.user?.role;

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });

            if (role === 'doctor' && !(await isApprovedDoctor(userId))) {
                return res.status(403).json({ message: 'Không có quyền' });
            }
            if (role !== 'doctor' && role !== 'staff') {
                return res.status(403).json({ message: 'Không có quyền đóng hội thoại' });
            }

            const access = await resolveConversationAccess(req.user, record);
            if (access !== 'doctor' && access !== 'staff') {
                return res.status(403).json({ message: 'Không có quyền đóng hội thoại này' });
            }
            if (rejectIfClosed(record, res)) return;
            if (access === 'staff' && isDoctorOwned(record)) {
                return res.status(400).json({
                    message: 'Không thể đóng — câu hỏi đang do bác sĩ xử lý',
                });
            }
            if (access === 'doctor' && rejectIfAssignedToOtherDoctor(record, userId, res)) return;

            const user = await ModelUser.findById(userId).select('fullname email');
            const name = user?.fullname || user?.email || role;
            const now = new Date();

            appendMessage(record, {
                senderId: userId,
                senderRole: 'system',
                senderName: 'Hệ thống',
                text: `✅ Cuộc hội thoại đã được đóng bởi ${name}.`,
                messageType: 'system',
                createdAt: now,
            });

            record.workflowStatus = 'CLOSED';
            record.closedAt = now;
            record.closedBy = userId;
            record.closedByName = name;
            record.needsReply = false;
            record.updatedAt = now;
            await record.save();

            emitDoctorInboxUpdate(req, { type: 'closed', conversationId: String(record._id) });
            emitStaffInboxUpdate(req, { type: 'closed', conversationId: String(record._id) });

            return res.status(200).json({ message: 'Đã đóng hội thoại', data: enrichConversation(record.toObject()) });
        } catch (error) {
            console.error('closeConversation error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async addInternalNote(req, res) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const { note } = req.body;
            const role = req.user?.role;

            if (!note || !String(note).trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập ghi chú' });
            }

            if (role !== 'doctor' && role !== 'staff') {
                return res.status(403).json({ message: 'Không có quyền' });
            }

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });

            const access = await resolveConversationAccess(req.user, record);
            if (access !== 'doctor' && access !== 'staff') {
                return res.status(403).json({ message: 'Không có quyền ghi chú trên hội thoại này' });
            }

            const user = await ModelUser.findById(userId).select('fullname email');
            const name = user?.fullname || user?.email || role;
            const now = new Date();

            appendMessage(record, {
                senderId: userId,
                senderRole: role,
                senderName: name,
                text: String(note).trim(),
                messageType: 'internal',
                isInternal: true,
                createdAt: now,
            });

            if (role === 'doctor') {
                record.staffUnreadCount = (record.staffUnreadCount || 0) + 1;
            } else {
                record.doctorUnreadCount = (record.doctorUnreadCount || 0) + 1;
            }
            record.updatedAt = now;
            await record.save();

            emitDoctorInboxUpdate(req, { type: 'internal_note', conversationId: String(record._id) });
            emitStaffInboxUpdate(req, { type: 'internal_note', conversationId: String(record._id) });

            return res.status(200).json({ message: 'Đã thêm ghi chú nội bộ', data: enrichConversation(record.toObject()) });
        } catch (error) {
            console.error('addInternalNote error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async getInboxForStaff(req, res) {
        try {
            const { status } = req.query;
            const filter = {
                $or: [
                    { targetRole: 'staff' },
                    { workflowStatus: { $in: ['TRANSFERRED_BACK', 'REJECTED'] } },
                    { escalatedToDoctor: true },
                ],
            };

            if (status === 'pending') {
                filter.$and = [
                    {
                        $or: [
                            { status: 'pending' },
                            { needsReply: true },
                            {
                                workflowStatus: {
                                    $in: ['WAITING_STAFF_REVIEW', 'TRANSFERRED_BACK', 'REJECTED', 'NEW'],
                                },
                            },
                        ],
                    },
                    {
                        $or: [
                            { escalatedToDoctor: { $ne: true } },
                            { workflowStatus: { $in: ['TRANSFERRED_BACK', 'REJECTED'] } },
                        ],
                    },
                ];
            } else if (status === 'answered') {
                filter.status = 'answered';
                filter.needsReply = { $ne: true };
            }

            let questions = await ModelDoctorInboxQuestion.find(filter)
                .sort({ updatedAt: -1 })
                .limit(100)
                .lean();

            if (status === 'pending') {
                questions = questions.filter(matchesStaffPending);
            }

            const askerIds = [...new Set(questions.map((q) => String(q.askerId)))];
            const askers = await ModelUser.find({ _id: { $in: askerIds } })
                .select('fullname email role')
                .lean();
            const askerMap = Object.fromEntries(askers.map((a) => [String(a._id), a]));
            const roleLabels = { user: 'Khách hàng', staff: 'Nhân viên', admin: 'Admin' };

            const data = questions.map((q) => ({
                ...enrichConversation(q),
                asker: askerMap[String(q.askerId)] || null,
                askerRoleLabel: roleLabels[q.askerRole] || q.askerRole,
                staffUnread: getStaffUnread(q),
                doctorViewed: !!q.firstViewedByDoctorAt || !!q.doctorLastReadAt,
            }));

            const pendingCandidates = await ModelDoctorInboxQuestion.find({
                $or: [
                    { targetRole: 'staff', $or: [{ status: 'pending' }, { needsReply: true }] },
                    { workflowStatus: { $in: ['TRANSFERRED_BACK', 'REJECTED'] } },
                ],
            })
                .select(
                    'targetRole status needsReply workflowStatus escalatedToDoctor priority assignedDoctorId firstViewedByDoctorAt doctorLastReadAt',
                )
                .lean();
            const pendingCount = pendingCandidates.filter(matchesStaffPending).length;

            return res.status(200).json({ data, pendingCount });
        } catch (error) {
            console.error('getInboxForStaff error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async answerQuestionForStaff(req, res) {
        try {
            const staffId = req.user?.id;
            const { id } = req.params;
            const { answer } = req.body;

            if (!answer || !String(answer).trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập câu trả lời' });
            }

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });

            if (record.workflowStatus === 'CLOSED') {
                return res.status(400).json({ message: 'Hội thoại đã đóng' });
            }

            const access = await resolveConversationAccess(req.user, record);
            if (access !== 'staff') {
                return res.status(403).json({ message: 'Bạn không có quyền trả lời hội thoại này' });
            }

            // Case đang bác sĩ giữ — staff không được ghi đè
            if (isDoctorOwned(record)) {
                return res.status(400).json({
                    message: 'Câu hỏi đang do bác sĩ xử lý. Chờ chuyển lại hoặc escalate xong.',
                });
            }

            if (
                record.targetRole !== 'staff' &&
                !['TRANSFERRED_BACK', 'REJECTED'].includes(record.workflowStatus)
            ) {
                return res.status(400).json({ message: 'Câu hỏi này không thuộc hộp thư nhân viên' });
            }

            const staff = await ModelUser.findById(staffId).select('fullname email');
            const staffName = staff?.fullname || staff?.email || 'Nhân viên';
            const trimmedAnswer = String(answer).trim();
            const now = new Date();

            appendMessage(record, {
                senderId: staffId,
                senderRole: 'staff',
                senderName: staffName,
                text: trimmedAnswer,
                createdAt: now,
            });

            record.answer = trimmedAnswer;
            record.answeredBy = staffId;
            record.answeredByName = staffName;
            record.assignedStaffId = staffId;
            record.assignedStaffName = staffName;
            record.status = 'answered';
            record.workflowStatus = 'ANSWERED';
            record.needsReply = false;
            record.lastMessage = trimmedAnswer;
            record.lastMessageSenderRole = 'staff';
            record.answeredAt = now;
            record.updatedAt = now;
            record.staffUnreadCount = 0;
            record.staffLastReadAt = now;
            record.askerUnreadCount = (record.askerUnreadCount || 0) + 1;
            await record.save();

            emitStaffInboxUpdate(req, { type: 'answered', conversationId: String(record._id) });

            return res.status(200).json({
                message: 'Đã gửi câu trả lời cho khách hàng',
                data: enrichConversation(record.toObject()),
            });
        } catch (error) {
            console.error('answerQuestionForStaff error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async getConversation(req, res) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });

            const access = await resolveConversationAccess(req.user, record);
            if (!access) {
                return res.status(403).json({ message: 'Bạn không có quyền xem cuộc trò chuyện này' });
            }

            return res.status(200).json({
                data: formatConversationMeta(record, access, userId),
            });
        } catch (error) {
            console.error('getConversation error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async escalateToDoctor(req, res) {
        try {
            const staffId = req.user?.id;
            const { id } = req.params;
            const { note, doctorId, specialty, priority, deadline } = req.body;

            if (req.user?.role !== 'staff') {
                return res.status(403).json({ message: 'Chỉ nhân viên mới được chuyển tiếp cho bác sĩ' });
            }

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
            if (rejectIfClosed(record, res)) return;

            const access = await resolveConversationAccess(req.user, record);
            if (access !== 'staff') {
                return res.status(403).json({ message: 'Không có quyền chuyển tiếp hội thoại này' });
            }

            if (!canStaffEscalate(record)) {
                return res.status(400).json({
                    message: 'Chưa đủ điều kiện chuyển bác sĩ (cần đã trả lời, hoặc được chuyển lại/từ chối)',
                });
            }

            if (record.escalatedToDoctor && record.workflowStatus !== 'TRANSFERRED_BACK' && record.workflowStatus !== 'REJECTED') {
                return res.status(400).json({ message: 'Cuộc trò chuyện đã được chuyển cho bác sĩ' });
            }

            const staff = await ModelUser.findById(staffId).select('fullname email');
            const staffName = staff?.fullname || staff?.email || 'Nhân viên';
            const noteText =
                note && String(note).trim() ? String(note).trim() : 'Câu hỏi liên quan triệu chứng/sức khỏe';
            const now = new Date();

            let assignedDoctorName = '';
            if (doctorId) {
                const approved = await isApprovedDoctor(doctorId);
                if (!approved) {
                    return res.status(400).json({ message: 'Bác sĩ được chọn chưa được duyệt hoặc không tồn tại' });
                }
                const docUser = await ModelUser.findById(doctorId).select('fullname email');
                assignedDoctorName = docUser?.fullname || docUser?.email || 'Bác sĩ';
                record.assignedDoctorId = doctorId;
                record.assignedDoctorName = assignedDoctorName;
            }

            if (specialty) record.specialty = String(specialty).trim();
            if (['normal', 'high', 'urgent'].includes(priority)) {
                record.priority = priority;
            }
            if (deadline) {
                const d = new Date(deadline);
                if (!Number.isNaN(d.getTime())) record.responseDeadline = d;
            }

            const systemText =
                `📋 Nhân viên ${staffName} đã chuyển cuộc trò chuyện cho bác sĩ tư vấn` +
                `${assignedDoctorName ? ` (${assignedDoctorName})` : ''}.\n` +
                `Lý do: ${noteText}\n` +
                `Khách hàng, nhân viên và bác sĩ đều có thể theo dõi tiếp trong cuộc chat này.`;

            appendMessage(record, {
                senderId: staffId,
                senderRole: 'system',
                senderName: 'Hệ thống',
                text: systemText,
                messageType: 'escalation',
                createdAt: now,
            });

            if (noteText) {
                appendMessage(record, {
                    senderId: staffId,
                    senderRole: 'staff',
                    senderName: staffName,
                    text: noteText,
                    messageType: 'internal',
                    isInternal: true,
                    createdAt: now,
                });
            }

            record.escalatedToDoctor = true;
            record.escalatedAt = now;
            record.escalatedBy = staffId;
            record.escalatedByName = staffName;
            record.escalationNote = noteText;
            record.source = 'staff_escalation';
            record.workflowStatus = record.priority === 'urgent' ? 'URGENT' : 'ASSIGNED_TO_DOCTOR';
            record.needsReply = true;
            record.updatedAt = now;
            record.doctorUnreadCount = (record.doctorUnreadCount || 0) + 1;
            record.assignedStaffId = staffId;
            record.assignedStaffName = staffName;

            await record.save();

            emitDoctorInboxUpdate(req, { type: 'escalated', conversationId: String(record._id) });
            emitStaffInboxUpdate(req, { type: 'escalated', conversationId: String(record._id) });

            return res.status(200).json({
                message: 'Đã chuyển cuộc trò chuyện cho bác sĩ. Bác sĩ sẽ tiếp tục tư vấn với khách hàng.',
                data: enrichConversation(record.toObject()),
            });
        } catch (error) {
            console.error('escalateToDoctor error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async sendMessage(req, res) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const { message, usedAiAssist, isInternal } = req.body;

            if (!message || !String(message).trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập tin nhắn' });
            }

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });

            if (record.workflowStatus === 'CLOSED') {
                return res.status(400).json({ message: 'Hội thoại đã đóng' });
            }

            const access = await resolveConversationAccess(req.user, record);
            if (!access) {
                return res.status(403).json({ message: 'Bạn không có quyền gửi tin nhắn' });
            }

            const wantInternal = !!isInternal && (access === 'doctor' || access === 'staff');

            if (access === 'staff' && isDoctorOwned(record) && !wantInternal) {
                return res.status(400).json({
                    message: 'Case đang bác sĩ xử lý — chỉ gửi ghi chú nội bộ được phép',
                });
            }

            if (!wantInternal && !canSendMessage(access, record, userId)) {
                return res.status(403).json({ message: 'Bạn không thể gửi tin nhắn trong cuộc trò chuyện này' });
            }

            if (
                access === 'asker' &&
                record.status !== 'answered' &&
                !record.escalatedToDoctor &&
                record.workflowStatus !== 'WAITING_CUSTOMER_INFORMATION'
            ) {
                return res.status(400).json({ message: 'Vui lòng chờ bác sĩ/nhân viên trả lời trước' });
            }

            const sender = await ModelUser.findById(userId).select('fullname email role');
            const trimmed = String(message).trim();
            const now = new Date();

            let senderRole = access;
            if (access === 'asker') {
                senderRole = record.askerRole || sender?.role || 'user';
            }

            const senderName =
                sender?.fullname || sender?.email || (access === 'asker' ? 'Khách hàng' : 'Hỗ trợ');

            const existingMessages = appendMessage(record, {
                senderId: userId,
                senderRole,
                senderName,
                text: trimmed,
                messageType: wantInternal ? 'internal' : 'normal',
                isInternal: wantInternal,
                usedAiAssist: access === 'doctor' && !!usedAiAssist,
                createdAt: now,
            });

            if (wantInternal) {
                if (access === 'doctor') record.staffUnreadCount = (record.staffUnreadCount || 0) + 1;
                if (access === 'staff') record.doctorUnreadCount = (record.doctorUnreadCount || 0) + 1;
            } else if (access === 'asker') {
                record.needsReply = true;
                // Khách phản hồi sau khi đã trả lời / đang xem / yêu cầu bổ sung → quay lại chờ xử lý
                if (
                    [
                        'WAITING_CUSTOMER_INFORMATION',
                        'ANSWERED',
                        'DOCTOR_REVIEWING',
                    ].includes(record.workflowStatus) ||
                    record.status === 'answered'
                ) {
                    if (record.targetRole === 'doctor' || record.escalatedToDoctor) {
                        record.workflowStatus = 'WAITING_DOCTOR_RESPONSE';
                    } else {
                        record.workflowStatus = 'WAITING_STAFF_REVIEW';
                    }
                    if (record.status === 'answered') {
                        record.status = 'pending';
                    }
                }
                if (record.targetRole === 'doctor' || record.escalatedToDoctor) {
                    record.doctorUnreadCount = (record.doctorUnreadCount || 0) + 1;
                }
                if (record.targetRole === 'staff' || record.escalatedToDoctor) {
                    record.staffUnreadCount = (record.staffUnreadCount || 0) + 1;
                }
            } else if (access === 'doctor') {
                if (record.escalatedToDoctor && !record.assignedDoctorId) {
                    const claimed = await ModelDoctorInboxQuestion.findOneAndUpdate(
                        {
                            _id: record._id,
                            $or: [{ assignedDoctorId: null }, { assignedDoctorId: { $exists: false } }],
                        },
                        { $set: { assignedDoctorId: userId, assignedDoctorName: senderName } },
                        { new: true },
                    );
                    if (!claimed) {
                        const fresh = await ModelDoctorInboxQuestion.findById(record._id).select('assignedDoctorId');
                        if (fresh?.assignedDoctorId && String(fresh.assignedDoctorId) !== String(userId)) {
                            return res.status(403).json({ message: 'Câu hỏi đã được bác sĩ khác nhận xử lý' });
                        }
                    }
                    record.assignedDoctorId = userId;
                    record.assignedDoctorName = senderName;
                }
                record.needsReply = false;
                record.workflowStatus = 'ANSWERED';
                record.status = 'answered';
                record.answeredBy = userId;
                record.answeredByName = senderName;
                record.answeredAt = record.answeredAt || now;
                record.answer = trimmed;
                record.doctorUnreadCount = 0;
                record.doctorLastReadAt = now;
                record.askerUnreadCount = (record.askerUnreadCount || 0) + 1;
                if (record.escalatedToDoctor) {
                    record.staffUnreadCount = (record.staffUnreadCount || 0) + 1;
                }
            } else if (access === 'staff') {
                if (isDoctorOwned(record)) {
                    // chỉ ghi chú nội bộ — không đổi workflow
                } else {
                    record.needsReply = false;
                    record.staffUnreadCount = 0;
                    record.staffLastReadAt = now;
                    record.askerUnreadCount = (record.askerUnreadCount || 0) + 1;
                    if (record.status !== 'answered') {
                        record.status = 'answered';
                        record.answeredBy = userId;
                        record.answeredByName = senderName;
                        record.answeredAt = now;
                        record.answer = trimmed;
                        record.workflowStatus = 'ANSWERED';
                    }
                }
            }

            await record.save();

            if (isDoctorVisible(record)) {
                emitDoctorInboxUpdate(req, {
                    type: 'message',
                    conversationId: String(record._id),
                    from: access,
                });
            }
            emitStaffInboxUpdate(req, {
                type: 'message',
                conversationId: String(record._id),
                from: access,
            });

            return res.status(200).json({
                message: 'Đã gửi tin nhắn',
                data: {
                    ...enrichConversation(record.toObject()),
                    messages: existingMessages,
                },
            });
        } catch (error) {
            console.error('sendMessage error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }
}

module.exports = new ControllerDoctorInbox();
