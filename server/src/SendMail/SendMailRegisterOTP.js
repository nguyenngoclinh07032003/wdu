const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const EMAIL_USER = process.env.EMAIL_USER;

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const SendMailOTP = async (email, otp) => {
    try {
        const accessToken = await oAuth2Client.getAccessToken();

        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: EMAIL_USER,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken,
            },
        });

        await transport.sendMail({
            from: `"HealthCare Device" <${EMAIL_USER}>`,
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
        console.log('SendMailOTP error:', error);
        throw error;
    }
};

module.exports = SendMailOTP;
