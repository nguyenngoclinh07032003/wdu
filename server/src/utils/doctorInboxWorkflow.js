const WORKFLOW_LABELS = {
    NEW: 'Đã gửi',
    WAITING_STAFF_REVIEW: 'Nhân viên đang tiếp nhận',
    WAITING_DOCTOR_ASSIGNMENT: 'Chờ phân bác sĩ',
    ASSIGNED_TO_DOCTOR: 'Đã giao bác sĩ',
    DOCTOR_REVIEWING: 'Bác sĩ đang xử lý',
    WAITING_DOCTOR_RESPONSE: 'Chờ bác sĩ phản hồi',
    WAITING_CUSTOMER_INFORMATION: 'Yêu cầu bổ sung',
    ANSWERED: 'Đã trả lời',
    TRANSFERRED_BACK: 'Chuyển lại nhân viên',
    URGENT: 'Khẩn cấp',
    REJECTED: 'Từ chối xử lý',
    CLOSED: 'Đã đóng',
    REOPENED: 'Mở lại',
};

function resolveWorkflowStatus(record) {
    if (record.workflowStatus) return record.workflowStatus;
    if (record.priority === 'urgent') return 'URGENT';
    if (record.escalatedToDoctor && record.needsReply) return 'ASSIGNED_TO_DOCTOR';
    if (record.escalatedToDoctor && !record.needsReply) return 'ANSWERED';
    if (record.status === 'answered') return 'ANSWERED';
    if (record.targetRole === 'staff') return 'WAITING_STAFF_REVIEW';
    if (record.targetRole === 'doctor') {
        return record.firstViewedByDoctorAt || record.doctorLastReadAt ? 'DOCTOR_REVIEWING' : 'ASSIGNED_TO_DOCTOR';
    }
    return 'NEW';
}

function getDoctorUnread(record) {
    const stored = typeof record.doctorUnreadCount === 'number' ? record.doctorUnreadCount : null;
    if (stored !== null && stored > 0) return stored;
    if (!record.doctorLastReadAt && (record.needsReply || record.status === 'pending')) {
        return 1;
    }
    return stored !== null ? Math.max(0, stored) : 0;
}

function getStaffUnread(record) {
    const stored = typeof record.staffUnreadCount === 'number' ? record.staffUnreadCount : null;
    if (stored !== null && stored > 0) return stored;
    if (!record.staffLastReadAt && record.targetRole === 'staff' && (record.needsReply || record.status === 'pending')) {
        return 1;
    }
    return stored !== null ? Math.max(0, stored) : 0;
}

function isDoctorVisible(q) {
    return q.targetRole === 'doctor' || q.escalatedToDoctor || q.assignedDoctorId;
}

/** Case đang do bác sĩ xử lý (chưa transfer-back / reject). */
function isDoctorOwned(record) {
    if (!record?.escalatedToDoctor) return false;
    const wf = resolveWorkflowStatus(record);
    return !['TRANSFERRED_BACK', 'REJECTED'].includes(wf);
}

/** Case còn cần nhân viên xử lý (không gồm case bác sĩ đang giữ). */
function matchesStaffPending(record) {
    if (isDoctorOwned(record)) return false;
    const wf = resolveWorkflowStatus(record);
    return (
        ['TRANSFERRED_BACK', 'REJECTED', 'WAITING_STAFF_REVIEW', 'NEW'].includes(wf) ||
        (record.targetRole === 'staff' &&
            (record.status === 'pending' || record.needsReply === true))
    );
}

function matchesDoctorFilter(q, filter) {
    const wf = resolveWorkflowStatus(q);
    const unread = getDoctorUnread(q);

    switch (filter) {
        case 'unread':
            return unread > 0;
        case 'pending':
            // Không đếm chồng với reviewing / answered / request_info / transfer-back
            if (
                [
                    'DOCTOR_REVIEWING',
                    'ANSWERED',
                    'WAITING_CUSTOMER_INFORMATION',
                    'CLOSED',
                    'TRANSFERRED_BACK',
                    'REJECTED',
                ].includes(wf)
            ) {
                return false;
            }
            return (
                ['NEW', 'ASSIGNED_TO_DOCTOR', 'WAITING_DOCTOR_RESPONSE', 'WAITING_DOCTOR_ASSIGNMENT', 'URGENT'].includes(
                    wf,
                ) ||
                q.needsReply === true ||
                q.status === 'pending'
            );
        case 'reviewing':
            return wf === 'DOCTOR_REVIEWING';
        case 'answered':
            return (
                !q.needsReply &&
                (wf === 'ANSWERED' || (q.status === 'answered' && wf !== 'CLOSED'))
            );
        case 'escalated':
            return !!q.escalatedToDoctor || q.source === 'staff_escalation';
        case 'request_info':
            return wf === 'WAITING_CUSTOMER_INFORMATION';
        case 'urgent':
            return q.priority === 'urgent' || wf === 'URGENT';
        case 'closed':
            return wf === 'CLOSED';
        case 'transferred_back':
            return wf === 'TRANSFERRED_BACK' || wf === 'REJECTED';
        case '':
        case 'all':
        default:
            return true;
    }
}

function enrichConversation(record) {
    const workflowStatus = resolveWorkflowStatus(record);
    return {
        ...record,
        workflowStatus,
        workflowStatusLabel: WORKFLOW_LABELS[workflowStatus] || workflowStatus,
        unreadCount: getDoctorUnread(record),
        doctorUnreadCount: getDoctorUnread(record),
        staffUnreadCount: getStaffUnread(record),
        title: record.title || (record.question || '').slice(0, 80),
        isEscalated: !!record.escalatedToDoctor,
    };
}

module.exports = {
    WORKFLOW_LABELS,
    resolveWorkflowStatus,
    getDoctorUnread,
    getStaffUnread,
    isDoctorVisible,
    isDoctorOwned,
    matchesStaffPending,
    matchesDoctorFilter,
    enrichConversation,
};
