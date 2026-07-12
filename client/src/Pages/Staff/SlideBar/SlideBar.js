import classNames from 'classnames/bind';
import styles from '../../Admin/SlideBar/Slidebar.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBagShopping,
    faCartPlus,
    faRightFromBracket,
    faHome,
    faGear,
    faInbox,
    faHeadset,
} from '@fortawesome/free-solid-svg-icons';
import request from '../../../Config/api';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import logo from '../../../assests/logo/logoxoa.jpg';

const cx = classNames.bind(styles);

function SlideBar({ setCheckTypeSlideBar, checkTypeSlideBar, supportPendingCount = 0 }) {
    const navigate = useNavigate();

    const [staffInfo, setStaffInfo] = useState({
        fullname: '',
        email: '',
        avatar: '',
        role: 'staff',
    });

    useEffect(() => {
        const fetchStaffInfo = async () => {
            try {
                const res = await request.get('/api/auth');
                const user = res?.data?.user || res?.data || {};

                setStaffInfo({
                    fullname: user?.fullname || '',
                    email: user?.email || '',
                    avatar: user?.avatar || '',
                    role: user?.role || 'staff',
                });
            } catch (error) {
                console.log('Lỗi lấy thông tin staff:', error);
            }
        };

        fetchStaffInfo();
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
        return staffInfo.fullname || staffInfo.email || 'Staff';
    }, [staffInfo]);

    const avatarFallback = useMemo(() => {
        return displayName?.trim()?.charAt(0)?.toUpperCase() || 'S';
    }, [displayName]);

    return (
        <div className={cx('wrapper')}>
            <div className={cx('brand')}>
                <div className={cx('brandIcon')}>
                    <img src={logo} alt="logo" />
                </div>

                <div className={cx('brandText')}>
                    <h3>Mộc Xoa</h3>
                    <span>Staff Panel</span>
                </div>
            </div>

            <ul className={cx('menuList')}>
                <li
                    onClick={() => setCheckTypeSlideBar(1)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 1 })}
                >
                    <span className={cx('icon')}>
                        <FontAwesomeIcon icon={faHome} />
                    </span>
                    <span>Dashboard</span>
                </li>

                <li
                    onClick={() => setCheckTypeSlideBar(2)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 2 })}
                >
                    <span className={cx('icon')}>
                        <FontAwesomeIcon icon={faCartPlus} />
                    </span>
                    <span>Đơn hàng</span>
                </li>

                <li
                    onClick={() => setCheckTypeSlideBar(3)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 3 })}
                >
                    <span className={cx('icon')}>
                        <FontAwesomeIcon icon={faBagShopping} />
                    </span>
                    <span>Sản phẩm</span>
                </li>

                <li
                    onClick={() => setCheckTypeSlideBar(4)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 4 })}
                >
                    <span className={cx('icon')}>
                        <FontAwesomeIcon icon={faGear} />
                    </span>
                    <span>Quản lý Shipping</span>
                </li>

                <li
                    onClick={() => setCheckTypeSlideBar(5)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 5 })}
                >
                    <span className={cx('icon')}>
                        <FontAwesomeIcon icon={faInbox} />
                    </span>
                    <span>Câu hỏi khách hàng</span>
                </li>

                <li
                    onClick={() => setCheckTypeSlideBar(6)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 6 })}
                >
                    <span className={cx('icon')}>
                        <FontAwesomeIcon icon={faHeadset} />
                    </span>
                    <span style={{ flex: 1 }}>Yêu cầu hỗ trợ</span>
                    {supportPendingCount > 0 ? (
                        <span className={cx('menuBadge')}>{supportPendingCount}</span>
                    ) : null}
                </li>
            </ul>

            <div className={cx('footer')}>
                <div className={cx('adminInfo')}>
                    <div className={cx('avatar')} style={{ display: 'flex' }}>
                        {avatarFallback}
                    </div>

                    <div className={cx('adminText')}>
                        <strong>{displayName}</strong>
                        <span>Nhân viên vận hành</span>
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
