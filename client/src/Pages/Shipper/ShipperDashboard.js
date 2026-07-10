import classNames from 'classnames/bind';
import styles from './ShipperDashboard.module.scss';
import { toast } from 'react-toastify';
import request from '../../Config/api';
import { useEffect, useState, useMemo } from 'react';
import logo from '../../assests/logo/logoxoa.jpg';
import {
    getShipperOrders,
    getShipperStats,
    getShipperHistory,
    startDelivery,
    updateDeliveryStatus,
} from '../../services/shipperService';
import { getShipperStatus } from '../../utils/shipperStatus';
import { useNavigate } from 'react-router-dom';
import { getMe } from '../../services/shipperService';
import {
    FaBell,
    FaUserCircle,
    FaThLarge,
    FaBox,
    FaPlus,
    FaUser,
    FaMapMarkerAlt,
    FaMap,
    FaPlayCircle,
    FaSignOutAlt,
    FaHome,
    FaGamepad,
} from 'react-icons/fa';

const cx = classNames.bind(styles);
const DELIVERY_NOTES = {
    completed: 'Khách đã nhận hàng',
    failed: 'Giao hàng thất bại',
    returning: 'Khách không nhận, đang hoàn hàng về shop',
};

const readCustomerName = (order) => {
    return order?.userId?.fullname || order?.fullname || order?.customer || 'Khách hàng';
};

const readCustomerPhone = (order) => {
    return order?.userId?.phone || order?.phone || '';
};

const readDeliveryAddress = (order) => {
    return order?.address || order?.deliveryAddress || order?.addressUser || 'Chưa có địa chỉ giao hàng';
};

