import classNames from 'classnames/bind';
import styles from '../../Admin/SlideBar/Slidebar.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faRightFromBracket,
    faHome,
    faUserDoctor,
    faComments,
    faInbox,
} from '@fortawesome/free-solid-svg-icons';
import request from '../../../Config/api';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import logo from '../../../assests/logo/Logo.png';

const cx = classNames.bind(styles);

function SlideBar({ setCheckTypeSlideBar, checkTypeSlideBar }) {
    const navigate = useNavigate();
    const [doctorInfo, setDoctorInfo] = useState({
        fullname: '',
        email: '',
    });

    useEffect(() => {
        const fetchDoctorInfo = async () => {
            try {
                const res = await request.get('/api/auth');
                const user = res?.data?.user || res?.data || {};
                setDoctorInfo({
                    fullname: user?.fullname || '',
                    email: user?.email || '',
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

    const handleHome = () => {
        navigate('/');
        window.location.reload();
    };

    const displayName = useMemo(() => {
        return doctorInfo.fullname || doctorInfo.email || 'Doctor';
    }, [doctorInfo]);

    const avatarFallback = useMemo(() => {
        return displayName?.trim()?.charAt(0)?.toUpperCase() || 'D';
    }, [displayName]);

    return (
        <div className={cx('wrapper')}>
            <div className={cx('brand')}>
                <div className={cx('brandIcon')}>
                    <img src={logo} alt="logo" />
                </div>

                <div className={cx('brandText')}>
                    <h3>HealthCare Device</h3>
                    <span>Doctor Panel</span>
                </div>
            </div>

            <ul className={cx('menuList')}>
                <li
                    onClick={() => setCheckTypeSlideBar(1)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 1 })}
                >
                    <span className={cx('icon')}>
                        <FontAwesomeIcon icon={faUserDoctor} />
                    </span>
                    <span>Hồ sơ & Chứng chỉ</span>
                </li>

                <li
                    onClick={() => setCheckTypeSlideBar(2)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 2 })}
                >
                    <span className={cx('icon')}>
                        <FontAwesomeIcon icon={faComments} />
                    </span>
                    <span>Hỏi đáp AI</span>
                </li>

                <li
                    onClick={() => setCheckTypeSlideBar(3)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 3 })}
                >
                    <span className={cx('icon')}>
                        <FontAwesomeIcon icon={faInbox} />
                    </span>
                    <span>Câu hỏi khách hàng</span>
                </li>
            </ul>

            <div className={cx('footer')}>
                <div className={cx('adminInfo')}>
                    <div className={cx('avatar')} style={{ display: 'flex' }}>
                        {avatarFallback}
                    </div>

                    <div className={cx('adminText')}>
                        <strong>{displayName}</strong>
                        <span>Bác sĩ chuyên môn</span>
                    </div>
                </div>

                <div className={cx('footerActions')}>
                    <button type="button" onClick={handleHome} className={cx('footerBtn')}>
                        <FontAwesomeIcon icon={faHome} />
                    </button>

                    <button type="button" onClick={handleLogout} className={cx('footerBtn', 'logoutBtn')}>
                        <FontAwesomeIcon icon={faRightFromBracket} />
                    </button>
                </div>
            </div>

            <div className={cx('copyright')}>© {new Date().getFullYear()} HealthCare Device</div>
        </div>
    );
}

export default SlideBar;
