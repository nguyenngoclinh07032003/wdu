const createMailTransport = require('../SendMail/mailTransport');

const SUPPORT_LABELS = {
    'product-advice': 'Tư vấn sản phẩm',
    'order-support': 'Kiểm tra đơn hàng',
    'return-warranty': 'Đổi trả hoặc bảo hành',
    feedback: 'Góp ý hoặc khiếu nại',
    partnership: 'Hợp tác kinh doanh',
    other: 'Nội dung khác',
};

const isValidPhone = (phone = '') => /^0\d{9}$/.test(String(phone).replace(/\s/g, ''));

const ControllerContact = {
    async submit(req, res) {
        try {
            const {
                fullName,
                phone,
                email,
                supportType,
                orderCode,
                message,
                imageName,
                imageData,
                agreeTerms,
            } = req.body;

            if (!fullName?.trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập họ và tên' });
            }

            if (!isValidPhone(phone)) {
                return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
            }

            if (!supportType || !SUPPORT_LABELS[supportType]) {
                return res.status(400).json({ message: 'Vui lòng chọn nội dung cần hỗ trợ' });
            }

            if (!message?.trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập nội dung chi tiết' });
            }

            if (!agreeTerms) {
                return res.status(400).json({ message: 'Vui lòng đồng ý cung cấp thông tin để Mộc Xoa liên hệ hỗ trợ' });
            }

            const needsOrderCode = supportType === 'order-support' || supportType === 'return-warranty';
            if (needsOrderCode && !orderCode?.trim()) {
                return res.status(400).json({ message: 'Vui lòng nhập mã đơn hàng' });
            }

            const supportLabel = SUPPORT_LABELS[supportType];
            const recipient =
                supportType === 'partnership'
                    ? process.env.PARTNER_EMAIL || 'linhnnhe171195@fpt.edu.vn'
                    : process.env.CUSTOMER_EMAIL || process.env.EMAIL_USER || 'linhnnhe171195@fpt.edu.vn';

            const mailBody = `
                <h2>Yêu cầu hỗ trợ mới từ website Mộc Xoa</h2>
                <p><strong>Họ và tên:</strong> ${fullName}</p>
                <p><strong>Số điện thoại:</strong> ${phone}</p>
                <p><strong>Email:</strong> ${email || 'Không cung cấp'}</p>
                <p><strong>Nội dung hỗ trợ:</strong> ${supportLabel}</p>
                ${needsOrderCode ? `<p><strong>Mã đơn hàng:</strong> ${orderCode}</p>` : ''}
                <p><strong>Nội dung chi tiết:</strong></p>
                <p>${String(message).replace(/\n/g, '<br/>')}</p>
            `;

            const attachments = [];
            if (imageData && imageName) {
                const base64Data = String(imageData).replace(/^data:.*;base64,/, '');
                if (base64Data.length <= 3 * 1024 * 1024) {
                    attachments.push({
                        filename: imageName,
                        content: base64Data,
                        encoding: 'base64',
                    });
                }
            }

            try {
                const transport = await createMailTransport();
                await transport.sendMail({
                    from: process.env.EMAIL_USER,
                    to: recipient,
                    replyTo: email || undefined,
                    subject: `[Liên hệ] ${supportLabel} - ${fullName}`,
                    html: mailBody,
                    attachments,
                });
            } catch (mailError) {
                console.error('Contact mail error:', mailError);
                return res.status(503).json({
                    message:
                        'Không thể gửi yêu cầu qua email lúc này. Vui lòng liên hệ hotline 0986 003 022 hoặc Zalo.',
                });
            }

            return res.status(200).json({
                message: 'Mộc Xoa đã nhận được yêu cầu của bạn',
            });
        } catch (error) {
            console.error('Submit contact error:', error);
            return res.status(500).json({ message: 'Có lỗi xảy ra, vui lòng thử lại sau' });
        }
    },
};

module.exports = ControllerContact;
