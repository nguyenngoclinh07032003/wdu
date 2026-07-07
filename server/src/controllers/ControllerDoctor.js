const ModelDoctorProfile = require('../models/ModelDoctorProfile');
const ModelDoctorQuestion = require('../models/ModelDoctorQuestion');
const ModelUser = require('../models/ModelUser');
const { askDoctorQuestion } = require('../utils/doctorChat');

const buildProfileResponse = (profile, user) => ({
    _id: profile._id,
    userId: profile.userId,
    fullname: user?.fullname || '',
    email: user?.email || '',
    specialty: profile.specialty,
    hospital: profile.hospital,
    licenseNumber: profile.licenseNumber,
    certificateUrl: profile.certificateUrl,
    certificateFileName: profile.certificateFileName,
    status: profile.status,
    rejectionReason: profile.rejectionReason,
    reviewedAt: profile.reviewedAt,
    updatedAt: profile.updatedAt,
});

async function getOrCreateProfile(userId) {
    let profile = await ModelDoctorProfile.findOne({ userId });
    if (!profile) {
        profile = await ModelDoctorProfile.create({ userId });
    }
    return profile;
}

class ControllerDoctor {
    async getProfile(req, res) {
        try {
            const userId = req.user?.id;
            const user = await ModelUser.findById(userId).select('-password');
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            const profile = await getOrCreateProfile(userId);
            return res.status(200).json(buildProfileResponse(profile, user));
        } catch (error) {
            console.error('getProfile error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async updateProfile(req, res) {
        try {
            const userId = req.user?.id;
            const { specialty, hospital, licenseNumber } = req.body;

            const profile = await getOrCreateProfile(userId);
            const oldSpecialty = profile.specialty;
            const oldHospital = profile.hospital;
            const oldLicenseNumber = profile.licenseNumber;

            if (specialty !== undefined) profile.specialty = String(specialty).trim();
            if (hospital !== undefined) profile.hospital = String(hospital).trim();
            if (licenseNumber !== undefined) profile.licenseNumber = String(licenseNumber).trim();

            if (profile.status === 'rejected') {
                profile.status = 'pending';
                profile.rejectionReason = '';
            } else if (profile.status === 'approved') {
                const hasChanges =
                    (specialty !== undefined && String(specialty).trim() !== String(oldSpecialty || '').trim()) ||
                    (hospital !== undefined && String(hospital).trim() !== String(oldHospital || '').trim()) ||
                    (licenseNumber !== undefined &&
                        String(licenseNumber).trim() !== String(oldLicenseNumber || '').trim());

                if (hasChanges) {
                    profile.status = 'pending';
                    profile.reviewedBy = null;
                    profile.reviewedAt = null;
                }
            } else if (profile.certificateUrl) {
                profile.status = 'pending';
            }

            profile.updatedAt = Date.now();
            await profile.save();

            const user = await ModelUser.findById(userId).select('-password');
            return res.status(200).json({
                message: 'Cập nhật hồ sơ bác sĩ thành công',
                profile: buildProfileResponse(profile, user),
            });
        } catch (error) {
            console.error('updateProfile error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async uploadCertificate(req, res) {
        try {
            const userId = req.user?.id;

            if (!req.file) {
                return res.status(400).json({ message: 'Vui lòng chọn file chứng chỉ' });
            }

            const profile = await getOrCreateProfile(userId);
            const relativePath = `/uploads/doctor-certificates/${req.file.filename}`;

            profile.certificateUrl = relativePath;
            profile.certificateFileName = req.file.originalname;
            profile.status = 'pending';
            profile.rejectionReason = '';
            profile.reviewedBy = null;
            profile.reviewedAt = null;
            profile.updatedAt = Date.now();

            await profile.save();

            const user = await ModelUser.findById(userId).select('-password');
            return res.status(200).json({
                message: 'Upload chứng chỉ thành công. Vui lòng chờ Admin duyệt.',
                profile: buildProfileResponse(profile, user),
            });
        } catch (error) {
            console.error('uploadCertificate error:', error);
            return res.status(500).json({ message: error.message || 'Lỗi upload chứng chỉ' });
        }
    }

    async getQuestions(req, res) {
        try {
            const userId = req.user?.id;
            const questions = await ModelDoctorQuestion.find({ doctorId: userId })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean();

            return res.status(200).json(questions);
        } catch (error) {
            console.error('getQuestions error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async askQuestion(req, res) {
        try {
            const userId = req.user?.id;
            const { question } = req.body;

            if (!question || !String(question).trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập câu hỏi' });
            }

            const profile = await getOrCreateProfile(userId);

            if (profile.status !== 'approved') {
                return res.status(403).json({
                    message: 'Chỉ bác sĩ đã được duyệt chứng chỉ mới sử dụng Q&A chuyên môn',
                    status: profile.status,
                });
            }

            const answer = await askDoctorQuestion(String(question).trim(), {
                specialty: profile.specialty,
                hospital: profile.hospital,
            });

            const record = await ModelDoctorQuestion.create({
                doctorId: userId,
                question: String(question).trim(),
                answer,
                answerSource: 'chatbot',
                status: 'answered',
            });

            return res.status(201).json({
                message: 'Đã nhận câu trả lời',
                data: record,
            });
        } catch (error) {
            console.error('askQuestion error:', error);
            return res.status(500).json({ message: 'Lỗi xử lý câu hỏi' });
        }
    }

    async listCertificatesForAdmin(req, res) {
        try {
            const { status } = req.query;
            const filter = {};

            if (status && ['pending', 'approved', 'rejected'].includes(status)) {
                filter.status = status;
            }

            const profiles = await ModelDoctorProfile.find(filter).sort({ updatedAt: -1 }).lean();
            const userIds = profiles.map((p) => p.userId);
            const users = await ModelUser.find({ _id: { $in: userIds } })
                .select('fullname email phone role')
                .lean();
            const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));

            const data = profiles.map((profile) => ({
                ...profile,
                user: userMap[String(profile.userId)] || null,
            }));

            return res.status(200).json(data);
        } catch (error) {
            console.error('listCertificatesForAdmin error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async approveCertificate(req, res) {
        try {
            const { id } = req.params;
            const profile = await ModelDoctorProfile.findById(id);

            if (!profile) {
                return res.status(404).json({ message: 'Không tìm thấy hồ sơ bác sĩ' });
            }

            profile.status = 'approved';
            profile.rejectionReason = '';
            profile.reviewedBy = req.user?.id;
            profile.reviewedAt = Date.now();
            profile.updatedAt = Date.now();
            await profile.save();

            return res.status(200).json({
                message: 'Đã duyệt chứng chỉ bác sĩ',
                profile,
            });
        } catch (error) {
            console.error('approveCertificate error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async rejectCertificate(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const profile = await ModelDoctorProfile.findById(id);

            if (!profile) {
                return res.status(404).json({ message: 'Không tìm thấy hồ sơ bác sĩ' });
            }

            const rejectReason = String(reason || '').trim();
            if (!rejectReason) {
                return res.status(400).json({
                    message: 'Vui lòng nhập lý do từ chối chứng chỉ',
                });
            }

            profile.status = 'rejected';
            profile.rejectionReason = rejectReason;
            profile.reviewedBy = req.user?.id;
            profile.reviewedAt = Date.now();
            profile.updatedAt = Date.now();
            await profile.save();

            return res.status(200).json({
                message: 'Đã từ chối chứng chỉ bác sĩ',
                profile,
            });
        } catch (error) {
            console.error('rejectCertificate error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async answerQuestionAsAdmin(req, res) {
        try {
            const { id } = req.params;
            const { answer } = req.body;

            if (!answer || !String(answer).trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập câu trả lời' });
            }

            const record = await ModelDoctorQuestion.findById(id);
            if (!record) {
                return res.status(404).json({ message: 'Không tìm thấy câu hỏi' });
            }

            record.answer = String(answer).trim();
            record.answerSource = 'admin';
            record.status = 'answered';
            record.updatedAt = Date.now();
            await record.save();

            return res.status(200).json({
                message: 'Đã gửi câu trả lời',
                data: record,
            });
        } catch (error) {
            console.error('answerQuestionAsAdmin error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async listQuestionsForAdmin(req, res) {
        try {
            const questions = await ModelDoctorQuestion.find()
                .sort({ createdAt: -1 })
                .limit(100)
                .lean();

            const doctorIds = [...new Set(questions.map((q) => String(q.doctorId)))];
            const doctors = await ModelUser.find({ _id: { $in: doctorIds } })
                .select('fullname email')
                .lean();
            const doctorMap = Object.fromEntries(doctors.map((d) => [String(d._id), d]));

            const data = questions.map((q) => ({
                ...q,
                doctor: doctorMap[String(q.doctorId)] || null,
            }));

            return res.status(200).json(data);
        } catch (error) {
            console.error('listQuestionsForAdmin error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }
}

module.exports = new ControllerDoctor();
