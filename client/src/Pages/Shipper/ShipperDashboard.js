import classNames from 'classnames/bind';
import styles from './ShipperDashboard.module.scss';
import { toast } from 'react-toastify';
import request from '../../Config/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import logo from '../../assests/logo/Logo.png';
import {
    getShipperOverview,
    getShipperHistory,
    putOrderDeliveryStatus,
    getMe,
} from '../../services/shipperService';
import {
    getDeliveryStatusInfo,
    formatOrderCode,
    resolveDeliveryStatus,
    isRedeliveryScheduleReady,
} from '../../utils/deliveryStatus';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import DeliveryFailureModal from './DeliveryFailureModal';
import {
    FaBell,
    FaBox,
    FaCheck,
    FaCheckCircle,
    FaClock,
    FaExclamationCircle,
    FaHeadset,
    FaHome,
    FaMapMarkerAlt,
    FaPhoneAlt,
    FaRedo,
    FaSignOutAlt,
    FaSync,
    FaTimes,
    FaTruck,
} from 'react-icons/fa';

const cx = classNames.bind(styles);

function formatDateTime(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function formatTime(value) {
    if (!value) return '--:--';
    return new Date(value).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatRelative(value) {
    if (!value) return '';
    const date = new Date(value);
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)} giờ trước`;
    return formatDateTime(value);
}

function getCustomerName(order) {
    return order?.userId?.fullname || order?.fullname || order?.customer || 'Khách hàng';
}

function getCustomerPhone(order) {
    return order?.userId?.phone || order?.phone || '';
}

function getAddress(order) {
    return order?.address || order?.deliveryAddress || order?.addressUser || 'Chưa có địa chỉ';
}

function getDistrictHint(address) {
    if (!address) return '—';
    const parts = String(address)
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
    if (parts.length >= 2) return parts.slice(-2).join(', ');
    return parts[0] || '—';
}

const NOTIF_ICON = {
    assigned: FaBox,
    progress: FaSync,
    success: FaCheckCircle,
    failed: FaExclamationCircle,
    support: FaHeadset,
};

function ShipperDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [stats, setStats] = useState({
        totalReceived: 0,
        waitingPickup: 0,
        shipping: 0,
        completedToday: 0,
        successRate: 0,
    });
    const [orders, setOrders] = useState([]);
    const [history, setHistory] = useState([]);
    const [todaySchedule, setTodaySchedule] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [updatedAt, setUpdatedAt] = useState(null);
    const [failModal, setFailModal] = useState({ open: false, mode: 'first', orderId: null });

    const loadOverview = useCallback(async () => {
        try {
            setLoading(true);
            const [meRes, overviewRes] = await Promise.all([getMe(), getShipperOverview()]);
            const user = meRes.data?.user;

            if (!user) {
                toast.error('Bạn cần đăng nhập lại');
                navigate('/login');
                return;
            }

            if (user.role !== 'shipper') {
                toast.error('Bạn không có quyền vào trang shipper');
                navigate('/');
                return;
            }

            setCurrentUser(user);
            const data = overviewRes.data || {};
            setStats(data.statistics || {});
            setOrders(data.assignedOrders || []);
            setTodaySchedule(data.todaySchedule || []);
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
            setUpdatedAt(data.updatedAt || new Date());
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi tải dữ liệu shipper');
            navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    const loadHistory = useCallback(async () => {
        try {
            setLoading(true);
            const historyRes = await getShipperHistory();
            setHistory(historyRes.data?.data || historyRes.data || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi tải lịch sử giao hàng');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOverview();
    }, [loadOverview]);

    useEffect(() => {
        if (activeTab === 'history') loadHistory();
    }, [activeTab, loadHistory]);

    useEffect(() => {
        if (!currentUser?.id && !currentUser?._id) return undefined;

        const shipperId = currentUser.id || currentUser._id;
        const socket = io(process.env.REACT_APP_SERVER, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
        });

        socket.emit('join', `shipper:${shipperId}`);

        const onUpdate = () => {
            loadOverview();
            if (activeTab === 'history') loadHistory();
        };

        socket.on('order:delivery-updated', onUpdate);

        return () => {
            socket.off('order:delivery-updated', onUpdate);
            socket.emit('leave', `shipper:${shipperId}`);
            socket.disconnect();
        };
    }, [currentUser, activeTab, loadOverview, loadHistory]);

    const submitDeliveryStatus = async (orderId, status, extra = {}) => {
        try {
            setUpdatingId(orderId);
            const form = new FormData();
            form.append('status', status);
            if (extra.failureReason) form.append('failureReason', extra.failureReason);
            if (extra.failureNote) form.append('failureNote', extra.failureNote);
            if (extra.redeliveryScheduledAt) {
                form.append('redeliveryScheduledAt', extra.redeliveryScheduledAt);
            }
            if (extra.confirmReturn != null) {
                form.append('confirmReturn', String(extra.confirmReturn));
            }
            if (extra.evidenceFile) {
                form.append('evidenceImage', extra.evidenceFile);
            }
            if (extra.attemptNumber) {
                form.append('attemptNumber', String(extra.attemptNumber));
            }

            await putOrderDeliveryStatus(orderId, form);
            toast.success('Cập nhật trạng thái thành công');
            setFailModal({ open: false, mode: 'first', orderId: null });
            await loadOverview();
            if (activeTab === 'history') await loadHistory();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Cập nhật trạng thái thất bại');
        } finally {
            setUpdatingId(null);
        }
    };

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

    const avatarUrl = useMemo(() => currentUser?.avatar || '', [currentUser]);
    const avatarFallback = useMemo(() => {
        return (
            currentUser?.fullname?.trim()?.charAt(0)?.toUpperCase() ||
            currentUser?.username?.trim()?.charAt(0)?.toUpperCase() ||
            'S'
        );
    }, [currentUser]);

    const displayOrders = activeTab === 'history' ? history : orders;

    const renderStatusActions = (order) => {
        if (activeTab === 'history') return null;
        const busy = updatingId === order._id;
        const ds = resolveDeliveryStatus(order);

        if (ds === 'ASSIGNED' || ds === 'ACCEPTED') {
            return (
                <div className={cx('actionGroup')}>
                    <button
                        type="button"
                        className={cx('actBtn', 'success')}
                        disabled={busy}
                        onClick={() => submitDeliveryStatus(order._id, 'DELIVERING')}
                    >
                        <FaTruck /> Bắt đầu giao hàng
                    </button>
                </div>
            );
        }

        if (ds === 'DELIVERING') {
            return (
                <div className={cx('actionGroup')}>
                    <button
                        type="button"
                        className={cx('actBtn', 'success')}
                        disabled={busy}
                        onClick={() => submitDeliveryStatus(order._id, 'DELIVERED', { attemptNumber: 1 })}
                    >
                        <FaCheck /> Giao hàng thành công
                    </button>
                    <button
                        type="button"
                        className={cx('actBtn', 'danger')}
                        disabled={busy}
                        onClick={() =>
                            setFailModal({ open: true, mode: 'first', orderId: order._id })
                        }
                    >
                        <FaTimes /> Giao hàng thất bại
                    </button>
                </div>
            );
        }

        if (ds === 'FIRST_DELIVERY_FAILED') {
            const canRedeliver = isRedeliveryScheduleReady(order);
            return (
                <div className={cx('failInfo')}>
                    <p>
                        <strong>Lý do:</strong> {order.firstFailureReason || '—'}
                    </p>
                    <p>
                        <strong>Giao lại dự kiến:</strong>{' '}
                        {formatDateTime(order.redeliveryScheduledAt)}
                    </p>
                    {!canRedeliver ? (
                        <p className={cx('muted')}>Chưa đến giờ giao lại — nút sẽ mở khi đến lịch.</p>
                    ) : null}
                    <button
                        type="button"
                        className={cx('actBtn', 'success')}
                        disabled={busy || !canRedeliver}
                        onClick={() => submitDeliveryStatus(order._id, 'REDELIVERING')}
                    >
                        <FaRedo /> Bắt đầu giao lại
                    </button>
                </div>
            );
        }

        if (ds === 'REDELIVERING') {
            return (
                <div className={cx('actionGroup')}>
                    <span className={cx('attemptTag')}>Lần 2</span>
                    <button
                        type="button"
                        className={cx('actBtn', 'success')}
                        disabled={busy}
                        onClick={() =>
                            submitDeliveryStatus(order._id, 'DELIVERED_AFTER_RETRY', {
                                attemptNumber: 2,
                            })
                        }
                    >
                        <FaCheck /> Giao lại thành công
                    </button>
                    <button
                        type="button"
                        className={cx('actBtn', 'danger')}
                        disabled={busy}
                        onClick={() =>
                            setFailModal({ open: true, mode: 'second', orderId: order._id })
                        }
                    >
                        <FaTimes /> Giao thất bại lần 2
                    </button>
                </div>
            );
        }

        if (ds === 'RETURNING') {
            return (
                <div className={cx('failInfo')}>
                    <p>
                        <strong>Lý do:</strong> {order.secondFailureReason || '—'}
                    </p>
                    <p className={cx('muted')}>
                        Đang hoàn hàng — chờ Admin/Staff xác nhận đã nhận lại hàng.
                    </p>
                </div>
            );
        }

        return null;
    };

    const renderOrdersTable = (list, compact = false) => {
        if (loading && !list.length) {
            return <div className={cx('empty')}>Đang tải đơn hàng...</div>;
        }
        if (!list.length) {
            return <div className={cx('empty')}>Chưa có đơn hàng.</div>;
        }

        return (
            <div className={cx('tableWrap')}>
                <table className={cx('orderTable')}>
                    <thead>
                        <tr>
                            <th>Mã đơn hàng</th>
                            <th>Khách hàng</th>
                            <th>Địa chỉ giao hàng</th>
                            <th>Thời gian</th>
                            <th>Trạng thái hiện tại</th>
                            {activeTab !== 'history' ? <th>Cập nhật trạng thái</th> : null}
                        </tr>
                    </thead>
                    <tbody>
                        {list.slice(0, compact ? 6 : undefined).map((order) => {
                            const statusInfo = getDeliveryStatusInfo(order);
                            const phone = getCustomerPhone(order);
                            const ds = resolveDeliveryStatus(order);
                            return (
                                <tr key={order._id}>
                                    <td>
                                        <button
                                            type="button"
                                            className={cx('orderCode')}
                                            onClick={() =>
                                                window.open(
                                                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                        getAddress(order),
                                                    )}`,
                                                    '_blank',
                                                )
                                            }
                                        >
                                            {formatOrderCode(order)}
                                        </button>
                                    </td>
                                    <td>
                                        <strong>{getCustomerName(order)}</strong>
                                        {phone ? (
                                            <span className={cx('phone')}>
                                                <FaPhoneAlt /> {phone}
                                            </span>
                                        ) : null}
                                    </td>
                                    <td>
                                        <span className={cx('addressCell')}>
                                            <FaMapMarkerAlt />
                                            {getAddress(order)}
                                        </span>
                                    </td>
                                    <td>
                                        {formatDateTime(
                                            order.redeliveryScheduledAt ||
                                                order.assignedAt ||
                                                order.createdAt,
                                        )}
                                    </td>
                                    <td>
                                        <span className={cx('statusBadge', statusInfo.className)}>
                                            {ds === 'FIRST_DELIVERY_FAILED'
                                                ? 'Chờ giao lại'
                                                : ds === 'REDELIVERING'
                                                  ? 'Đang giao lại – Lần 2'
                                                  : statusInfo.label}
                                        </span>
                                    </td>
                                    {activeTab !== 'history' ? (
                                        <td>{renderStatusActions(order)}</td>
                                    ) : null}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    const pageTitle = {
        overview: { title: 'Dashboard Shipper', sub: 'Tổng quan hoạt động giao hàng' },
        orders: { title: 'Đơn hàng được giao', sub: 'Manage Delivery Result' },
        history: { title: 'Lịch sử giao hàng', sub: 'Đơn đã hoàn thành hoặc hoàn hàng' },
        notifications: { title: 'Thông báo', sub: 'Cập nhật đơn hàng theo thời gian thực' },
    }[activeTab];

    return (
        <div className={cx('portal')}>
            <aside className={cx('sidebar')}>
                <div className={cx('brand')}>
                    <img src={logo} alt="Healthcare" />
                    <div>
                        <strong>Healthcare</strong>
                        <span>Shipper Panel</span>
                    </div>
                </div>

                <div className={cx('profileCard')}>
                    <div className={cx('avatarWrap')}>
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={currentUser?.fullname}
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextSibling;
                                    if (fallback) fallback.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div
                            className={cx('avatar')}
                            style={{ display: avatarUrl ? 'none' : 'flex' }}
                        >
                            {avatarFallback}
                        </div>
                        <span className={cx('onlineDot')} />
                    </div>
                    <div>
                        <strong>{currentUser?.fullname || currentUser?.username || 'Shipper'}</strong>
                        <span>Shipper</span>
                        <em className={cx('onlineLabel')}>Đang hoạt động</em>
                    </div>
                </div>

                <nav className={cx('menu')}>
                    <button
                        type="button"
                        className={cx({ active: activeTab === 'overview' })}
                        onClick={() => setActiveTab('overview')}
                    >
                        <FaHome /> Tổng quan
                    </button>
                    <button
                        type="button"
                        className={cx({ active: activeTab === 'orders' })}
                        onClick={() => setActiveTab('orders')}
                    >
                        <FaBox /> Đơn hàng được giao
                    </button>
                    <button
                        type="button"
                        className={cx({ active: activeTab === 'history' })}
                        onClick={() => setActiveTab('history')}
                    >
                        <FaClock /> Lịch sử giao hàng
                    </button>
                    <button
                        type="button"
                        className={cx({ active: activeTab === 'notifications' })}
                        onClick={() => setActiveTab('notifications')}
                    >
                        <FaBell /> Thông báo
                        {unreadCount > 0 ? (
                            <span className={cx('menuBadge')}>{unreadCount}</span>
                        ) : null}
                    </button>
                </nav>

                <button type="button" className={cx('logoutBtn')} onClick={handleLogout}>
                    <FaSignOutAlt /> Đăng xuất
                </button>
            </aside>

            <main className={cx('main')}>
                <header className={cx('topbar')}>
                    <div>
                        <h1>{pageTitle.title}</h1>
                        <p>{pageTitle.sub}</p>
                    </div>
                    <div className={cx('topActions')}>
                        <button
                            type="button"
                            className={cx('bellBtn')}
                            onClick={() => setActiveTab('notifications')}
                        >
                            <FaBell />
                            {unreadCount > 0 ? (
                                <span className={cx('bellBadge')}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            ) : null}
                        </button>
                        <span className={cx('updatedAt')}>
                            Cập nhật {updatedAt ? formatDateTime(updatedAt) : '—'}
                        </span>
                        <button type="button" className={cx('refreshBtn')} onClick={loadOverview}>
                            <FaRedo />
                        </button>
                    </div>
                </header>

                {(activeTab === 'overview' || activeTab === 'orders') && (
                    <section className={cx('statsRow')}>
                        <div className={cx('statCard')}>
                            <span className={cx('statIcon', 'green')}>
                                <FaBox />
                            </span>
                            <div>
                                <p>Tổng đơn đã nhận</p>
                                <strong>{stats.totalReceived || 0}</strong>
                                <em>Tất cả thời gian</em>
                            </div>
                        </div>
                        <div className={cx('statCard')}>
                            <span className={cx('statIcon', 'orange')}>
                                <FaClock />
                            </span>
                            <div>
                                <p>Chờ lấy hàng</p>
                                <strong>{stats.waitingPickup || 0}</strong>
                            </div>
                        </div>
                        <div className={cx('statCard')}>
                            <span className={cx('statIcon', 'blue')}>
                                <FaTruck />
                            </span>
                            <div>
                                <p>Đang giao</p>
                                <strong>{stats.shipping || 0}</strong>
                            </div>
                        </div>
                        <div className={cx('statCard')}>
                            <span className={cx('statIcon', 'green')}>
                                <FaCheckCircle />
                            </span>
                            <div>
                                <p>Hoàn thành hôm nay</p>
                                <strong>{stats.completedToday || 0}</strong>
                            </div>
                        </div>
                        <div className={cx('statCard')}>
                            <span className={cx('statIcon', 'teal')}>
                                <FaCheck />
                            </span>
                            <div>
                                <p>Tỷ lệ thành công</p>
                                <strong>{stats.successRate || 0}%</strong>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'overview' && (
                    <>
                        <section className={cx('panel')}>
                            <div className={cx('panelHead')}>
                                <h2>Đơn hàng được giao</h2>
                                <button
                                    type="button"
                                    className={cx('textLink')}
                                    onClick={() => setActiveTab('orders')}
                                >
                                    Xem tất cả
                                </button>
                            </div>
                            {renderOrdersTable(orders, true)}
                        </section>

                        <div className={cx('bottomGrid')}>
                            <section className={cx('panel')}>
                                <div className={cx('panelHead')}>
                                    <h2>Lịch giao hàng hôm nay</h2>
                                </div>
                                <div className={cx('timeline')}>
                                    {todaySchedule.length ? (
                                        todaySchedule.map((order) => {
                                            const statusInfo = getDeliveryStatusInfo(order);
                                            return (
                                                <div key={order._id} className={cx('timelineItem')}>
                                                    <span className={cx('time')}>
                                                        {formatTime(
                                                            order.redeliveryScheduledAt ||
                                                                order.assignedAt ||
                                                                order.createdAt,
                                                        )}
                                                    </span>
                                                    <div className={cx('timelineBody')}>
                                                        <strong>{formatOrderCode(order)}</strong>
                                                        <p>
                                                            {getCustomerName(order)} ·{' '}
                                                            {getDistrictHint(getAddress(order))}
                                                        </p>
                                                        <span
                                                            className={cx(
                                                                'statusBadge',
                                                                statusInfo.className,
                                                            )}
                                                        >
                                                            {statusInfo.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className={cx('empty')}>Chưa có lịch giao hôm nay.</div>
                                    )}
                                </div>
                                <div className={cx('tipNote')}>
                                    <FaCheckCircle />
                                    <p>
                                        Mọi cập nhật trạng thái đơn hàng từ bạn sẽ được Staff, Admin
                                        và Khách hàng theo dõi theo thời gian thực.
                                    </p>
                                </div>
                            </section>

                            <section className={cx('panel')}>
                                <div className={cx('panelHead')}>
                                    <h2>Thông báo & cập nhật</h2>
                                </div>
                                <div className={cx('notifList')}>
                                    {notifications.slice(0, 5).map((item) => {
                                        const Icon = NOTIF_ICON[item.type] || FaBell;
                                        return (
                                            <div
                                                key={item.id}
                                                className={cx('notifItem', item.type)}
                                            >
                                                <span className={cx('notifIcon')}>
                                                    <Icon />
                                                </span>
                                                <div>
                                                    <strong>{item.title}</strong>
                                                    <p>{item.text}</p>
                                                    <em>{formatRelative(item.at)}</em>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {!notifications.length ? (
                                        <div className={cx('empty')}>Chưa có thông báo.</div>
                                    ) : null}
                                </div>
                            </section>
                        </div>
                    </>
                )}

                {activeTab === 'orders' && (
                    <section className={cx('panel')}>
                        <div className={cx('panelHead')}>
                            <h2>Manage Delivery Result</h2>
                        </div>
                        {renderOrdersTable(orders)}
                    </section>
                )}

                {activeTab === 'history' && (
                    <section className={cx('panel')}>
                        <div className={cx('panelHead')}>
                            <h2>Lịch sử giao hàng</h2>
                        </div>
                        {renderOrdersTable(displayOrders)}
                    </section>
                )}

                {activeTab === 'notifications' && (
                    <section className={cx('panel')}>
                        <div className={cx('panelHead')}>
                            <h2>Thông báo & cập nhật</h2>
                        </div>
                        <div className={cx('notifList', 'full')}>
                            {notifications.map((item) => {
                                const Icon = NOTIF_ICON[item.type] || FaBell;
                                return (
                                    <div key={item.id} className={cx('notifItem', item.type)}>
                                        <span className={cx('notifIcon')}>
                                            <Icon />
                                        </span>
                                        <div>
                                            <strong>{item.title}</strong>
                                            <p>{item.text}</p>
                                            <em>{formatRelative(item.at)}</em>
                                        </div>
                                    </div>
                                );
                            })}
                            {!notifications.length ? (
                                <div className={cx('empty')}>Chưa có thông báo.</div>
                            ) : null}
                        </div>
                    </section>
                )}
            </main>

            <DeliveryFailureModal
                open={failModal.open}
                mode={failModal.mode}
                submitting={!!updatingId}
                onClose={() => setFailModal({ open: false, mode: 'first', orderId: null })}
                onSubmit={(payload) => {
                    const status =
                        failModal.mode === 'first' ? 'FIRST_DELIVERY_FAILED' : 'RETURNING';
                    submitDeliveryStatus(failModal.orderId, status, {
                        ...payload,
                        attemptNumber: failModal.mode === 'first' ? 1 : 2,
                    });
                }}
            />
        </div>
    );
}

export default ShipperDashboard;
