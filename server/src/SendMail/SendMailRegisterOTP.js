const createMailTransport = require('./mailTransport');

const SendMailOTP = async (email, otp) => {
    try {
        const transport = await createMailTransport();

        await transport.sendMail({
            from: `"Healthcare" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Mã OTP xác thực đăng ký tài khoản',
            html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                    <h2>Xác thực đăng ký tài khoản</h2>
                    <p>Mã OTP của bạn là:</p>
                    <h1 style="color: #2d89ef; letter-spacing: 4px;">${otp}</h1>
                    <p>Mã có hiệu lực trong <b>5 phút</b>.</p>
                    <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>
                </div>
            `,
        });

        return true;
    } catch (error) {
        console.log('SendMailOTP error:', error.message);
        throw error;
    }
};

module.exports = SendMailOTP;
