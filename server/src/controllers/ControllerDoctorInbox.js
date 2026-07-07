const ModelDoctorInboxQuestion = require('../models/ModelDoctorInboxQuestion');
const ModelDoctorProfile = require('../models/ModelDoctorProfile');
const ModelUser = require('../models/ModelUser');

const ASKER_ROLES = ['user', 'admin'];

function canAskAsCustomer(user) {
    if (!user) return false;
    const role = user.role;
    if (role === 'doctor' || role === 'staff' || role === 'shipper') {
        return false;
    }
    return ASKER_ROLES.includes(role) || user.isAdmin === true;
}

async function isApprovedDoctor(userId) {
    const profile = await ModelDoctorProfile.findOne({ userId });
    return profile?.status === 'approved';
}

function buildMessages(record) {
    if (Array.isArray(record.messages) && record.messages.length) {
        return record.messages;
    }

    const msgs = [
        {
            senderId: record.askerId,
            senderRole: record.askerRole,
            senderName: record.askerName,
            text: record.question,
            createdAt: record.createdAt,
        },
    ];

    if (record.status === 'answered' && record.answer) {
        msgs.push({
            senderId: record.answeredBy,
            senderRole: record.targetRole === 'staff' ? 'staff' : 'doctor',
            senderName: record.answeredByName,
            text: record.answer,
            createdAt: record.answeredAt || record.updatedAt,
        });
    }

    return msgs;
}

function isResponderRole(role) {
    return role === 'doctor' || role === 'staff';
}

function appendMessage(record, payload) {
    const existing = buildMessages(record);
    existing.push({
        senderId: payload.senderId || null,
        senderRole: payload.senderRole || 'user',
        senderName: payload.senderName || '',
        text: payload.text,
        messageType: payload.messageType || 'normal',
        createdAt: payload.createdAt || new Date(),
    });
    record.messages = existing;
    record.lastMessage = payload.text;
    record.updatedAt = new Date();
    return existing;
}

function canSendMessage(access, record, userId) {
    if (access === 'asker') {
        return record.status === 'answered' || record.escalatedToDoctor;
    }

    if (access === 'staff' && record.targetRole === 'staff') {
        return record.status === 'answered';
    }

    if (access === 'doctor') {
        if (record.escalatedToDoctor) {
            if (!record.assignedDoctorId) return true;
            return String(record.assignedDoctorId) === String(userId);
        }
        if (record.targetRole === 'doctor' && record.status === 'answered') {
            return record.answeredBy && String(record.answeredBy) === String(userId);
        }
    }

    return false;
}

async function resolveConversationAccess(user, record) {
    const userId = String(user.id);

    if (String(record.askerId) === userId) {
        return 'asker';
    }

    if (user.role === 'staff' && record.targetRole === 'staff') {
        return 'staff';
    }

    if (user.role === 'doctor') {
        const approved = await isApprovedDoctor(user.id);
        if (!approved) return null;

        if (record.escalatedToDoctor) {
            return 'doctor';
        }

        if (record.targetRole === 'doctor') {
            if (record.status === 'pending') return 'doctor';
            if (record.answeredBy && String(record.answeredBy) === userId) return 'doctor';
        }
    }

    return null;
}

function formatConversationMeta(record, access, userId) {
    const messages = buildMessages(record);
    let partnerName = record.askerName || 'Khách hàng';

    if (access === 'asker') {
        if (record.escalatedToDoctor && record.assignedDoctorName) {
            partnerName = `${record.answeredByName || 'Nhân viên'} & ${record.assignedDoctorName}`;
        } else {
            partnerName = record.answeredByName || 'Nhân viên';
        }
    }

    return {
        ...record,
        messages,
        partnerName,
        myRole: access,
        canSend: canSendMessage(access, record, userId),
        canEscalate:
            access === 'staff' &&
            record.targetRole === 'staff' &&
            !record.escalatedToDoctor &&
            record.status === 'answered',
    };
}

