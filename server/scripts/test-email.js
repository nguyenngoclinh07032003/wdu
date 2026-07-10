require('./src/Config/loadEnv');

const createMailTransport = require('../src/SendMail/mailTransport');

async function main() {
    const to = process.argv[2] || process.env.EMAIL_USER;

    if (!to) {
        console.error('Usage: node scripts/test-email.js [email-nhan]');
        process.exit(1);
    }

    const transport = await createMailTransport();

    await transport.sendMail({
        from: `"Mộc Xoa Store" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Test gửi OTP - Mộc Xoa',
        html: '<p>Gmail đã cấu hình thành công. Bạn có thể đăng ký và nhận OTP qua email.</p>',
    });

    console.log('Da gui email test den:', to);
}

main().catch((error) => {
    console.error('Loi:', error.message);
    process.exit(1);
});
