const bcrypt = require('bcrypt');
const ModelUser = require('../models/ModelUser');
const ModelRegisterOTP = require('../models/ModelRegisterOTP');
const SendMailOTP = require('../SendMail/SendMailRegisterOTP');

class ControllerRegister {
    async sendOtpRegister(req, res) {
        try {
            let { fullname, email, phone, password, confirmPassword } = req.body;

            fullname = fullname?.trim();
            email = email?.trim().toLowerCase();
            phone = phone?.trim();
            password = password?.trim();
            confirmPassword = confirmPassword?.trim();

            const blockedDomains = [
                'mailinator.com',
                '10minutemail.com',
                'tempmail.com',
                'guerrillamail.com',
                'yopmail.com',
                'trashmail.com',
                'getnada.com',
                'temp-mail.org',
            ];

            const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            const validatePhone = (value) => {
                const cleanPhone = value.replace(/\D/g, '');

                return /^(0[3|5|7|8|9][0-9]{8}|84[3|5|7|8|9][0-9]{8})$/.test(cleanPhone);
            };
            const validatePassword = (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);

            if (!fullname || !email || !phone || !password || !confirmPassword) {
                return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' });
            }

            if (!validateEmail(email)) {
                return res.status(400).json({ message: 'Email không hợp lệ' });
            }

            const domain = email.split('@')[1];
            if (blockedDomains.includes(domain)) {
                return res.status(400).json({ message: 'Không chấp nhận email tạm thời' });
            }

            if (!validatePhone(phone)) {
                return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
            }

            if (!validatePassword(password)) {
                return res.status(400).json({
                    message: 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số',
                });
            }

            if (password !== confirmPassword) {
                return res.status(400).json({ message: 'Mật khẩu không trùng khớp' });
            }

            const checkEmail = await ModelUser.findOne({ email });
            if (checkEmail) {
                return res.status(400).json({ message: 'Email đã tồn tại' });
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const hashedPassword = await bcrypt.hash(password, 10);

            await ModelRegisterOTP.findOneAndDelete({ email });

            await ModelRegisterOTP.create({
                fullname,
                email,
                phone,
                password: hashedPassword,
                otp,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            });

            try {
                await SendMailOTP(email, otp);
                console.log('OTP email sent successfully to:', email);
            } catch (emailError) {
                console.log('Email sending failed:', emailError.message);
                return res.status(500).json({
                    message: 'Không thể gửi email OTP. Vui lòng kiểm tra cấu hình Gmail trong server/.env',
                });
            }

            return res.status(200).json({
                message: 'OTP đã được gửi về email',
                email,
            });
        } catch (error) {
            console.log('sendOtpRegister error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }

    async verifyOtpRegister(req, res) {
        try {
            let { email, otp } = req.body;

            email = email?.trim().toLowerCase();
            otp = otp?.trim();

            if (!email || !otp) {
                return res.status(400).json({ message: 'Vui lòng nhập email và OTP' });
            }

            const dataOtp = await ModelRegisterOTP.findOne({ email });

            if (!dataOtp) {
                return res.status(400).json({ message: 'Không tìm thấy yêu cầu đăng ký' });
            }

            if (dataOtp.expiresAt < new Date()) {
                await ModelRegisterOTP.findOneAndDelete({ email });
                return res.status(400).json({ message: 'OTP đã hết hạn' });
            }

            if (dataOtp.otp !== otp) {
                return res.status(400).json({ message: 'OTP không chính xác' });
            }

            const checkUser = await ModelUser.findOne({ email });
            if (checkUser) {
                await ModelRegisterOTP.findOneAndDelete({ email });
                return res.status(400).json({ message: 'Email đã tồn tại' });
            }

            const phoneNumber = parseInt(dataOtp.phone.replace(/\D/g, ''));

            await ModelUser.create({
                fullname: dataOtp.fullname,
                email: dataOtp.email,
                phone: phoneNumber,
                password: dataOtp.password,
            });

            await ModelRegisterOTP.findOneAndDelete({ email });

            return res.status(200).json({
                message: 'Đăng ký tài khoản thành công',
            });
        } catch (error) {
            console.log('verifyOtpRegister error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    }
}

module.exports = new ControllerRegister();