class ControllerDoctorInbox {
    async askDoctor(req, res) {
        try {
            const userId = req.user?.id;
            const role = req.user?.role;
            const { question, targetRole: rawTarget } = req.body;
            const targetRole = rawTarget === 'staff' ? 'staff' : 'doctor';

            if (!canAskAsCustomer(req.user)) {
                return res.status(403).json({
                    message: 'Chỉ khách hàng và admin mới được gửi câu hỏi',
                });
            }

            if (!question || !String(question).trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập câu hỏi' });
            }

            const asker = await ModelUser.findById(userId).select('fullname email role isAdmin');
            if (!asker) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            const askerRole = asker.isAdmin ? 'admin' : asker.role;

            const record = await ModelDoctorInboxQuestion.create({
                askerId: userId,
                askerRole,
                askerName: asker.fullname || asker.email,
                question: String(question).trim(),
                targetRole,
            });

            const recipientLabel = targetRole === 'staff' ? 'nhân viên' : 'bác sĩ';

            return res.status(201).json({
                message: `Đã gửi câu hỏi tới ${recipientLabel}. Vui lòng chờ phản hồi.`,
                data: record,
            });
        } catch (error) {
            console.error('askDoctor error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async getMyQuestions(req, res) {
        try {
            const userId = req.user?.id;
            const role = req.user?.role;

            if (!canAskAsCustomer(req.user)) {
                return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
            }

            const { targetRole: rawTarget } = req.query;
            const targetRole = rawTarget === 'staff' ? 'staff' : 'doctor';

            const questions = await ModelDoctorInboxQuestion.find({ askerId: userId, targetRole })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();

            return res.status(200).json(questions);
        } catch (error) {
            console.error('getMyQuestions error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async getInboxForDoctor(req, res) {
        try {
            const { status } = req.query;
            let query;

            if (status === 'pending') {
                query = {
                    $or: [
                        { targetRole: 'doctor', $or: [{ status: 'pending' }, { needsReply: true }] },
                        { escalatedToDoctor: true, needsReply: true },
                    ],
                };
            } else if (status === 'escalated') {
                query = { escalatedToDoctor: true };
            } else if (status === 'answered') {
                query = {
                    $or: [
                        {
                            targetRole: 'doctor',
                            status: 'answered',
                            needsReply: { $ne: true },
                        },
                        {
                            escalatedToDoctor: true,
                            needsReply: { $ne: true },
                        },
                    ],
                };
            } else {
                query = {
                    $or: [{ targetRole: 'doctor' }, { escalatedToDoctor: true }],
                };
            }

            const questions = await ModelDoctorInboxQuestion.find(query)
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();

            const askerIds = [...new Set(questions.map((q) => String(q.askerId)))];
            const askers = await ModelUser.find({ _id: { $in: askerIds } })
                .select('fullname email role')
                .lean();
            const askerMap = Object.fromEntries(askers.map((a) => [String(a._id), a]));

            const roleLabels = {
                user: 'Khách hàng',
                staff: 'Nhân viên',
                admin: 'Admin',
            };

            const data = questions.map((q) => ({
                ...q,
                asker: askerMap[String(q.askerId)] || null,
                askerRoleLabel: roleLabels[q.askerRole] || q.askerRole,
                isEscalated: !!q.escalatedToDoctor,
            }));

            const pendingCount = await ModelDoctorInboxQuestion.countDocuments({
                $or: [
                    { targetRole: 'doctor', $or: [{ status: 'pending' }, { needsReply: true }] },
                    { escalatedToDoctor: true, needsReply: true },
                ],
            });

            return res.status(200).json({ data, pendingCount });
        } catch (error) {
            console.error('getInboxForDoctor error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async answerQuestion(req, res) {
        try {
            const doctorId = req.user?.id;
            const { id } = req.params;
            const { answer } = req.body;

            const approved = await isApprovedDoctor(doctorId);
            if (!approved) {
                return res.status(403).json({
                    message: 'Chỉ bác sĩ đã được duyệt chứng chỉ mới trả lời câu hỏi',
                });
            }

            if (!answer || !String(answer).trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập câu trả lời' });
            }

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) {
                return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });
            }

            if (record.targetRole && record.targetRole !== 'doctor') {
                return res.status(400).json({ message: 'Câu hỏi này không thuộc hộp thư bác sĩ' });
            }

            const doctor = await ModelUser.findById(doctorId).select('fullname email');
            const doctorName = doctor?.fullname || doctor?.email || 'Bác sĩ';
            const trimmedAnswer = String(answer).trim();
            const now = new Date();

            record.messages = [
                {
                    senderId: record.askerId,
                    senderRole: record.askerRole,
                    senderName: record.askerName,
                    text: record.question,
                    createdAt: record.createdAt,
                },
                {
                    senderId: doctorId,
                    senderRole: 'doctor',
                    senderName: doctorName,
                    text: trimmedAnswer,
                    createdAt: now,
                },
            ];

            record.answer = trimmedAnswer;
            record.answeredBy = doctorId;
            record.answeredByName = doctorName;
            record.status = 'answered';
            record.needsReply = false;
            record.lastMessage = trimmedAnswer;
            record.answeredAt = now;
            record.updatedAt = now;
            await record.save();

            return res.status(200).json({
                message: 'Đã gửi câu trả lời cho khách hàng',
                data: record,
            });
        } catch (error) {
            console.error('answerQuestion error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async getInboxForStaff(req, res) {
        try {
            const { status } = req.query;
            const filter = { targetRole: 'staff' };

            if (status === 'pending') {
                filter.$or = [{ status: 'pending' }, { needsReply: true }];
            } else if (status === 'answered') {
                filter.status = 'answered';
                filter.needsReply = { $ne: true };
            }

            const questions = await ModelDoctorInboxQuestion.find(filter)
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();

            const askerIds = [...new Set(questions.map((q) => String(q.askerId)))];
            const askers = await ModelUser.find({ _id: { $in: askerIds } })
                .select('fullname email role')
                .lean();
            const askerMap = Object.fromEntries(askers.map((a) => [String(a._id), a]));

            const roleLabels = {
                user: 'Khách hàng',
                staff: 'Nhân viên',
                admin: 'Admin',
            };

            const data = questions.map((q) => ({
                ...q,
                asker: askerMap[String(q.askerId)] || null,
                askerRoleLabel: roleLabels[q.askerRole] || q.askerRole,
                isEscalated: !!q.escalatedToDoctor,
            }));

            const pendingCount = await ModelDoctorInboxQuestion.countDocuments({
                targetRole: 'staff',
                $or: [{ status: 'pending' }, { needsReply: true }],
            });

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
            if (!record) {
                return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });
            }

            if (record.targetRole !== 'staff') {
                return res.status(400).json({ message: 'Câu hỏi này không thuộc hộp thư nhân viên' });
            }

            const staff = await ModelUser.findById(staffId).select('fullname email');
            const staffName = staff?.fullname || staff?.email || 'Nhân viên';
            const trimmedAnswer = String(answer).trim();
            const now = new Date();

            record.messages = [
                {
                    senderId: record.askerId,
                    senderRole: record.askerRole,
                    senderName: record.askerName,
                    text: record.question,
                    createdAt: record.createdAt,
                },
                {
                    senderId: staffId,
                    senderRole: 'staff',
                    senderName: staffName,
                    text: trimmedAnswer,
                    createdAt: now,
                },
            ];

            record.answer = trimmedAnswer;
            record.answeredBy = staffId;
            record.answeredByName = staffName;
            record.status = 'answered';
            record.needsReply = false;
            record.lastMessage = trimmedAnswer;
            record.answeredAt = now;
            record.updatedAt = now;
            await record.save();

            return res.status(200).json({
                message: 'Đã gửi câu trả lời cho khách hàng',
                data: record,
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

            const record = await ModelDoctorInboxQuestion.findById(id).lean();
            if (!record) {
                return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
            }

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
            const { note } = req.body;

            if (req.user?.role !== 'staff') {
                return res.status(403).json({ message: 'Chỉ nhân viên mới được chuyển tiếp cho bác sĩ' });
            }

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) {
                return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
            }

            if (record.targetRole !== 'staff') {
                return res.status(400).json({ message: 'Chỉ chuyển được hội thoại khách hỏi nhân viên' });
            }

            if (record.escalatedToDoctor) {
                return res.status(400).json({ message: 'Cuộc trò chuyện đã được chuyển cho bác sĩ' });
            }

            if (record.status !== 'answered') {
                return res.status(400).json({ message: 'Vui lòng trả lời khách trước khi chuyển cho bác sĩ' });
            }

            const staff = await ModelUser.findById(staffId).select('fullname email');
            const staffName = staff?.fullname || staff?.email || 'Nhân viên';
            const noteText = note && String(note).trim() ? String(note).trim() : 'Câu hỏi liên quan triệu chứng/sức khỏe';
            const now = new Date();

            const systemText =
                `📋 Nhân viên ${staffName} đã chuyển cuộc trò chuyện cho bác sĩ tư vấn.\n` +
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

            record.escalatedToDoctor = true;
            record.escalatedAt = now;
            record.escalatedBy = staffId;
            record.escalatedByName = staffName;
            record.escalationNote = noteText;
            record.needsReply = true;
            record.updatedAt = now;

            await record.save();

            return res.status(200).json({
                message: 'Đã chuyển cuộc trò chuyện cho bác sĩ. Bác sĩ sẽ tiếp tục tư vấn với khách hàng.',
                data: record,
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
            const { message } = req.body;

            if (!message || !String(message).trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập tin nhắn' });
            }

            const record = await ModelDoctorInboxQuestion.findById(id);
            if (!record) {
                return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
            }

            const access = await resolveConversationAccess(req.user, record);
            if (!access) {
                return res.status(403).json({ message: 'Bạn không có quyền gửi tin nhắn' });
            }

            if (!canSendMessage(access, record, userId)) {
                return res.status(403).json({ message: 'Bạn không thể gửi tin nhắn trong cuộc trò chuyện này' });
            }

            if (access === 'asker' && record.status !== 'answered' && !record.escalatedToDoctor) {
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
                messageType: 'normal',
                createdAt: now,
            });

            if (access === 'asker') {
                record.needsReply = true;
            } else if (access === 'doctor') {
                if (record.escalatedToDoctor && !record.assignedDoctorId) {
                    record.assignedDoctorId = userId;
                    record.assignedDoctorName = senderName;
                }
                record.needsReply = false;
            } else if (access === 'staff') {
                record.needsReply = record.escalatedToDoctor;
            }

            await record.save();

            return res.status(200).json({
                message: 'Đã gửi tin nhắn',
                data: {
                    ...record.toObject(),
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
