const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ModelDoctorProfile = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            unique: true,
        },
        specialty: { type: String, default: '' },
        hospital: { type: String, default: '' },
        licenseNumber: { type: String, default: '' },
        bio: { type: String, default: '' },
        experienceYears: { type: Number, default: 0 },
        avatarUrl: { type: String, default: '' },
        certificateUrl: { type: String, default: '' },
        certificateFileName: { type: String, default: '' },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
        },
        rejectionReason: { type: String, default: '' },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'user', default: null },
        reviewedAt: { type: Date, default: null },
        pendingSpecialty: { type: String, default: '' },
        pendingLicenseNumber: { type: String, default: '' },
        verifiedFieldsLocked: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { collection: 'shoe.doctor_profiles' }
);

module.exports = mongoose.model('doctor_profile', ModelDoctorProfile);
