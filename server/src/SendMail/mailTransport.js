const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('../Config/loadEnv');

async function createMailTransport() {
    const emailUser = process.env.EMAIL_USER;

    if (!emailUser) {
        throw new Error('EMAIL_USER chưa được cấu hình trong server/.env');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;
    const refreshToken = process.env.REFRESH_TOKEN;
    const redirectUri = process.env.REDIRECT_URI || 'https://developers.google.com/oauthplayground';

    if (clientId && clientSecret && refreshToken) {
        const oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
        oAuth2Client.setCredentials({ refresh_token: refreshToken });

        const accessTokenResponse = await oAuth2Client.getAccessToken();
        const accessToken =
            typeof accessTokenResponse === 'string' ? accessTokenResponse : accessTokenResponse?.token;

        if (!accessToken) {
            throw new Error('Không lấy được Gmail access token từ OAuth2');
        }

        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: emailUser,
                clientId,
                clientSecret,
                refreshToken,
                accessToken,
            },
        });
    }

    if (process.env.EMAIL_PASS) {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: emailUser,
                pass: process.env.EMAIL_PASS,
            },
        });
    }

    throw new Error(
        'Chưa cấu hình gửi Gmail. Thêm EMAIL_PASS (App Password) hoặc bộ OAuth2 vào server/.env',
    );
}

module.exports = createMailTransport;
