const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendReminderMail = async ({ to, fullname, title, description, time }) => {
    if (!to) return;

    await transporter.sendMail({
        from: `"Mộc Xoa" <${process.env.EMAIL_USER}>`,
        to,
        subject: `Nhắc nhở: ${title}`,
        html: `
            <div style="font-family: Arial, sans-serif; background:#f6fbf3; padding:24px;">
                <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:14px; padding:24px;">
                    <h2 style="color:#00523a;">Mộc Xoa</h2>

                    <p>Xin chào <b>${fullname || 'bạn'}</b>,</p>

                    <p>Đã đến giờ thực hiện nhắc nhở sức khỏe:</p>

                    <div style="background:#e1f0c4; padding:16px; border-radius:12px; margin:20px 0;">
                        <h3 style="margin:0 0 8px;">${title}</h3>
                        <p style="margin:0;">${description || 'Vui lòng thực hiện đúng lịch để duy trì sức khỏe ổn định.'}</p>
                        <p style="margin:12px 0 0;"><b>Thời gian:</b> ${time}</p>
                    </div>

                    <p>Chúc bạn luôn khỏe mạnh.</p>
                </div>
            </div>
        `,
    });
};

module.exports = sendReminderMail;
