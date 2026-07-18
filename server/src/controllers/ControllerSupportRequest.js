const ModelSupportRequest = require('../models/ModelSupportRequest');
const ModelUser = require('../models/ModelUser');
const {
    SUPPORT_STATUS_LABELS,
    PENDING_RECEPTION_STATUSES,
    IN_PROGRESS_STATUSES,
    appendStatusHistory,
} = require('../utils/supportRequestHelpers');
const {
    notifyCustomerRequestAccepted,
    notifyCustomerStaffReply,
    notifyCustomerRequestResolved,
} = require('../utils/supportCustomerNotify');

const getStaffUser = (req) => req.user || {};

function getStaffId(staff) {
    return staff?.id || staff?._id || null;
}

function isSameStaffId(left, right) {
    if (!left || !right) return false;
    return String(left) === String(right);
}

function assertAssigneeOrAdmin(record, staff, res) {
    if (staff?.isAdmin) return true;
    const staffId = getStaffId(staff);
    if (!record.assignedTo) {
        res.status(400).json({ message: 'Yêu cầu chưa được tiếp nhận / phân công' });
        return false;
    }
    if (!isSameStaffId(record.assignedTo, staffId)) {
        res.status(403).json({
            message: 'Chỉ nhân viên được phân công (hoặc admin) mới được thao tác yêu cầu này',
        });
        return false;
    }
    return true;
}

async function findRequestById(id) {
    return ModelSupportRequest.findById(id);
}

