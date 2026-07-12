const createMailTransport = require('../SendMail/mailTransport');
const ModelSupportRequest = require('../models/ModelSupportRequest');
const {
    SUPPORT_TYPE_LABELS,
    isValidPhone,
    generateRequestCode,
} = require('../utils/supportRequestHelpers');
const { normalizePhone } = require('../utils/supportCustomerNotify');

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

            if (!supportType || !SUPPORT_TYPE_LABELS[supportType]) {
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

            const supportLabel = SUPPORT_TYPE_LABELS[supportType];
            const requestCode = await generateRequestCode();
            const normalizedImageData = imageData ? String(imageData).replace(/^data:.*;base64,/, '') : '';
            const maxImageBytes = 2 * 1024 * 1024;
            const safeImageData =
                normalizedImageData && normalizedImageData.length <= maxImageBytes ? normalizedImageData : '';

            const supportRequest = await ModelSupportRequest.create({
                requestCode,
                fullName: fullName.trim(),
                phone: normalizePhone(phone),
                email: email?.trim() || '',
                customerUserId: req.user?.id || req.user?._id || null,
                supportType,
                supportTypeLabel: supportLabel,
                orderCode: orderCode?.trim() || '',
                message: message.trim(),
                imageName: safeImageData ? imageName || 'image.jpg' : '',
                imageData: safeImageData,
                agreeTerms: true,
                status: 'pending',
                statusHistory: [
                    {
                        status: 'pending',
                        note: 'Khách hàng gửi yêu cầu từ trang Liên hệ',
                        createdAt: new Date(),
                    },
                ],
            });

            const recipient =
                supportType === 'partnership'
                    ? process.env.PARTNER_EMAIL || 'linhnnhe171195@fpt.edu.vn'
                    : process.env.CUSTOMER_EMAIL || process.env.EMAIL_USER || 'linhnnhe171195@fpt.edu.vn';

            const mailBody = `
                <h2>Yêu cầu hỗ trợ mới từ website Mộc Xoa</h2>
                <p><strong>Mã yêu cầu:</strong> ${requestCode}</p>
                <p><strong>Họ và tên:</strong> ${fullName}</p>
                <p><strong>Số điện thoại:</strong> ${phone}</p>
                <p><strong>Email:</strong> ${email || 'Không cung cấp'}</p>
                <p><strong>Nội dung hỗ trợ:</strong> ${supportLabel}</p>
                ${needsOrderCode ? `<p><strong>Mã đơn hàng:</strong> ${orderCode}</p>` : ''}
                <p><strong>Nội dung chi tiết:</strong></p>
                <p>${String(message).replace(/\n/g, '<br/>')}</p>
            `;

            const attachments = [];
            if (supportRequest.imageData && supportRequest.imageName) {
                attachments.push({
                    filename: supportRequest.imageName,
                    content: supportRequest.imageData,
                    encoding: 'base64',
                });
            }

            const sendContactEmail = async () => {
                const transport = await createMailTransport();
                await transport.sendMail({
                    from: process.env.EMAIL_USER,
                    to: recipient,
                    replyTo: email || undefined,
                    subject: `[${requestCode}] ${supportLabel} - ${fullName}`,
                    html: mailBody,
                    attachments,
                });
            };

            sendContactEmail().catch((mailError) => {
                console.error('Contact mail error:', mailError);
            });

            return res.status(200).json({
                message: 'Mộc Xoa đã nhận được yêu cầu của bạn',
                requestCode: supportRequest.requestCode,
            });
        } catch (error) {
            console.error('Submit contact error:', error);
            return res.status(500).json({ message: 'Có lỗi xảy ra, vui lòng thử lại sau' });
        }
    },
};

module.exports = ControllerContact;
