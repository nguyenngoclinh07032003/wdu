import classNames from 'classnames/bind';
import styles from '../Styles/ForgotPassword.module.scss';
import request from '../Config/api';
import logo from '../assests/logo/Logo.png';

import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import {
    FaArrowLeft,
    FaArrowRight,
    FaBriefcaseMedical,
    FaEnvelope,
    FaHeadset,
    FaHeartbeat,
    FaKey,
    FaLock,
    FaShieldAlt,
    FaTruck,
    FaEye,
    FaEyeSlash,
} from 'react-icons/fa';

const cx = classNames.bind(styles);

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isResetPassword, setIsResetPassword] = useState(false);
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loadingSendOtp, setLoadingSendOtp] = useState(false);
    const [loadingReset, setLoadingReset] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const handleForgotPassword = async () => {
        try {
            if (!email.trim()) {
                toast.error('Vui lòng nhập email!');
                return;
            }

            setLoadingSendOtp(true);

            const res = await request.post('/api/forgotpassword', {
                email: email.trim(),
            });

            toast.success(res.data.message || 'Mã OTP đã được gửi đến email của bạn!');

            if (res.status === 200) {
                setTimeout(() => {
                    setIsResetPassword(true);
                }, 800);
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể gửi yêu cầu');
        } finally {
            setLoadingSendOtp(false);
        }
    };

    const handleResetPassword = async () => {
        try {
            if (!otp.trim() || !newPassword.trim()) {
                toast.error('Vui lòng nhập OTP và mật khẩu mới!');
                return;
            }

            if (newPassword.length < 6) {
                toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!');
                return;
            }

            setLoadingReset(true);

            const res = await request.post('/api/resetpassword', {
                email: email.trim(),
                otp: otp.trim(),
                newPassword,
            });

            toast.success(res.data.message || 'Đặt lại mật khẩu thành công!');

            if (res.status === 200) {
                setTimeout(() => {
                    navigate('/login');
                }, 900);
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Đặt lại mật khẩu thất bại');
        } finally {
            setLoadingReset(false);
        }
    };

    const handleEnterSendOtp = (e) => {
        if (e.key === 'Enter') handleForgotPassword();
    };

    const handleEnterReset = (e) => {
        if (e.key === 'Enter') handleResetPassword();
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
                            <img src={logo} alt="Healthcare" />
                        </span>
                        <span>Healthcare</span>
                    </div>
                    <div className={cx('intro')}>
                        <span className={cx('tag')}>Khôi phục tài khoản an toàn</span>

                        <h2>
                            Đặt lại mật khẩu,
                            <br />
                            <strong>an toàn.</strong>
                        </h2>

                        <p>
                            Nhận mã OTP qua email để xác minh tài khoản và thiết lập lại mật khẩu mới một cách an toàn.
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
                                <FaKey />
                            </div>

                            <span className={cx('orbitDot', 'dotOne')}>
                                <FaShieldAlt />
                            </span>

                            <span className={cx('orbitDot', 'dotTwo')}>
                                <FaTruck />
                            </span>

                            <span className={cx('orbitDot', 'dotThree')}>
                                <FaHeartbeat />
                            </span>
                        </div>

                        <div className={cx('glassPanel')}>
                            <div className={cx('panelTop')}>
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>

                            <h3>Account Security</h3>

                            <div className={cx('healthLine')}>
                                <svg viewBox="0 0 320 100">
                                    <polyline points="0,52 38,52 56,28 84,78 116,35 145,52 188,52 218,20 250,76 320,52" />
                                </svg>
                            </div>

                            <div className={cx('miniStats')}>
                                <div>
                                    <strong>OTP</strong>
                                    <span>Xác minh</span>
                                </div>

                                <div>
                                    <strong>Safe</strong>
                                    <span>Bảo mật</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={cx('copyright')}>© {new Date().getFullYear()} Healthcare.</div>{' '}
                </div>

                <div className={cx('authRight')}>
                    <div className={cx('formBox')}>
                        {!isResetPassword ? (
                            <>
                                <div className={cx('formHeader')}>
                                    <span className={cx('smallTitle')}>Forgot password</span>
                                    <h1>Quên mật khẩu</h1>
                                    <p>Nhập email tài khoản để nhận mã OTP đặt lại mật khẩu</p>
                                </div>

                                <div className={cx('formGroup')}>
                                    <label>Email tài khoản</label>

                                    <div className={cx('inputWrap')}>
                                        <FaEnvelope />

                                        <input
                                            value={email}
                                            placeholder="Nhập email của bạn"
                                            onChange={(e) => setEmail(e.target.value)}
                                            onKeyDown={handleEnterSendOtp}
                                        />
                                    </div>
                                </div>

                                <button
                                    className={cx('submitBtn')}
                                    onClick={handleForgotPassword}
                                    disabled={loadingSendOtp}
                                >
                                    {loadingSendOtp ? 'Đang gửi OTP...' : 'Gửi mã OTP'}
                                    {!loadingSendOtp && <FaArrowRight />}
                                </button>

                                <div className={cx('authFooter')}>
                                    <Link to="/login">
                                        <FaArrowLeft />
                                        Quay lại đăng nhập
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className={cx('formHeader')}>
                                    <span className={cx('smallTitle')}>Reset password</span>
                                    <h1>Thiết lập mật khẩu mới</h1>
                                    <p>Nhập mã OTP đã gửi đến email và mật khẩu mới của bạn</p>
                                </div>

                                <div className={cx('noticeBox')}>
                                    OTP đã được gửi đến <strong>{email}</strong>
                                </div>

                                <div className={cx('formGroup')}>
                                    <label>Mã OTP</label>

                                    <div className={cx('inputWrap')}>
                                        <FaKey />

                                        <input
                                            value={otp}
                                            placeholder="Nhập mã OTP"
                                            onChange={(e) => setOtp(e.target.value)}
                                            onKeyDown={handleEnterReset}
                                        />
                                    </div>
                                </div>

                                <div className={cx('formGroup')}>
                                    <label>Mật khẩu mới</label>

                                    <div className={cx('inputWrap')}>
                                        <FaLock />

                                        <input
                                            value={newPassword}
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Nhập mật khẩu mới"
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            onKeyDown={handleEnterReset}
                                        />

                                        <button
                                            type="button"
                                            className={cx('eyeBtn')}
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    className={cx('submitBtn')}
                                    onClick={handleResetPassword}
                                    disabled={loadingReset}
                                >
                                    {loadingReset ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
                                    {!loadingReset && <FaArrowRight />}
                                </button>

                                <div className={cx('authFooter')}>
                                    <button
                                        type="button"
                                        className={cx('backBtn')}
                                        onClick={() => setIsResetPassword(false)}
                                    >
                                        <FaArrowLeft />
                                        Đổi email khác
                                    </button>
                                </div>
                            </>
                        )}
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

export default ForgotPassword;
