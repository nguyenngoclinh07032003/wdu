const mongoose = require('mongoose');

const Schema = mongoose.Schema;

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
        question: { type: String, required: true },
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
                    enum: ['normal', 'system', 'escalation'],
                    default: 'normal',
                },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        needsReply: { type: Boolean, default: false },
        lastMessage: { type: String, default: '' },
        escalatedToDoctor: { type: Boolean, default: false },
        escalatedAt: { type: Date, default: null },
        escalatedBy: { type: Schema.Types.ObjectId, ref: 'user', default: null },
        escalatedByName: { type: String, default: '' },
        escalationNote: { type: String, default: '' },
        assignedDoctorId: { type: Schema.Types.ObjectId, ref: 'user', default: null },
        assignedDoctorName: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        answeredAt: { type: Date, default: null },
    },
    { collection: 'shoe.doctor_inbox_questions' }
);

module.exports = mongoose.model('doctor_inbox_question', ModelDoctorInboxQuestion);
