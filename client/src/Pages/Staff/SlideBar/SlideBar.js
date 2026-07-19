import classNames from 'classnames/bind';
import styles from '../../../Styles/StaffPortal.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBagShopping,
    faCartPlus,
    faRightFromBracket,
    faChartPie,
    faTruck,
    faInbox,
    faHeadset,
} from '@fortawesome/free-solid-svg-icons';
import request from '../../../Config/api';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import logo from '../../../assests/logo/Logo.png';

const cx = classNames.bind(styles);

function SlideBar({
    setCheckTypeSlideBar,
    checkTypeSlideBar,
    supportPendingCount = 0,
    inboxUnreadTotal = 0,
}) {
    const navigate = useNavigate();
    const [staffInfo, setStaffInfo] = useState({
        fullname: '',
        email: '',
    });
    const [unassignedShippingCount, setUnassignedShippingCount] = useState(0);
    const [orderAttentionCount, setOrderAttentionCount] = useState(0);

    useEffect(() => {
        const fetchStaffInfo = async () => {
            try {
                const res = await request.get('/api/auth');
                const user = res?.data?.user || res?.data || {};
                setStaffInfo({
                    fullname: user?.fullname || '',
                    email: user?.email || '',
                });
            } catch (error) {
                console.log('Lỗi lấy thông tin staff:', error);
            }
        };
        fetchStaffInfo();
    }, []);

    useEffect(() => {
        const fetchUnassignedShippingCount = async () => {
            try {
                const res = await request.get('/api/getallorder');
                const orders = Array.isArray(res.data) ? res.data : [];
                const count = orders.filter((item) => {
                    const status = String(item?.status || '').toLowerCase();
                    return !item?.shipperId && status === 'confirmed';
                }).length;
                const attentionCount = orders.filter((item) =>
                    ['pending', 'confirmed', 'shipping'].includes(String(item?.status || '').toLowerCase()),
                ).length;

                setUnassignedShippingCount(count);
                setOrderAttentionCount(attentionCount);
            } catch (error) {
                console.log('Lỗi lấy số đơn chưa gán shipper:', error);
                setUnassignedShippingCount(0);
                setOrderAttentionCount(0);
            }
        };

        fetchUnassignedShippingCount();
        const intervalId = setInterval(fetchUnassignedShippingCount, 30000);
        window.addEventListener('shipping-assignment-updated', fetchUnassignedShippingCount);
        window.addEventListener('order-status-updated', fetchUnassignedShippingCount);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener('shipping-assignment-updated', fetchUnassignedShippingCount);
            window.removeEventListener('order-status-updated', fetchUnassignedShippingCount);
        };
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

    const displayName = useMemo(
        () => staffInfo.fullname || staffInfo.email || 'Staff',
        [staffInfo],
    );
    const avatarFallback = useMemo(
        () => displayName.trim().charAt(0).toUpperCase() || 'S',
        [displayName],
    );

    return (
        <aside className={cx('sidebar')}>
            <div className={cx('brand')}>
                <div className={cx('brandIcon')}>
                    <img src={logo} alt="logo" />
                </div>
                <div className={cx('brandText')}>
                    <h3>Healthcare</h3>
                    <span>Staff Panel</span>
                </div>
            </div>

            <ul className={cx('menuList')}>
                <li
                    onClick={() => setCheckTypeSlideBar(1)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 1 })}
                >
                    <span className={cx('menuIcon')}>
                        <FontAwesomeIcon icon={faChartPie} />
                    </span>
                    <span>Dashboard</span>
                </li>
                <li
                    onClick={() => setCheckTypeSlideBar(2)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 2 })}
                >
                    <span className={cx('menuIcon')}>
                        <FontAwesomeIcon icon={faCartPlus} />
                    </span>
                    <span style={{ flex: 1 }}>Đơn hàng</span>
                    {orderAttentionCount > 0 ? (
                        <span className={cx('menuBadge')} title={`${orderAttentionCount} đơn cần theo dõi`}>
                            !
                        </span>
                    ) : null}
                </li>
                <li
                    onClick={() => setCheckTypeSlideBar(3)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 3 })}
                >
                    <span className={cx('menuIcon')}>
                        <FontAwesomeIcon icon={faBagShopping} />
                    </span>
                    <span>Sản phẩm</span>
                </li>
                <li
                    onClick={() => setCheckTypeSlideBar(4)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 4 })}
                >
                    <span className={cx('menuIcon')}>
                        <FontAwesomeIcon icon={faTruck} />
                    </span>
                    <span style={{ flex: 1 }}>Quản lý Shipping</span>
                    {unassignedShippingCount > 0 ? (
                        <span className={cx('menuBadge')} title={`${unassignedShippingCount} đơn chưa gán shipper`}>
                            !
                        </span>
                    ) : null}
                </li>
                <li
                    onClick={() => setCheckTypeSlideBar(5)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 5 })}
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
                <li
                    onClick={() => setCheckTypeSlideBar(6)}
                    className={cx('menuItem', { active: checkTypeSlideBar === 6 })}
                >
                    <span className={cx('menuIcon')}>
                        <FontAwesomeIcon icon={faHeadset} />
                    </span>
                    <span style={{ flex: 1 }}>Yêu cầu hỗ trợ</span>
                    {supportPendingCount > 0 ? (
                        <span className={cx('menuBadge')}>{supportPendingCount}</span>
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
                        <span>Nhân viên hỗ trợ</span>
                        <span className={cx('onlineLabel')}>
                            NV
                            {(() => {
                                const digits = String(staffInfo.email || '')
                                    .replace(/\D/g, '')
                                    .slice(-5);
                                return digits ? digits.padStart(5, '0') : '00123';
                            })()}
                        </span>
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
