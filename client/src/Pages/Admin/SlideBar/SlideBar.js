import classNames from 'classnames/bind';
import styles from './Slidebar.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBagShopping,
    faCartPlus,
    faRightFromBracket,
    faUsers,
    faHome,
    faBlog,
    faGear,
    faGift,
    faUserDoctor,
    faHeadset,
} from '@fortawesome/free-solid-svg-icons';
import request from '../../../Config/api';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import logo from '../../../assests/logo/Logo.png';

const cx = classNames.bind(styles);

function SlideBar({ setCheckTypeSlideBar, checkTypeSlideBar, supportPendingCount = 0 }) {
    const navigate = useNavigate();

    const [adminInfo, setAdminInfo] = useState({
        fullname: '',
        username: '',
        name: '',
        email: '',
        avatar: '',
        isAdmin: false,
    });

    useEffect(() => {
        const fetchAdminInfo = async () => {
            try {
                const res = await request.get('/api/auth');
                const user = res?.data?.user || res?.data || {};

                setAdminInfo({
                    fullname: user?.fullname || '',
                    username: user?.username || '',
                    name: user?.name || '',
                    email: user?.email || '',
                    avatar: user?.avatar || '',
                    isAdmin: user?.isAdmin || false,
                });
            } catch (error) {
                console.log('Lỗi lấy thông tin admin:', error);
            }
        };

        fetchAdminInfo();
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
        return adminInfo.fullname || adminInfo.name || adminInfo.username || adminInfo.email || 'Admin';
    }, [adminInfo]);

    const displayRole = useMemo(() => {
        return adminInfo.isAdmin ? 'Administrator' : 'Manager';
    }, [adminInfo]);

    const avatarUrl = useMemo(() => {
        if (!adminInfo.avatar) return '';

        if (adminInfo.avatar.startsWith('http://') || adminInfo.avatar.startsWith('https://')) {
            return adminInfo.avatar;
        }

        return adminInfo.avatar;
    }, [adminInfo.avatar]);

    const avatarFallback = useMemo(() => {
        return displayName?.trim()?.charAt(0)?.toUpperCase() || 'A';
    }, [displayName]);

    return (
        <div className={cx('wrapper')}>
            <div className={cx('brand')}>
                <div className={cx('brandIcon')}>
                    <img src={logo} alt="logo" />
                </div>

                <div className={cx('brandText')}>
                    <h3>Healthcare</h3>
                    <span>Admin Panel</span>
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
                        <FontAwesomeIcon icon={faUsers} />
                    </span>
                    <span>Khách hàng</span>
                </li>

                <li
                    onClick={() => setCheckTypeSlideBar(5)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 5 })}
                >
                    <span className={cx('icon')}>
                        <FontAwesomeIcon icon={faGift} />
                    </span>
                    <span>Khuyến mãi</span>
                </li>

                <li
                    onClick={() => setCheckTypeSlideBar(6)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 6 })}
                >
                    <span className={cx('icon')}>
                        <FontAwesomeIcon icon={faBlog} />
                    </span>
                    <span>Quản lý Blog</span>
                </li>

                <li
                    onClick={() => setCheckTypeSlideBar(7)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 7 })}
                >
                    <span className={cx('icon')}>
                        <FontAwesomeIcon icon={faGear} />
                    </span>
                    <span>Quản Lý Shipping</span>
                </li>

                <li
                    onClick={() => setCheckTypeSlideBar(8)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 8 })}
                >
                    <span className={cx('icon')}>
                        <FontAwesomeIcon icon={faUserDoctor} />
                    </span>
                    <span>Duyệt Bác sĩ</span>
                </li>

                <li
                    onClick={() => setCheckTypeSlideBar(9)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 9 })}
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
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={displayName}
                            className={cx('avatarImage')}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const next = e.currentTarget.nextSibling;
                                if (next) next.style.display = 'flex';
                            }}
                        />
                    ) : null}

                    <div className={cx('avatar')} style={{ display: avatarUrl ? 'none' : 'flex' }}>
                        {avatarFallback}
                    </div>

                    <div className={cx('adminText')}>
                        <strong>{displayName}</strong>
                        <span>{displayRole}</span>
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
            <div className={cx('copyright')}>© {new Date().getFullYear()} Healthcare</div>{' '}
        </div>
    );
}

export default SlideBar;
