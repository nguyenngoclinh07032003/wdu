import classNames from 'classnames/bind';
import styles from '../Styles/Login.module.scss';
import request from '../Config/api';
import logo from '../assests/logo/Logo.png';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import {
    FaRegUser,
    FaEnvelope,
    FaPhone,
    FaLock,
    FaEye,
    FaEyeSlash,
    FaArrowRight,
    FaBriefcaseMedical,
    FaHeadset,
    FaShieldAlt,
    FaHeartbeat,
    FaTruck,
    FaKey,
} from 'react-icons/fa';

const cx = classNames.bind(styles);

function RegisterUser() {
    const [fullname, setFullname] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showOtpBox, setShowOtpBox] = useState(false);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const validatePassword = (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);

    const handleRegister = async () => {
        try {
            if (!fullname || !email || !phone || !password || !confirmPassword) {
                toast.error('Vui lòng nhập đầy đủ thông tin!');
                return;
            }

            if (!validatePassword(password)) {
                toast.error('Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số');
                return;
            }

            if (password !== confirmPassword) {
                toast.error('Mật khẩu xác nhận không khớp!');
                return;
            }

            setLoading(true);

            const res = await request.post('/api/send-otp', {
                fullname: fullname.trim(),
                email: email.trim(),
                phone: phone.trim(),
                password,
                confirmPassword,
            });

            toast.success(res.data.message || 'OTP đã được gửi về email!');
            setShowOtpBox(true);
        } catch (error) {
            const message = error?.response?.data?.message || 'Gửi OTP thất bại!';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        try {
            if (!otp.trim()) {
                toast.error('Vui lòng nhập mã OTP!');
                return;
            }

            setLoading(true);

            const res = await request.post('/api/verify-otp', {
                email: email.trim(),
                otp: otp.trim(),
            });

            toast.success(res.data.message || 'Đăng ký tài khoản thành công!');

            setTimeout(() => {
                navigate('/login');
            }, 900);
        } catch (error) {
            const message = error?.response?.data?.message || 'Xác minh OTP thất bại!';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleEnter = (e) => {
        if (e.key !== 'Enter') return;

        if (showOtpBox) {
            handleVerifyOtp();
        } else {
            handleRegister();
        }
    };

    return (
        <div className={cx('authPage')}>
            <ToastContainer position="top-right" autoClose={1800} />

            <div className={cx('decor', 'decorOne')}></div>
            <div className={cx('decor', 'decorTwo')}></div>
            <div className={cx('decor', 'decorThree')}></div>

            <div className={cx('authCard')}>
                <div className={cx('authLeft')}>
                    <div className={cx('brand')}>
                        <span className={cx('brandLogo')}>
                            <img src={logo} alt="HealthCare Device" />
                        </span>
                        <span>HealthCare Device</span>
                    </div>

                    <div className={cx('intro')}>
                        <span className={cx('tag')}>Luôn đặt sức khỏe lên hàng đầu</span>

                        <h2>
                            Sức khỏe là lựa chọn,
                            <br />
                            <strong>không phải điều bí ẩn của sự ngẫu nhiên.</strong>
                        </h2>

                        <p>
                            Tạo tài khoản để theo dõi đơn hàng, lưu địa chỉ, nhận ưu đãi và trải nghiệm mua sắm thiết bị
                            chăm sóc sức khỏe tiện lợi hơn.
                        </p>
                    </div>

                    <div className={cx('visualBox')}>
                        <div className={cx('bubbleLayer')}>
                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>

                        <div className={cx('orbit')}>
                            <div className={cx('centerPulse')}>
                                <FaHeartbeat />
                            </div>

                            <span className={cx('orbitDot', 'dotOne')}>
                                <FaShieldAlt />
                            </span>

                            <span className={cx('orbitDot', 'dotTwo')}>
                                <FaTruck />
                            </span>

                            <span className={cx('orbitDot', 'dotThree')}>
                                <FaBriefcaseMedical />
                            </span>
                        </div>

                        <div className={cx('glassPanel')}>
                            <div className={cx('panelTop')}>
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>

                            <h3>Smart Health AI</h3>

                            <div className={cx('healthLine')}>
                                <svg viewBox="0 0 320 100">
                                    <polyline points="0,52 38,52 56,28 84,78 116,35 145,52 188,52 218,20 250,76 320,52" />
                                </svg>
                            </div>

                            <div className={cx('miniStats')}>
                                <div>
                                    <strong>An toàn</strong>
                                    <span>Sản phẩm</span>
                                </div>

                                <div>
                                    <strong>24/7</strong>
                                    <span>Hỗ trợ</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={cx('copyright')}>© {new Date().getFullYear()} HealthCare Device.</div>
                </div>

                <div className={cx('authRight')}>
                    <div className={cx('formBox')}>
                        <div className={cx('formHeader')}>
                            <span className={cx('smallTitle')}>Create account</span>
                            <h1>Đăng ký</h1>
                            <p>
                                {showOtpBox
                                    ? 'Nhập mã OTP đã được gửi về email của bạn'
                                    : 'Tạo tài khoản mới để sử dụng hệ thống'}
                            </p>
                        </div>

                        {!showOtpBox && (
                            <>
                                <div className={cx('formGroup')}>
                                    <label>Họ và tên</label>
                                    <div className={cx('inputWrap')}>
                                        <FaRegUser />
                                        <input
                                            value={fullname}
                                            placeholder="Nhập họ và tên"
                                            onChange={(e) => setFullname(e.target.value)}
                                            onKeyDown={handleEnter}
                                        />
                                    </div>
                                </div>

                                <div className={cx('formGroup')}>
                                    <label>Email</label>
                                    <div className={cx('inputWrap')}>
                                        <FaEnvelope />
                                        <input
                                            value={email}
                                            placeholder="Nhập email"
                                            onChange={(e) => setEmail(e.target.value)}
                                            onKeyDown={handleEnter}
                                        />
                                    </div>
                                </div>

                                <div className={cx('formGroup')}>
                                    <label>Số điện thoại</label>
                                    <div className={cx('inputWrap')}>
                                        <FaPhone />
                                        <input
                                            value={phone}
                                            placeholder="Nhập số điện thoại"
                                            onChange={(e) => setPhone(e.target.value)}
                                            onKeyDown={handleEnter}
                                        />
                                    </div>
                                </div>

                                <div className={cx('formGroup')}>
                                    <label>Mật khẩu</label>
                                    <div className={cx('inputWrap')}>
                                        <FaLock />
                                        <input
                                            value={password}
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Nhập mật khẩu"
                                            onChange={(e) => setPassword(e.target.value)}
                                            onKeyDown={handleEnter}
                                        />

                                        <button
                                            type="button"
                                            className={cx('eyeBtn')}
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                    <p className={cx('passwordHint')}>
                                        Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số
                                    </p>
                                </div>

                                <div className={cx('formGroup')}>
                                    <label>Xác nhận mật khẩu</label>
                                    <div className={cx('inputWrap')}>
                                        <FaLock />
                                        <input
                                            value={confirmPassword}
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Nhập lại mật khẩu"
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            onKeyDown={handleEnter}
                                        />
                                    </div>
                                </div>

                                <button className={cx('submitBtn')} onClick={handleRegister} disabled={loading}>
                                    {loading ? 'Đang gửi OTP...' : 'Gửi OTP'}
                                    {!loading && <FaArrowRight />}
                                </button>
                            </>
                        )}

                        {showOtpBox && (
                            <>
                                <div className={cx('formGroup')}>
                                    <label>Mã OTP</label>
                                    <div className={cx('inputWrap')}>
                                        <FaKey />
                                        <input
                                            value={otp}
                                            placeholder="Nhập mã OTP 6 số"
                                            maxLength={6}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                            onKeyDown={handleEnter}
                                        />
                                    </div>
                                    <p className={cx('passwordHint')}>OTP có hiệu lực trong 5 phút.</p>
                                </div>

                                <button className={cx('submitBtn')} onClick={handleVerifyOtp} disabled={loading}>
                                    {loading ? 'Đang xác minh...' : 'Xác minh OTP'}
                                    {!loading && <FaArrowRight />}
                                </button>

                                <button
                                    type="button"
                                    className={cx('backBtn')}
                                    onClick={() => {
                                        setShowOtpBox(false);
                                        setOtp('');
                                    }}
                                    disabled={loading}
                                >
                                    Quay lại sửa thông tin
                                </button>
                            </>
                        )}

                        <div className={cx('authFooter')}>
                            Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
                        </div>
                    </div>
                </div>
            </div>

            <button className={cx('supportBtn')}>
                <FaHeadset />
                Hỗ trợ kỹ thuật
            </button>
        </div>
    );
}

export default RegisterUser;
