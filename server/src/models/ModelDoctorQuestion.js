const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ModelDoctorQuestion = new Schema(
    {
        doctorId: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
        question: { type: String, required: true },
        answer: { type: String, default: '' },
        answerSource: {
            type: String,
            enum: ['chatbot', 'admin', ''],
            default: '',
        },
        status: {
            type: String,
            enum: ['pending', 'answered'],
            default: 'pending',
        },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { collection: 'shoe.doctor_questions' }
);

module.exports = mongoose.model('doctor_question', ModelDoctorQuestion);