const ControllerSupportRequest = {
    async getPendingCount(req, res) {
        try {
            const count = await ModelSupportRequest.countDocuments({
                status: { $in: PENDING_RECEPTION_STATUSES },
            });

            return res.status(200).json({ pendingCount: count });
        } catch (error) {
            console.error('getPendingCount error:', error);
            return res.status(500).json({ message: 'Không thể lấy số lượng yêu cầu chưa xử lý' });
        }
    },

    async getStaffUsers(req, res) {
        try {
            const staffUsers = await ModelUser.find({
                role: { $in: ['staff', 'admin'] },
                isActive: { $ne: false },
            })
                .select('fullname email role')
                .sort({ fullname: 1 });

            return res.status(200).json({ data: staffUsers });
        } catch (error) {
            console.error('getStaffUsers error:', error);
            return res.status(500).json({ message: 'Không thể tải danh sách nhân viên' });
        }
    },

    async list(req, res) {
        try {
            const { status } = req.query;
            const filter = {};

            if (status === 'unprocessed') {
                filter.status = { $in: PENDING_RECEPTION_STATUSES };
            } else if (status === 'in_progress') {
                filter.status = { $in: IN_PROGRESS_STATUSES };
            } else if (status) {
                filter.status = status;
            }

            const [data, pendingCount] = await Promise.all([
                ModelSupportRequest.find(filter).sort({ createdAt: -1 }).lean(),
                ModelSupportRequest.countDocuments({ status: { $in: PENDING_RECEPTION_STATUSES } }),
            ]);

            const mapped = data.map((item) => ({
                ...item,
                statusLabel: SUPPORT_STATUS_LABELS[item.status] || item.status,
            }));

            return res.status(200).json({ data: mapped, pendingCount });
        } catch (error) {
            console.error('list support requests error:', error);
            return res.status(500).json({ message: 'Không thể tải danh sách yêu cầu hỗ trợ' });
        }
    },

    async getById(req, res) {
        try {
            const record = await findRequestById(req.params.id);
            if (!record) {
                return res.status(404).json({ message: 'Không tìm thấy yêu cầu hỗ trợ' });
            }

            const data = record.toObject();
            data.statusLabel = SUPPORT_STATUS_LABELS[data.status] || data.status;

            return res.status(200).json({ data });
        } catch (error) {
            console.error('get support request error:', error);
            return res.status(500).json({ message: 'Không thể tải chi tiết yêu cầu' });
        }
    },

    async accept(req, res) {
        try {
            const staff = getStaffUser(req);
            const staffId = getStaffId(staff);
            if (!staffId) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const staffName = staff.fullname || staff.email || '';
            const now = new Date();

            const claimed = await ModelSupportRequest.findOneAndUpdate(
                {
                    _id: req.params.id,
                    status: 'pending',
                    $or: [
                        { assignedTo: null },
                        { assignedTo: { $exists: false } },
                        { assignedTo: staffId },
                    ],
                },
                {
                    $set: {
                        receivedBy: staffId,
                        receivedByName: staffName,
                        receivedAt: now,
                        assignedTo: staffId,
                        assignedToName: staffName,
                        status: 'received',
                        updatedAt: now,
                    },
                    $push: {
                        statusHistory: {
                            status: 'received',
                            previousStatus: 'pending',
                            action: 'accept',
                            note: 'Nhân viên đã tiếp nhận yêu cầu',
                            updatedBy: staffId,
                            updatedByName: staffName,
                            createdAt: now,
                        },
                    },
                },
                { new: true },
            );

            if (!claimed) {
                const existing = await findRequestById(req.params.id);
                if (!existing) {
                    return res.status(404).json({ message: 'Không tìm thấy yêu cầu hỗ trợ' });
                }
                if (existing.assignedTo && !isSameStaffId(existing.assignedTo, staffId)) {
                    return res.status(409).json({
                        message: `Yêu cầu đã được ${existing.assignedToName || 'nhân viên khác'} nhận xử lý`,
                    });
                }
                return res.status(400).json({ message: 'Yêu cầu không còn ở trạng thái chờ tiếp nhận' });
            }

            notifyCustomerRequestAccepted(claimed, staff).catch((error) => {
                console.error('notifyCustomerRequestAccepted error:', error);
            });

            return res.status(200).json({
                message: 'Đã tiếp nhận yêu cầu hỗ trợ',
                data: claimed,
            });
        } catch (error) {
            console.error('accept support request error:', error);
            return res.status(500).json({ message: 'Không thể tiếp nhận yêu cầu' });
        }
    },

    async assign(req, res) {
        try {
            const { staffId } = req.body;
            if (!staffId) {
                return res.status(400).json({ message: 'Vui lòng chọn nhân viên phân công' });
            }

            const record = await findRequestById(req.params.id);
            if (!record) {
                return res.status(404).json({ message: 'Không tìm thấy yêu cầu hỗ trợ' });
            }

            const assignee = await ModelUser.findById(staffId).select('fullname email role');
            if (!assignee || !['staff', 'admin'].includes(assignee.role)) {
                return res.status(400).json({ message: 'Nhân viên phân công không hợp lệ' });
            }

            const staff = getStaffUser(req);
            record.assignedTo = assignee._id;
            record.assignedToName = assignee.fullname || assignee.email || '';
            appendStatusHistory(
                record,
                record.status === 'pending' ? 'received' : record.status,
                `Phân công cho ${record.assignedToName}`,
                staff,
                'assign',
            );
            await record.save();

            return res.status(200).json({
                message: 'Đã phân công yêu cầu hỗ trợ',
                data: record,
            });
        } catch (error) {
            console.error('assign support request error:', error);
            return res.status(500).json({ message: 'Không thể phân công yêu cầu' });
        }
    },

    async updateStatus(req, res) {
        try {
            const { status, note } = req.body;
            if (!status || !SUPPORT_STATUS_LABELS[status]) {
                return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
            }

            const record = await findRequestById(req.params.id);
            if (!record) {
                return res.status(404).json({ message: 'Không tìm thấy yêu cầu hỗ trợ' });
            }

            const staff = getStaffUser(req);
            if (!assertAssigneeOrAdmin(record, staff, res)) return;

            const previousStatus = record.status;

            appendStatusHistory(record, status, note || '', staff);
            await record.save();

            if (status === 'resolved' && previousStatus !== 'resolved') {
                notifyCustomerRequestResolved(record, staff).catch((error) => {
                    console.error('notifyCustomerRequestResolved error:', error);
                });
            }

            return res.status(200).json({
                message: 'Đã cập nhật trạng thái yêu cầu',
                data: record,
            });
        } catch (error) {
            console.error('update status error:', error);
            return res.status(500).json({ message: 'Không thể cập nhật trạng thái' });
        }
    },

    async addNote(req, res) {
        try {
            const { note } = req.body;
            if (!note?.trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập ghi chú' });
            }

            const record = await findRequestById(req.params.id);
            if (!record) {
                return res.status(404).json({ message: 'Không tìm thấy yêu cầu hỗ trợ' });
            }

            const staff = getStaffUser(req);
            if (!assertAssigneeOrAdmin(record, staff, res)) return;

            record.staffNotes = record.staffNotes || [];
            record.staffNotes.push({
                text: note.trim(),
                createdBy: getStaffId(staff),
                createdByName: staff.fullname || staff.email || '',
                createdAt: new Date(),
            });
            record.updatedAt = new Date();
            await record.save();

            return res.status(200).json({
                message: 'Đã thêm ghi chú',
                data: record,
            });
        } catch (error) {
            console.error('add note error:', error);
            return res.status(500).json({ message: 'Không thể thêm ghi chú' });
        }
    },

    async addReply(req, res) {
        try {
            const { reply } = req.body;
            if (!reply?.trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập nội dung phản hồi' });
            }

            const record = await findRequestById(req.params.id);
            if (!record) {
                return res.status(404).json({ message: 'Không tìm thấy yêu cầu hỗ trợ' });
            }

            const staff = getStaffUser(req);
            if (!assertAssigneeOrAdmin(record, staff, res)) return;

            record.replyHistory = record.replyHistory || [];
            record.replyHistory.push({
                message: reply.trim(),
                senderRole: 'staff',
                senderName: staff.fullname || staff.email || '',
                createdBy: getStaffId(staff),
                createdAt: new Date(),
            });
            record.staffReply = reply.trim();
            record.staffReplyAt = new Date();
            record.staffReplyBy = getStaffId(staff);
            record.staffReplyByName = staff.fullname || staff.email || '';
            record.updatedAt = new Date();
            await record.save();

            notifyCustomerStaffReply(record, staff, reply.trim()).catch((error) => {
                console.error('notifyCustomerStaffReply error:', error);
            });

            return res.status(200).json({
                message: 'Đã gửi phản hồi cho khách hàng',
                data: record,
            });
        } catch (error) {
            console.error('add reply error:', error);
            return res.status(500).json({ message: 'Không thể lưu phản hồi' });
        }
    },
};

module.exports = ControllerSupportRequest;
