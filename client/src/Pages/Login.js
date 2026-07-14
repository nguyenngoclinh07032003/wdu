import classNames from 'classnames/bind';
import styles from '../Styles/Login.module.scss';
import request, { requestLoginFacebook, requestLoginGoogle } from '../Config/api';
import { GoogleLogin } from '@react-oauth/google';
import { GoogleOAuthProvider } from '@react-oauth/google';

import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import logo from '../assests/logo/logoxoa.jpg';

import {
    FaRegUser,
    FaLock,
    FaEye,
    FaEyeSlash,
    FaArrowRight,
    FaFacebookF,
    FaBriefcaseMedical,
    FaHeadset,
    FaShieldAlt,
    FaHeartbeat,
    FaTruck,
} from 'react-icons/fa';

const cx = classNames.bind(styles);

function LoginUser() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [facebookLoading, setFacebookLoading] = useState(false);

    const navigate = useNavigate();
    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    const facebookAppId = process.env.REACT_APP_FACEBOOK_APP_ID;

    const handleLoginUser = async () => {
        try {
            if (!email || !password) {
                toast.error('Vui lòng nhập đầy đủ thông tin!');
                return;
            }

            setLoading(true);

            const res = await request.post('/api/login', {
                email: email.trim(),
                password,
                remember,
            });

            toast.success('Đăng nhập thành công!');

            const role = res.data?.user?.role;
            const isAdmin = res.data?.user?.isAdmin;
            let redirectPath = '/';
            if (isAdmin) redirectPath = '/admin';
            else if (role === 'staff') redirectPath = '/staff';
            else if (role === 'doctor') redirectPath = '/doctor';
            else if (role === 'shipper') redirectPath = '/shipper/dashboard';

            setTimeout(() => {
                navigate(redirectPath);
                window.location.reload();
            }, 800);
        } catch (error) {
            const message = error?.response?.data?.message || 'Tài khoản hoặc mật khẩu không chính xác!';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleEnter = (e) => {
        if (e.key === 'Enter') handleLoginUser();
    };

    useEffect(() => {
        if (!facebookAppId || window.FB) return;

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: facebookAppId,
                cookie: true,
                xfbml: false,
                version: 'v20.0',
            });
        };

        if (!document.getElementById('facebook-jssdk')) {
            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = 'https://connect.facebook.net/vi_VN/sdk.js';
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
        }
    }, [facebookAppId]);

    const handleFacebookResponse = async (response) => {
        try {
            const accessToken = response?.authResponse?.accessToken;

            if (!accessToken) {
                toast.error('Không nhận được token từ Facebook!');
                return;
            }

            await requestLoginFacebook(accessToken);
            toast.success('Đăng nhập Facebook thành công!');
            navigate('/');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            const message = error?.response?.data?.message || 'Đăng nhập Facebook thất bại!';
            toast.error(message);
        } finally {
            setFacebookLoading(false);
        }
    };

    const handleFacebookLogin = () => {
        if (!facebookAppId) {
            toast.error('Facebook App ID chưa được cấu hình!');
            return;
        }

        if (!window.FB) {
            toast.error('Facebook SDK chưa sẵn sàng, vui lòng thử lại sau vài giây!');
            return;
        }

        setFacebookLoading(true);
        window.FB.login((response) => {
            handleFacebookResponse(response);
        }, { scope: 'public_profile' });
    };

    const handleSuccess = async (response) => {
        const { credential } = response;
        if (!credential) {
            toast.error('Không nhận được token từ Google!');
            return;
        }

        try {
            await requestLoginGoogle(credential);
            toast.success('Đăng nhập Google thành công!');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            navigate('/');
        } catch (error) {
            console.error('Login failed', error);
            const message = error?.response?.data?.message || 'Đăng nhập Google thất bại!';
            toast.error(message);
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
                            <img src={logo} alt="Mộc Xoa" />
                        </span>
                        <span>Mộc Xoa</span>
                    </div>
                    <div className={cx('intro')}>
                        <span className={cx('tag')}>Luôn đặt sức khỏe lên hàng đầu</span>

                        <h2>
                            Sức khỏe là lựa chọn,
                            <br />
                            <strong>không phải điều bí ẩn của sự ngẫu nhiên.</strong>
                        </h2>

                        <p>
                            Dụng cụ chăm sóc sức khỏe tại nhà, hỗ trợ mua sắm an toàn, nhanh chóng và cá nhân hóa theo
                            nhu cầu của bạn.
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

                            <h3>Smart Xoa AI</h3>

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
                    <div className={cx('copyright')}>© {new Date().getFullYear()} HealthCare Device.</div>{' '}
                </div>

                <div className={cx('authRight')}>
                    <div className={cx('formBox')}>
                        <div className={cx('formHeader')}>
                            <span className={cx('smallTitle')}>Welcome back</span>
                            <h1>Đăng nhập</h1>
                            <p>Vui lòng nhập thông tin để truy cập hệ thống</p>
                        </div>
                        <div className={cx('formGroup')}>
                            <label>Email hoặc Số điện thoại</label>

                            <div className={cx('inputWrap')}>
                                <FaRegUser />

                                <input
                                    value={email}
                                    placeholder="Nhập email hoặc số điện thoại"
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={handleEnter}
                                />
                            </div>
                        </div>
                        <div className={cx('formGroup')}>
                            <div className={cx('labelRow')}>
                                <label>Mật khẩu</label>
                                <Link to="/forgotPassword">Quên mật khẩu?</Link>
                            </div>

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
                        </div>
                        <div className={cx('rememberRow')}>
                            <label className={cx('checkbox')}>
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                />
                                <span></span>
                                Ghi nhớ đăng nhập
                            </label>
                        </div>
                        <button className={cx('submitBtn')} onClick={handleLoginUser} disabled={loading}>
                            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                            {!loading && <FaArrowRight />}
                        </button>
                        <div className={cx('divider')}>
                            <span>HOẶC ĐĂNG NHẬP BẰNG</span>
                        </div>
                        <div className={cx('socialGrid')}>
                            {googleClientId ? (
                                <div className={cx('googleWrap')}>
                                    <GoogleOAuthProvider clientId={googleClientId}>
                                        <GoogleLogin
                                            onSuccess={handleSuccess}
                                            onError={() => toast.error('Đăng nhập Google thất bại!')}
                                            theme="outline"
                                            size="large"
                                            text="signin_with"
                                            shape="pill"
                                            width="240"
                                        />
                                    </GoogleOAuthProvider>
                                </div>
                            ) : (
                                <div className={cx('googleError')}>Google OAuth client ID chưa được cấu hình.</div>
                            )}

                            <button
                                type="button"
                                className={cx('socialBtn')}
                                disabled={facebookLoading}
                                onClick={handleFacebookLogin}
                            >
                                <FaFacebookF className={cx('facebook')} />
                                {facebookLoading ? 'Đang đăng nhập...' : 'Facebook'}
                            </button>
                        </div>
                        <div className={cx('authFooter')}>
                            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
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

export default LoginUser;
