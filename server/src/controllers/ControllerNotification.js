const ModelNotification = require('../models/ModelNotification');
const ModelVoucher = require('../models/ModelVoucher');
const { isVoucherExpired } = require('../utils/voucherHelpers');

class ControllerNotification {
    async getPublic(req, res) {
        try {
            const notifications = await ModelNotification.find({
                isPublic: true,
            })
                .sort({ createdAt: -1 })
                .limit(20)
                .lean();

            const extractCode = (n) => {
                const explicit = String(n.voucherCode || '')
                    .trim()
                    .toUpperCase();
                if (explicit) return explicit;
                const fromMessage = String(n.message || '').match(
                    /(?:mã|ma)\s+([A-Z0-9]{3,20})/i,
                );
                return fromMessage ? String(fromMessage[1]).toUpperCase() : '';
            };

            const codes = [...new Set(notifications.map(extractCode).filter(Boolean))];

            let activeCodes = new Set();
            if (codes.length) {
                const vouchers = await ModelVoucher.find({
                    code: { $in: codes },
                    isActive: true,
                })
                    .select('code expiredAt used quantity')
                    .lean();

                activeCodes = new Set(
                    vouchers
                        .filter((v) => {
                            if (isVoucherExpired(v.expiredAt)) return false;
                            const qty = Number(v.quantity) || 0;
                            const used = Number(v.used) || 0;
                            if (qty > 0 && used >= qty) return false;
                            return true;
                        })
                        .map((v) => String(v.code).toUpperCase()),
                );
            }

            const filtered = notifications
                .filter((n) => {
                    const code = extractCode(n);
                    if (!code) return true;
                    return activeCodes.has(code);
                })
                .slice(0, 10);

            res.status(200).json(filtered);
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
