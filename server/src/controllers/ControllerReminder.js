const ModelReminder = require('../models/ModelReminder');
const ModelReminderLog = require('../models/ModelReminderLog');
const ModelProduct = require('../models/ModelProducts');

class ControllerReminder {
    async getReminders(req, res) {
        try {
            const userId = req.user.id;

            const reminders = await ModelReminder.find({ userId })
                .populate('productId', 'name img price type')
                .sort({ createdAt: -1 });

            return res.status(200).json({
                success: true,
                data: reminders,
            });
        } catch (error) {
            console.error('getReminders error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy danh sách nhắc nhở',
            });
        }
    }

    async createReminder(req, res) {
        try {
            const userId = req.user.id;
            const userEmail = req.user.email;
            const { productId, title, description, frequency, times, methods } = req.body;

            if (!title || !Array.isArray(times) || times.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập tiêu đề và thời gian nhắc nhở',
                });
            }

            if (productId) {
                const product = await ModelProduct.findById(productId);
                if (!product) {
                    return res.status(404).json({
                        success: false,
                        message: 'Không tìm thấy sản phẩm',
                    });
                }
            }

            const reminder = await ModelReminder.create({
                userId,
                userEmail,
                productId: productId || null,
                title,
                description: description || '',
                frequency: frequency || 'daily',
                times,
                methods: Array.isArray(methods) && methods.length > 0 ? methods : ['push'],
            });

            return res.status(201).json({
                success: true,
                message: 'Tạo nhắc nhở thành công',
                data: reminder,
            });
        } catch (error) {
            console.error('createReminder error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi tạo nhắc nhở',
            });
        }
    }

    async updateReminder(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const reminder = await ModelReminder.findOneAndUpdate({ _id: id, userId }, req.body, { new: true });

            if (!reminder) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy nhắc nhở',
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Cập nhật nhắc nhở thành công',
                data: reminder,
            });
        } catch (error) {
            console.error('updateReminder error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi cập nhật nhắc nhở',
            });
        }
    }

    async deleteReminder(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const reminder = await ModelReminder.findOneAndDelete({ _id: id, userId });

            if (!reminder) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy nhắc nhở',
                });
            }

            await ModelReminderLog.deleteMany({ reminderId: id, userId });

            return res.status(200).json({
                success: true,
                message: 'Xóa nhắc nhở thành công',
            });
        } catch (error) {
            console.error('deleteReminder error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi xóa nhắc nhở',
            });
        }
    }

    async completeReminder(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const reminder = await ModelReminder.findOne({ _id: id, userId });

            if (!reminder) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy nhắc nhở',
                });
            }

            await ModelReminder.findByIdAndUpdate(id, {
                lastCompletedAt: new Date(),
            });

            const log = await ModelReminderLog.create({
                reminderId: id,
                userId,
                status: 'completed',
                type: 'completed',
                note: 'Người dùng đã đánh dấu hoàn thành',
                completedAt: new Date(),
            });

            return res.status(201).json({
                success: true,
                message: 'Đã hoàn thành nhắc nhở hôm nay',
                data: log,
            });
        } catch (error) {
            console.error('completeReminder error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi hoàn thành nhắc nhở',
            });
        }
    }

    async getReminderLogs(req, res) {
        try {
            const userId = req.user.id;

            const logs = await ModelReminderLog.find({ userId })
                .populate('reminderId', 'title description frequency times')
                .sort({ createdAt: -1 })
                .limit(50);

            return res.status(200).json({
                success: true,
                data: logs,
            });
        } catch (error) {
            console.error('getReminderLogs error:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy nhật ký nhắc nhở',
            });
        }
    }
}

module.exports = new ControllerReminder();
