import classNames from 'classnames/bind';
import styles from '../../../Styles/DoctorPortal.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faRightFromBracket,
    faUserDoctor,
    faComments,
    faInbox,
    faChartPie,
} from '@fortawesome/free-solid-svg-icons';
import request from '../../../Config/api';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import logo from '../../../assests/logo/Logo.png';

const cx = classNames.bind(styles);

function SlideBar({ setCheckTypeSlideBar, checkTypeSlideBar, inboxUnreadTotal = 0 }) {
    const navigate = useNavigate();
    const [doctorInfo, setDoctorInfo] = useState({
        fullname: '',
        email: '',
        specialty: '',
    });

    useEffect(() => {
        const fetchDoctorInfo = async () => {
            try {
                const [authRes, profileRes] = await Promise.all([
                    request.get('/api/auth'),
                    request.get('/api/doctor/profile').catch(() => null),
                ]);
                const user = authRes?.data?.user || authRes?.data || {};
                setDoctorInfo({
                    fullname: user?.fullname || '',
                    email: user?.email || '',
                    specialty: profileRes?.data?.specialty || '',
                });
            } catch (error) {
                console.log('Lỗi lấy thông tin doctor:', error);
            }
        };

        fetchDoctorInfo();
    }, []);

    const handleLogout = async () => {
        try {
            await request.post('/api/logout');
        } catch (error) {
            console.log('Logout error:', error);
        } finally {
            navigate('/');
            window.location.reload();
        }
    };

    const displayName = useMemo(() => {
        const name = doctorInfo.fullname || doctorInfo.email || 'Doctor';
        return name.startsWith('BS.') || name.startsWith('BS ') ? name : `BS. ${name}`;
    }, [doctorInfo]);

    const avatarFallback = useMemo(() => {
        return (doctorInfo.fullname || doctorInfo.email || 'D').trim().charAt(0).toUpperCase();
    }, [doctorInfo]);

    return (
        <aside className={cx('sidebar')}>
            <div className={cx('brand')}>
                <div className={cx('brandIcon')}>
                    <img src={logo} alt="logo" />
                </div>
                <div className={cx('brandText')}>
                    <h3>Healthcare</h3>
                    <span>Doctor Portal</span>
                </div>
            </div>

            <ul className={cx('menuList')}>
                <li
                    onClick={() => setCheckTypeSlideBar(0)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 0 })}
                >
                    <span className={cx('menuIcon')}>
                        <FontAwesomeIcon icon={faChartPie} />
                    </span>
                    <span>Tổng quan</span>
                </li>
                <li
                    onClick={() => setCheckTypeSlideBar(1)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 1 })}
                >
                    <span className={cx('menuIcon')}>
                        <FontAwesomeIcon icon={faUserDoctor} />
                    </span>
                    <span>Hồ sơ & Chứng chỉ</span>
                </li>
                <li
                    onClick={() => setCheckTypeSlideBar(2)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 2 })}
                >
                    <span className={cx('menuIcon')}>
                        <FontAwesomeIcon icon={faComments} />
                    </span>
                    <span>Hỏi đáp AI</span>
                </li>
                <li
                    onClick={() => setCheckTypeSlideBar(3)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 3 })}
                >
                    <span className={cx('menuIcon')}>
                        <FontAwesomeIcon icon={faInbox} />
                    </span>
                    <span style={{ flex: 1 }}>Câu hỏi khách hàng</span>
                    {inboxUnreadTotal > 0 ? (
                        <span className={cx('menuBadge')}>
                            {inboxUnreadTotal > 99 ? '99+' : inboxUnreadTotal}
                        </span>
                    ) : null}
                </li>
            </ul>

            <div className={cx('sideFooter')}>
                <div className={cx('profileCard')}>
                    <div className={cx('avatar')}>
                        {avatarFallback}
                        <span className={cx('onlineDot')} />
                    </div>
                    <div className={cx('profileText')}>
                        <strong>{displayName}</strong>
                        <span>{doctorInfo.specialty || 'Bác sĩ chuyên môn'}</span>
                        <span className={cx('onlineLabel')}>Đang hoạt động</span>
                    </div>
                </div>

                <button type="button" className={cx('logoutBtn')} onClick={handleLogout}>
                    <FontAwesomeIcon icon={faRightFromBracket} />
                    Đăng xuất
                </button>
            </div>
        </aside>
    );
}

export default SlideBar;
