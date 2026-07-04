import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import request from '../Config/api';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import classNames from 'classnames/bind';
import styles from '../Styles/CustomerDetail.module.scss';

import ModalEditUser from '../utils/Modal/ModalEditUser';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faEnvelope,
    faPhone,
    faPenToSquare,
    faLock,
    faLockOpen,
    faUser,
    faCartShopping,
    faMoneyBillWave,
    faRotateLeft,
    faLocationDot,
    faClockRotateLeft,
    faEye,
    faTicket,
    faShieldHalved,
    faRightToBracket,
} from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

function CustomerDetail({ customerId, onBack }) {
    const { id: routeId } = useParams();
    const navigate = useNavigate();

    const id = customerId || routeId;

    const [user, setUser] = useState(null);
    const [userOrders, setUserOrders] = useState([]);
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);

    const normalizeString = (value) =>
        String(value || '')
            .trim()
            .toLowerCase();

    const handleBack = () => {
        if (typeof onBack === 'function') {
            onBack();
            return;
        }

        navigate('/admin/customer');
    };

    const handleGoAdmin = () => {
        navigate('/admin');
    };

    const isOrderBelongToUser = (order, userData) => {
        const currentUserId = String(userData?._id || '').trim();
        const currentUserEmail = normalizeString(userData?.email);

        const orderUserId = String(order?.userId || order?.user_Id || '').trim();
        const orderEmail = normalizeString(order?.email);
        const orderUser = normalizeString(order?.user);

        return orderUserId === currentUserId || orderEmail === currentUserEmail || orderUser === currentUserEmail;
    };

    const fetchUserDetail = useCallback(async () => {
        if (!id) {
            setUser(null);
            setUserOrders([]);
            setRecentOrders([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            const [userRes, orderRes] = await Promise.all([
                request.get(`/api/user/${id}`),
                request.get('/api/dataorderuser'),
            ]);

            const userData = userRes?.data || null;
            const allOrders = Array.isArray(orderRes?.data) ? orderRes.data : [];

            const filteredAllOrders = userData?._id
                ? allOrders
                      .filter((order) => isOrderBelongToUser(order, userData))
                      .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))
                : [];

            setUser(userData);
            setUserOrders(filteredAllOrders);
            setRecentOrders(filteredAllOrders.slice(0, 5));
        } catch (error) {
            console.error('Lỗi lấy chi tiết khách hàng:', error);
            toast.error(error?.response?.data?.message || 'Không thể tải chi tiết khách hàng');
            setUser(null);
            setUserOrders([]);
            setRecentOrders([]);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchUserDetail();
    }, [fetchUserDetail]);

    const getInitials = (name) => {
        if (!name) return 'U';
        const words = name.trim().split(' ').filter(Boolean);
        if (words.length === 1) return words[0][0].toUpperCase();
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    };

    const formatCurrency = (value) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

    const formatFullDateTimeShort = (date) => {
        if (!date) return '---';

        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return '---';

        const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

        const weekday = weekdays[d.getDay()];
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hour = String(d.getHours()).padStart(2, '0');
        const minute = String(d.getMinutes()).padStart(2, '0');

        return `${weekday}, ${day}/${month}/${year} - ${hour}:${minute}`;
    };

    const formatDateTime = (date) => {
        if (!date) return 'Chưa từng đăng nhập';

        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return 'Chưa từng đăng nhập';

        const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

        const weekday = weekdays[d.getDay()];
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hour = String(d.getHours()).padStart(2, '0');
        const minute = String(d.getMinutes()).padStart(2, '0');
        const second = String(d.getSeconds()).padStart(2, '0');

        return `${weekday}, ${day}/${month}/${year} lúc ${hour}:${minute}:${second}`;
    };

    const totalOrders = userOrders.length;

    const totalSpent = userOrders.reduce((sum, order) => {
        const paymentStatus = String(order?.paymentStatus || '')
            .trim()
            .toLowerCase();

        if (paymentStatus !== 'paid') return sum;

        return sum + Number(order?.sumprice || 0);
    }, 0);

    const cancelledOrReturned = userOrders.filter((order) => {
        const status = String(order?.status || '')
            .trim()
            .toLowerCase();

        return status === 'cancelled' || status === 'returned';
    }).length;

    const returnRate = totalOrders > 0 ? ((cancelledOrReturned / totalOrders) * 100).toFixed(1) : '0.0';

    const userInitials = getInitials(user?.fullname);
    const roleText = user?.isAdmin ? 'Quản trị viên' : 'Khách hàng';
    const isActive = Boolean(user?.isActive);
    const lastLoginAt = user?.lastLoginAt ?? null;
    const displayOrders = recentOrders;
    const latestOrder = userOrders.length > 0 ? userOrders[0] : null;

    const handleToggleStatus = async () => {
        try {
            const newStatus = !user.isActive;

            await request.put(`/api/update-status-user/${user._id}`, {
                isActive: newStatus,
            });

            setUser((prev) => ({ ...prev, isActive: newStatus }));
            toast.success('Cập nhật trạng thái thành công');
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái:', error);
            toast.error(error?.response?.data?.message || 'Cập nhật trạng thái thất bại');
        }
    };

    const getOrderStatusText = (order) => {
        const status = String(order?.status || '')
            .trim()
            .toLowerCase();

        switch (status) {
            case 'completed':
                return 'Hoàn thành';
            case 'shipping':
                return 'Đang giao';
            case 'confirmed':
                return 'Đã xác nhận';
            case 'cancelled':
                return 'Đã hủy';
            case 'pending':
                return 'Chờ xác nhận';
            case 'returned':
                return 'Đã trả hàng';
            default:
                return 'Đang xử lý';
        }
    };

    const getOrderStatusClass = (order) => {
        const status = String(order?.status || '')
            .trim()
            .toLowerCase();

        switch (status) {
            case 'completed':
                return 'success';
            case 'cancelled':
            case 'returned':
                return 'danger';
            case 'shipping':
                return 'info';
            case 'confirmed':
                return 'warning';
            case 'pending':
                return 'pending';
            default:
                return 'pending';
        }
    };

    if (loading) {
        return (
            <div className={cx('wrapper')}>
                <ToastContainer />
                <div className={cx('stateBox')}>Đang tải dữ liệu khách hàng...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={cx('wrapper')}>
                <ToastContainer />
                <div className={cx('stateBox')}>
                    <h3>Không tìm thấy khách hàng</h3>
                    <button type="button" onClick={handleBack} className={cx('backBtn')}>
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={cx('wrapper')}>
            <ToastContainer />

            <div className={cx('pageTop')}>
                <div className={cx('breadcrumb')}>
                    <span onClick={handleGoAdmin} className={cx('crumbLink')}>
                        Admin
                    </span>
                    <span>/</span>
                    <span onClick={handleBack} className={cx('crumbLink')}>
                        Quản lý khách hàng
                    </span>
                    <span>/</span>
                    <span className={cx('crumbCurrent')}>{user.fullname || 'Chi tiết khách hàng'}</span>
                </div>

                <div className={cx('topHeader')}>
                    <div className={cx('titleWrap')}>
                        <button type="button" className={cx('backCircle')} onClick={handleBack}>
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </button>
                        <h1>Hồ sơ khách hàng</h1>
                    </div>

                    <div className={cx('headerActions')}>
                        <button type="button" className={cx('editBtn')} onClick={() => setShowEdit(true)}>
                            <FontAwesomeIcon icon={faPenToSquare} />
                            <span>Chỉnh sửa</span>
                        </button>

                        <button
                            type="button"
                            className={cx('statusBtn', { inactive: !isActive })}
                            onClick={handleToggleStatus}
                        >
                            <FontAwesomeIcon icon={isActive ? faLock : faLockOpen} />
                            <span>{isActive ? 'Khóa tài khoản' : 'Mở khóa'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className={cx('mainGrid')}>
                <div className={cx('leftColumn')}>
                    <div className={cx('profileCard')}>
                        <div className={cx('avatarWrap')}>
                            {user.avatar ? (
                                <img src={user.avatar} alt="avatar" className={cx('avatarImage')} />
                            ) : (
                                <div className={cx('avatarFallback')}>{userInitials}</div>
                            )}

                            <div className={cx('onlineDot')} />
                        </div>

                        <h2>{user.fullname || 'Chưa có tên'}</h2>
                        <p className={cx('memberTag')}>{roleText}</p>

                        <div className={cx('infoList')}>
                            <div className={cx('infoItem')}>
                                <div className={cx('infoIcon')}>
                                    <FontAwesomeIcon icon={faEnvelope} />
                                </div>
                                <div>
                                    <span>Email</span>
                                    <p>{user.email || '---'}</p>
                                </div>
                            </div>

                            <div className={cx('infoItem')}>
                                <div className={cx('infoIcon')}>
                                    <FontAwesomeIcon icon={faPhone} />
                                </div>
                                <div>
                                    <span>Số điện thoại</span>
                                    <p>{user.phone || '---'}</p>
                                </div>
                            </div>

                            <div className={cx('infoItem')}>
                                <div className={cx('infoIcon')}>
                                    <FontAwesomeIcon icon={faUser} />
                                </div>
                                <div>
                                    <span>Trạng thái tài khoản</span>
                                    <p>{isActive ? 'Đang hoạt động' : 'Đã khóa'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={cx('card')}>
                        <div className={cx('cardHeader')}>
                            <div className={cx('cardTitle')}>
                                <FontAwesomeIcon icon={faLocationDot} />
                                <h3>Địa chỉ giao hàng</h3>
                            </div>
                            <span className={cx('smallAction')}>Thông tin</span>
                        </div>

                        <div className={cx('addressBox', 'primaryAddress')}>
                            <div className={cx('addressTop')}>
                                <strong>Địa chỉ mặc định</strong>
                                <span className={cx('defaultBadge')}>MẶC ĐỊNH</span>
                            </div>
                            <p>{user.address || 'Khách hàng quản lý địa chỉ trong sổ địa chỉ cá nhân'}</p>
                        </div>
                    </div>

                    <div className={cx('card')}>
                        <div className={cx('cardHeader')}>
                            <div className={cx('cardTitle')}>
                                <FontAwesomeIcon icon={faShieldHalved} />
                                <h3>Ghi chú Admin</h3>
                            </div>
                        </div>

                        <div className={cx('noteBox')}>{user.note || 'Thêm ghi chú nội bộ về khách hàng này...'}</div>
                    </div>
                </div>

                <div className={cx('rightColumn')}>
                    <div className={cx('statsGrid')}>
                        <div className={cx('statCard')}>
                            <div className={cx('statIcon', 'money')}>
                                <FontAwesomeIcon icon={faMoneyBillWave} />
                            </div>
                            <div className={cx('statContent')}>
                                <span>Tổng chi tiêu</span>
                                <h3>{formatCurrency(totalSpent)}</h3>
                            </div>
                        </div>

                        <div className={cx('statCard')}>
                            <div className={cx('statIcon', 'order')}>
                                <FontAwesomeIcon icon={faCartShopping} />
                            </div>
                            <div className={cx('statContent')}>
                                <span>Đơn hàng đã đặt</span>
                                <h3>{totalOrders} Đơn</h3>
                            </div>
                        </div>

                        <div className={cx('statCard')}>
                            <div className={cx('statIcon', 'return')}>
                                <FontAwesomeIcon icon={faRotateLeft} />
                            </div>
                            <div className={cx('statContent')}>
                                <span>Tỷ lệ hủy hàng</span>
                                <h3>{returnRate}%</h3>
                            </div>
                        </div>
                    </div>

                    <div className={cx('card')}>
                        <div className={cx('cardHeader')}>
                            <div className={cx('cardTitle')}>
                                <h3>Đơn hàng gần đây</h3>
                            </div>
                            <span className={cx('viewAll')}>Xem tất cả</span>
                        </div>

                        <div className={cx('tableWrap')}>
                            <table className={cx('table')}>
                                <thead>
                                    <tr>
                                        <th>Mã đơn</th>
                                        <th>Ngày đặt</th>
                                        <th>Tổng cộng</th>
                                        <th>Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayOrders.length > 0 ? (
                                        displayOrders.map((o) => (
                                            <tr key={o._id}>
                                                <td className={cx('orderCode')}>#{o._id}</td>
                                                <td>{formatFullDateTimeShort(o.createdAt)}</td>
                                                <td>{formatCurrency(o.sumprice)}</td>
                                                <td>
                                                    <span className={cx('statusBadge', getOrderStatusClass(o))}>
                                                        {getOrderStatusText(o)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className={cx('emptyRow')}>
                                                Chưa có đơn hàng nào
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className={cx('card')}>
                        <div className={cx('cardHeader')}>
                            <div className={cx('cardTitle')}>
                                <FontAwesomeIcon icon={faClockRotateLeft} />
                                <h3>Hoạt động gần đây</h3>
                            </div>
                        </div>

                        <div className={cx('activityList')}>
                            <div className={cx('activityItem')}>
                                <div className={cx('activityIcon', 'green')}>
                                    <FontAwesomeIcon icon={faRightToBracket} />
                                </div>
                                <div className={cx('activityContent')}>
                                    <h4>Lần cuối đăng nhập</h4>
                                    <p>{formatDateTime(lastLoginAt)}</p>
                                </div>
                            </div>

                            <div className={cx('activityItem')}>
                                <div className={cx('activityIcon', 'blue')}>
                                    <FontAwesomeIcon icon={faEye} />
                                </div>
                                <div className={cx('activityContent')}>
                                    <h4>Đơn hàng gần nhất</h4>
                                    <p>
                                        {latestOrder
                                            ? formatFullDateTimeShort(latestOrder.createdAt)
                                            : 'Chưa có lịch sử mua hàng'}
                                    </p>
                                </div>
                            </div>

                            <div className={cx('activityItem')}>
                                <div className={cx('activityIcon', 'orange')}>
                                    <FontAwesomeIcon icon={faTicket} />
                                </div>
                                <div className={cx('activityContent')}>
                                    <h4>Voucher đã dùng</h4>
                                    <p>Đang cập nhật chức năng</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ModalEditUser show={showEdit} setShow={setShowEdit} dataOneUser={user} fetchData={fetchUserDetail} />
        </div>
    );
}

export default CustomerDetail;
