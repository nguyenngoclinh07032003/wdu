const ModelNotification = require('../models/ModelNotification');

class ControllerNotification {
    async getPublic(req, res) {
        try {
            const notifications = await ModelNotification.find({
                isPublic: true,
            })
                .sort({ createdAt: -1 })
                .limit(10);

            res.status(200).json(notifications);
        } catch (error) {
            res.status(500).json({ message: 'Lỗi lấy thông báo' });
        }
    }

    async create(req, res) {
        try {
            const notification = await ModelNotification.create(req.body);
            res.status(201).json(notification);
        } catch (error) {
            res.status(500).json({ message: 'Lỗi tạo thông báo' });
        }
    }
}

module.exports = new ControllerNotification();
