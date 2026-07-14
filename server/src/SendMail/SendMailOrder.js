const { google } = require('googleapis');
const nodemailer = require('nodemailer');
require('dotenv').config();

// use explicit Google OAuth credentials for email sending
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN; // should be generated for the Google OAuth client

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Google OAuth client ID/secret missing for email sending');
}
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const sendMail = async (email) => {
    try {
        const accessToken = await oAuth2Client.getAccessToken();
        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USER,
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken,
            },
        });

        const info = await transport.sendMail({
            from: `"Healthcare 🎉" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '🎉 Đặt hàng thành công - Chờ nhận hàng nhé!',
            text: 'Cảm ơn bạn đã đặt hàng tại Healthcare!',
            html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #2E86C1;">🎉 Cảm ơn bạn đã đặt hàng tại Healthcare!</h2>
                <p>Xin chào <b>${email}</b>,</p>
                <p>Chúng tôi đã nhận được đơn hàng của bạn và rất vui khi được đồng hành cùng bạn trong trải nghiệm mua sắm tại <b>Healthcare</b>. Đơn hàng của bạn đã được <b>xác nhận thành công</b> và đang được xử lý để chuẩn bị giao đến tay bạn trong thời gian sớm nhất.</p>
                
                <h3 style="color: #28B463;">Bạn có thể theo dõi trạng thái đơn hàng trong trang tài khoản của mình.</h3>


                <p> <b>Thời gian giao hàng dự kiến:</b> <span style="color:#E67E22;">Từ 2 - 5 ngày làm việc</span> (tùy thuộc vào khu vực nhận hàng và điều kiện vận chuyển thực tế). </p>

                <h3 style="color: #D68910;">📌 Một vài lưu ý dành cho bạn</h3>
                <ul> 
                <li>Vui lòng kiểm tra lại thông tin đơn hàng và địa chỉ nhận hàng.
                </li> <li>Nếu cần thay đổi hoặc hỗ trợ về đơn hàng, hãy liên hệ với chúng tôi sớm nhất có thể.
                </li> <li>Khi nhận hàng, bạn nên kiểm tra tình trạng sản phẩm trước khi xác nhận hoàn tất đơn hàng.</li>
                </ul>

                <p>Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại <b><a href="https://www.facebook.com/people/M%E1%BB%99c-Xoa/61589897113612/" style="color: #2980B9;">liên hệ với chúng tôi</a></b>. Đội ngũ Healthcare luôn sẵn sàng hỗ trợ bạn!</p>

                <p> 💖 Cảm ơn bạn đã tin tưởng lựa chọn <b>Healthcare</b>. 
                Sự hài lòng của bạn chính là động lực để chúng tôi không ngừng nâng cao chất lượng sản phẩm và dịch vụ. 
                </p>

                <p style="margin-top:30px; color:#2E86C1; font-weight:bold;"> Trân trọng,<br> Đội ngũ Healthcare </p>
            </div>
            `,
        });
    } catch (error) {
        console.log('Lỗi gửi email:', error);
    }
};

module.exports = sendMail;
