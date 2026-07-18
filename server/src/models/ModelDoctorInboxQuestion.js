const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const WORKFLOW_STATUSES = [
    'NEW',
    'WAITING_STAFF_REVIEW',
    'WAITING_DOCTOR_ASSIGNMENT',
    'ASSIGNED_TO_DOCTOR',
    'DOCTOR_REVIEWING',
    'WAITING_DOCTOR_RESPONSE',
    'WAITING_CUSTOMER_INFORMATION',
    'ANSWERED',
    'TRANSFERRED_BACK',
    'URGENT',
    'REJECTED',
    'CLOSED',
    'REOPENED',
];

const ModelDoctorInboxQuestion = new Schema(
    {
        askerId: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
        askerRole: {
            type: String,
            enum: ['user', 'staff', 'admin'],
            default: 'user',
        },
        askerName: { type: String, default: '' },
        title: { type: String, default: '' },
        question: { type: String, required: true },
        specialty: { type: String, default: '' },
        symptomSummary: { type: String, default: '' },
        severity: {
            type: String,
            enum: ['mild', 'moderate', 'severe', ''],
            default: '',
        },
        answer: { type: String, default: '' },
        answeredBy: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            default: null,
        },
        answeredByName: { type: String, default: '' },
        status: {
            type: String,
            enum: ['pending', 'answered'],
            default: 'pending',
        },
        workflowStatus: {
            type: String,
            enum: WORKFLOW_STATUSES,
            default: 'NEW',
        },
        priority: {
            type: String,
            enum: ['normal', 'high', 'urgent'],
            default: 'normal',
        },
        source: {
            type: String,
            enum: ['customer_to_doctor', 'customer_to_staff', 'staff_escalation'],
            default: 'customer_to_doctor',
        },
        targetRole: {
            type: String,
            enum: ['doctor', 'staff'],
            default: 'doctor',
        },
        messages: [
            {
                senderId: { type: Schema.Types.ObjectId, ref: 'user', default: null },
                senderRole: { type: String, default: 'user' },
                senderName: { type: String, default: '' },
                text: { type: String, default: '' },
                messageType: {
                    type: String,
                    enum: ['normal', 'system', 'escalation', 'internal', 'request_info'],
                    default: 'normal',
                },
                isInternal: { type: Boolean, default: false },
                usedAiAssist: { type: Boolean, default: false },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        needsReply: { type: Boolean, default: false },
        lastMessage: { type: String, default: '' },
        lastMessageSenderRole: { type: String, default: '' },
        doctorUnreadCount: { type: Number, default: 0 },
        doctorLastReadAt: { type: Date, default: null },
        staffUnreadCount: { type: Number, default: 0 },
        staffLastReadAt: { type: Date, default: null },
        askerUnreadCount: { type: Number, default: 0 },
        askerLastReadAt: { type: Date, default: null },
        escalatedToDoctor: { type: Boolean, default: false },
        escalatedAt: { type: Date, default: null },
        escalatedBy: { type: Schema.Types.ObjectId, ref: 'user', default: null },
        escalatedByName: { type: String, default: '' },
        escalationNote: { type: String, default: '' },
        assignedDoctorId: { type: Schema.Types.ObjectId, ref: 'user', default: null },
        assignedDoctorName: { type: String, default: '' },
        assignedStaffId: { type: Schema.Types.ObjectId, ref: 'user', default: null },
        assignedStaffName: { type: String, default: '' },
        responseDeadline: { type: Date, default: null },
        rejectReason: { type: String, default: '' },
        transferBackNote: { type: String, default: '' },
        closedAt: { type: Date, default: null },
        closedBy: { type: Schema.Types.ObjectId, ref: 'user', default: null },
        closedByName: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        answeredAt: { type: Date, default: null },
        firstViewedByDoctorAt: { type: Date, default: null },
    },
    { collection: 'shoe.doctor_inbox_questions' }
);

module.exports = mongoose.model('doctor_inbox_question', ModelDoctorInboxQuestion);
module.exports.WORKFLOW_STATUSES = WORKFLOW_STATUSES;