function ShipperDashboard() {
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({
        totalReceived: 0,
        waiting: 0,
        completedToday: 0,
        successRate: 0,
    });
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const year = new Date().getFullYear();
    const [activeTab, setActiveTab] = useState('orders');

    const fetchData = async () => {
        try {
            setLoading(true);

            const [meRes, ordersRes, statsRes] = await Promise.all([getMe(), getShipperOrders(), getShipperStats()]);

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
            setOrders(ordersRes.data?.data || ordersRes.data || []);
            setStats(statsRes.data || {});
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi tải dữ liệu shipper');
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);

            const [meRes, historyRes, statsRes] = await Promise.all([getMe(), getShipperHistory(), getShipperStats()]);

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
            setOrders(historyRes.data?.data || historyRes.data || []);
            setStats(statsRes.data || {});
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi tải lịch sử giao hàng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleStartDelivery = async (orderId) => {
        try {
            await startDelivery(orderId);
            toast.success('Đã bắt đầu giao hàng');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể bắt đầu giao hàng');
        }
    };

    const handleUpdateStatus = async (orderId, status) => {
        try {
            await updateDeliveryStatus(orderId, {
                status,
                deliveryNote: DELIVERY_NOTES[status] || '',
            });

            toast.success('Cập nhật trạng thái thành công');

            if (activeTab === 'history') {
                fetchHistory();
            } else {
                fetchData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Cập nhật trạng thái thất bại');
        }
    };

    const getCustomerName = (order) => {
        return readCustomerName(order);
    };

    const getCustomerPhone = (order) => {
        return readCustomerPhone(order);
    };

    const getAddress = (order) => {
        return readDeliveryAddress(order);
    };

    const openMap = (address) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
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

    const avatarUrl = useMemo(() => {
        if (!currentUser?.avatar) return '';

        if (currentUser.avatar.startsWith('http://') || currentUser.avatar.startsWith('https://')) {
            return currentUser.avatar;
        }

        return currentUser.avatar;
    }, [currentUser]);

    const avatarFallback = useMemo(() => {
        return (
            currentUser?.fullname?.trim()?.charAt(0)?.toUpperCase() ||
            currentUser?.username?.trim()?.charAt(0)?.toUpperCase() ||
            'S'
        );
    }, [currentUser]);
    return (
        <div className={cx('wrapper')}>
            <aside className={cx('sidebar')}>
                <img src={logo} alt="HealthCare Device" className={cx('logo')} />
                <h2 className={cx('logo')}>Mộc Xoa</h2>

                <div className={cx('profile')}>
                    <div className={cx('profileTop')}>
                        <div className={cx('avatarWrapper')}>
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={currentUser?.fullname}
                                    className={cx('avatarImage')}
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';

                                        const fallback = e.currentTarget.nextSibling;

                                        if (fallback) {
                                            fallback.style.display = 'flex';
                                        }
                                    }}
                                />
                            ) : null}

                            <div
                                className={cx('avatar')}
                                style={{
                                    display: avatarUrl ? 'none' : 'flex',
                                }}
                            >
                                {avatarFallback}
                            </div>
                        </div>

                        <div>
                            <h4>{currentUser?.fullname || currentUser?.username || 'Shipper'}</h4>
                            <p>{currentUser?.role === 'shipper' ? 'Shipper xác minh' : 'Tài khoản chưa hợp lệ'}</p>
                        </div>
                    </div>

                    <div className={cx('profileActions')}>
                        <button onClick={() => navigate('/')}>
                            <FaHome />
                            Trang chủ
                        </button>

                        <button onClick={fetchData}>
                            <FaPlus />
                            Tải lại đơn
                        </button>

                        <button className={cx('logoutBtn')} onClick={handleLogout}>
                            <FaSignOutAlt />
                            Đăng xuất
                        </button>
                    </div>
                </div>

                <nav className={cx('menu')}>
                    <button
                        className={cx({ active: activeTab === 'orders' })}
                        onClick={() => {
                            setActiveTab('orders');
                            fetchData();
                        }}
                    >
                        <FaThLarge /> Đơn hàng hiện tại
                    </button>
                    <button
                        className={cx({ active: activeTab === 'history' })}
                        onClick={() => {
                            setActiveTab('history');
                            fetchHistory();
                        }}
                    >
                        <FaBox /> Lịch sử giao hàng
                    </button>
                    <button className={cx({ active: activeTab === 'games' })} onClick={() => setActiveTab('games')}>
                        <FaGamepad /> Games
                    </button>
                    <div className={cx('copyright')}>© {new Date().getFullYear()} HealthCare Device</div>{' '}
                </nav>
            </aside>

            <main className={cx('main')}>
                <header className={cx('header')}>
                    <div>
                        <h3>Shipper: {currentUser?.fullname || currentUser?.username || 'Shipper'}</h3>
                        <p>
                            <span></span> Trạng thái: Đang hoạt động
                        </p>
                    </div>

                    <div className={cx('headerIcons')}>
                        <FaBell />
                        <FaUserCircle />
                    </div>
                </header>

                <section className={cx('stats')}>
                    <div className={cx('statCard')}>
                        <p>TỔNG ĐƠN ĐÃ NHẬN</p>
                        <h2>{stats.totalReceived || 0}</h2>
                    </div>

                    <div className={cx('statCard')}>
                        <p>CHỜ GIAO</p>
                        <h2>{stats.waiting || 0}</h2>
                    </div>

                    <div className={cx('statCard')}>
                        <p>HOÀN THÀNH HÔM NAY</p>
                        <h2>{stats.completedToday || 0}</h2>
                    </div>

                    <div className={cx('statCard', 'success')}>
                        <p>TỶ LỆ THÀNH CÔNG</p>
                        <h2>{stats.successRate || 0}%</h2>
                    </div>
                </section>

                <section className={cx('orderHeader')}>
                    <div>
                        <h3>{activeTab === 'history' ? 'Lịch sử giao hàng' : 'Đơn hàng được giao'}</h3>
                        <p>
                            {activeTab === 'history'
                                ? 'Danh sách đơn hàng đã giao, thất bại hoặc hoàn hàng'
                                : 'Danh sách đơn hàng đã được admin gán cho shipper'}
                        </p>
                    </div>

                    <button onClick={activeTab === 'history' ? fetchHistory : fetchData}>Tải lại dữ liệu</button>
                </section>

                <section className={cx('orders')}>
                    {loading ? (
                        <p>Đang tải đơn hàng...</p>
                    ) : orders.length === 0 ? (
                        <p>Chưa có đơn hàng nào được gán.</p>
                    ) : (
                        orders.map((order) => {
                            const statusInfo = getShipperStatus(order.status);
                            const address = getAddress(order);

                            return (
                                <div className={cx('orderCard')} key={order._id}>
                                    <div className={cx('orderTop')}>
                                        <span className={cx('normal')}>ĐƠN GIAO HÀNG</span>

                                        <div>
                                            <p>Trạng thái</p>
                                            <strong>{statusInfo.label}</strong>
                                        </div>
                                    </div>

                                    <span className={cx('statusBadge', statusInfo.className)}>{statusInfo.label}</span>

                                    <div className={cx('orderMeta')}>
                                        <div>
                                            <span>MÃ ĐƠN HÀNG</span>
                                            <strong>#{order._id?.slice(-8)?.toUpperCase()}</strong>
                                        </div>

                                        <div>
                                            <span>SẢN PHẨM</span>
                                            {order.products
                                                ?.map((item) => `${item.nameProduct} x${item.quantity}`)
                                                .join(', ') || 'Chưa có sản phẩm'}
                                        </div>

                                        <div>
                                            <span>SỐ TIỀN</span>
                                            <strong>
                                                {(order.sumprice || order.total || 0).toLocaleString('vi-VN')}đ
                                            </strong>
                                        </div>
                                    </div>
                                    <div className={cx('info')}>
                                        <FaUser />
                                        <div>
                                            <span>KHÁCH HÀNG</span>
                                            <p>{getCustomerName(order)}</p>
                                            {getCustomerPhone(order) && <p>{getCustomerPhone(order)}</p>}
                                        </div>
                                    </div>

                                    <div className={cx('info')}>
                                        <FaMapMarkerAlt />
                                        <div>
                                            <span>ĐỊA CHỈ GIAO</span>
                                            <p>{address}</p>

                                            <button
                                                type="button"
                                                className={cx('mapBtn')}
                                                onClick={() => openMap(address)}
                                            >
                                                <FaMap /> Xem bản đồ
                                            </button>
                                        </div>
                                    </div>

                                    <div className={cx('actions')}>
                                        <button className={cx('detailBtn')}>Xem chi tiết</button>
                                    </div>

                                    {activeTab === 'orders' && (
                                        <div className={cx('statusArea')}>
                                            {order.status === 'confirmed' && (
                                                <button
                                                    className={cx('statusBtn')}
                                                    onClick={() => handleStartDelivery(order._id)}
                                                >
                                                    Bắt đầu giao
                                                </button>
                                            )}

                                            {order.status === 'shipping' && (
                                                <>
                                                    <button
                                                        className={cx('successBtn')}
                                                        onClick={() => handleUpdateStatus(order._id, 'completed')}
                                                    >
                                                        Giao thành công
                                                    </button>

                                                    <button
                                                        className={cx('dangerBtn')}
                                                        onClick={() => handleUpdateStatus(order._id, 'failed')}
                                                    >
                                                        Giao thất bại
                                                    </button>
                                                </>
                                            )}

                                            {order.status === 'failed' && (
                                                <button
                                                    className={cx('returnBtn')}
                                                    onClick={() => handleUpdateStatus(order._id, 'returning')}
                                                >
                                                    Hoàn hàng về shop
                                                </button>
                                            )}

                                            {order.status === 'returning' && (
                                                <div className={cx('waitingReturnBox')}>
                                                    <span>Đang hoàn hàng về shop - </span>
                                                    <small>Chờ Admin hoặc Kho xác nhận đã nhận lại hàng</small>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </section>
                {activeTab === 'games' && (
                    <section className={cx('gameSection')}>
                        <div className={cx('gameHeader')}>
                            <h2>🎮 Giải trí cho Shipper</h2>
                            <p>Thư giãn sau những chuyến giao hàng.</p>
                        </div>

                        <div className={cx('gameCard')}>
                            <img
                                src="https://cdn2.y8.com/cloudimage/402793/file/w180h135_webp-032811d35f6e09f09e1a74fd1990d5fb.webp"
                                alt="Plants vs Zombies Fusion Nightmare"
                            />

                            <div className={cx('gameInfo')}>
                                <h3>Plants vs Zombies: Fusion Nightmare</h3>

                                <p>Phiên bản PvZ Fusion cực khó với nhiều loại cây và zombie mới.</p>

                                <a
                                    href="https://www.y8.com/games/plants_vs_zombies_fusion_nightmare"
                                    target="_blank"
                                    rel="noreferrer"
                                    className={cx('playBtn')}
                                >
                                    🎮 Chơi ngay
                                </a>
                            </div>
                        </div>

                        <div className={cx('gameNotice')}>
                            <FaGamepad />
                            <div>
                                <h3>Game không hỗ trợ nhúng trực tiếp</h3>
                                <p>Y8 chặn iframe, hãy bấm nút bên dưới để mở game ở tab mới.</p>

                                <a
                                    href="https://www.y8.com/games/plants_vs_zombies_fusion_nightmare"
                                    target="_blank"
                                    rel="noreferrer"
                                    className={cx('playBtn')}
                                >
                                    Chơi ngay trên Y8
                                </a>
                            </div>
                        </div>
                    </section>
                )}
                <section className={cx('tipBox')}>
                    <div>
                        <h2>Mẹo Vận Chuyển An Toàn</h2>
                        <p>
                            Luôn kiểm tra thông tin khách hàng, địa chỉ giao hàng và trạng thái đơn trước khi bàn giao.
                        </p>
                        <button>Tài liệu hướng dẫn</button>
                    </div>

                    <div className={cx('video')}>
                        <FaPlayCircle />
                    </div>
                </section>
            </main>
        </div>
    );
}

export default ShipperDashboard;
