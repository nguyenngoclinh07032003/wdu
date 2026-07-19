const createMailTransport = require('./mailTransport');

const ForgotPassword = async (email, token, otp) => {
    try {
        const transport = await createMailTransport();
        const info = await transport.sendMail({
            from: `"Healthcare" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🔐 Khôi phục mật khẩu - Healthcare',
            html: `
            <div style="max-width: 500px; margin: auto; font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; border-radius: 10px; border: 1px solid #ddd;">
            <div style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0px 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center;">Khôi phục mật khẩu</h2>
            <p style="color: #555; font-size: 16px;">
            Xin chào <strong>${email}</strong>,
            </p>
            <p style="color: #555; font-size: 16px;">
            Bạn vừa yêu cầu đặt lại mật khẩu. Dưới đây là mã OTP của bạn:
            </p>
            <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; font-size: 22px; font-weight: bold; color: #d63384; background: #ffe8f0; padding: 10px 20px; border-radius: 5px;">
                ${otp}
            </span>
            </div>
            <p style="color: #999; font-size: 14px; text-align: center;">
            Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
            </p>
        </div>
        <div style="text-align: center; font-size: 12px; color: #888; margin-top: 20px;">
        <p>© 2026 Healthcare. All rights reserved.</p>
        </div>
        </div>
            `,
        });
    } catch (error) {
        console.log('Error sending email:', error);
    }
};

module.exports = ForgotPassword;
