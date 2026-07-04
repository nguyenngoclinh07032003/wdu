import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../Styles/ManageShipper.module.scss';
import request from '../Config/api';
import { toast, ToastContainer } from 'react-toastify';

import {
    faTruck,
    faClock,
    faChartLine,
    faUserPlus,
    faMapLocationDot,
    faTriangleExclamation,
    faStar,
    faFilter,
    faDownload,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

const cx = classNames.bind(styles);

function ManageShipper() {
    const [shippers, setShippers] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    const [selectedShipper, setSelectedShipper] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);

            const [shipperRes, orderRes] = await Promise.all([
                request.get('/api/get-all-shipper'),
                request.get('/api/getallorder'),
            ]);

            setShippers(Array.isArray(shipperRes.data) ? shipperRes.data : []);
            setOrders(Array.isArray(orderRes.data) ? orderRes.data : []);
        } catch (error) {
            console.error('Lỗi lấy dữ liệu shipper:', error);
            toast.error(error?.response?.data?.message || 'Không thể tải dữ liệu shipper');

            setShippers([]);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const activeShippers = useMemo(() => {
        return shippers.filter((item) => item?.isActive !== false).length;
    }, [shippers]);

    const pendingDeliveries = useMemo(() => {
        return orders.filter((item) => {
            const status = String(item?.status || '').toLowerCase();
            return status === 'pending' || status === 'confirmed' || status === 'shipping';
        }).length;
    }, [orders]);

    const completedOrders = useMemo(() => {
        return orders.filter((item) => {
            const status = String(item?.status || '').toLowerCase();
            return status === 'completed' || item?.tinhtrang === true;
        }).length;
    }, [orders]);

    const successRate = useMemo(() => {
        if (!orders.length) return 0;
        return ((completedOrders / orders.length) * 100).toFixed(1);
    }, [completedOrders, orders]);

    const urgentOrders = useMemo(() => {
        return orders
            .filter((item) => {
                const status = String(item?.status || '').toLowerCase();
                return status === 'pending' || status === 'confirmed' || status === 'shipping';
            })
            .slice(0, 3);
    }, [orders]);

    const getInitials = (name) => {
        if (!name) return 'S';

        const words = name.trim().split(' ').filter(Boolean);
        if (words.length === 1) return words[0].charAt(0).toUpperCase();

        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    };

    const getStatusClass = (shipper) => {
        if (shipper?.isActive === false) return 'offline';
        return 'available';
    };

    const getStatusText = (shipper) => {
        if (shipper?.isActive === false) return 'Đã khóa';
        return 'Sẵn sàng';
    };

    const formatPhone = (phone) => {
        if (!phone) return 'Chưa cập nhật';

        const raw = String(phone);
        if (raw.startsWith('0')) return raw;

        return `0${raw}`;
    };

    const getOrderCode = (order) => {
        return order?._id || order?._id?.slice(0, 8) || '---';
    };

    const getOrderProductName = (order) => {
        return order?.products?.[0]?.nameProduct || order?.products?.[0]?.name || 'Sản phẩm không xác định';
    };

    const handleShowDetail = (shipper) => {
        setSelectedShipper(shipper);
        setShowDetail(true);
    };

    const handleOpenAssignModal = (shipper) => {
        setSelectedShipper(shipper);
        setSelectedOrderId('');
        setShowAssignModal(true);
    };

    const handleConfirmAssignOrder = async () => {
        try {
            if (!selectedShipper?._id) {
                toast.warning('Vui lòng chọn shipper');
                return;
            }

            if (!selectedOrderId) {
                toast.warning('Vui lòng chọn đơn hàng');
                return;
            }

            setAssigning(true);

            const res = await request.put(`/api/assign-order-shipper/${selectedOrderId}`, {
                shipperId: selectedShipper._id,
            });

            toast.success(res?.data?.message || 'Gán đơn thành công');

            setShowAssignModal(false);
            setSelectedOrderId('');
            setSelectedShipper(null);

            fetchData();
        } catch (error) {
            console.error('Gán đơn thất bại:', error);
            toast.error(error?.response?.data?.message || 'Gán đơn thất bại');
        } finally {
            setAssigning(false);
        }
    };
    const availableOrders = useMemo(() => {
        return orders.filter((item) => {
            const status = String(item?.status || '').toLowerCase();

            return !item?.shipperId && status === 'confirmed';
        });
    }, [orders]);

    return (
        <div className={cx('wrapper')}>
            <ToastContainer />
            <div className={cx('header')}>
                <div>
                    <h1>Quản lý Shipper</h1>
                    <p>Theo dõi nhân viên giao hàng, đơn đang giao và hiệu suất vận chuyển.</p>
                </div>

                <button className={cx('addBtn')} type="button">
                    <FontAwesomeIcon icon={faUserPlus} />
                    Thêm Shipper
                </button>
            </div>

            <div className={cx('statsGrid')}>
                <div className={cx('statCard')}>
                    <div className={cx('statIcon')}>
                        <FontAwesomeIcon icon={faTruck} />
                    </div>
                    <span>Shipper hoạt động</span>
                    <strong>{activeShippers}</strong>
                </div>

                <div className={cx('statCard')}>
                    <div className={cx('statIcon', 'green')}>
                        <FontAwesomeIcon icon={faClock} />
                    </div>
                    <span>Đơn đang giao</span>
                    <strong>{pendingDeliveries}</strong>
                </div>

                <div className={cx('statCard')}>
                    <div className={cx('statIcon')}>
                        <FontAwesomeIcon icon={faChartLine} />
                    </div>
                    <span>Tổng shipper</span>
                    <strong>{shippers.length}</strong>
                </div>

                <div className={cx('statCard', 'dark')}>
                    <span>Tỷ lệ giao thành công</span>
                    <strong>{successRate}%</strong>
                </div>
            </div>

            <div className={cx('contentGrid')}>
                <div className={cx('leftCol')}>
                    <div className={cx('mapCard')}>
                        <div className={cx('cardHeader')}>
                            <h3>
                                <FontAwesomeIcon icon={faMapLocationDot} />
                                Bản đồ giao hàng realtime
                            </h3>
                            <span className={cx('live')}>LIVE</span>
                        </div>

                        <div className={cx('fakeMap')}>
                            <div className={cx('pin', 'pin1')}>🚚</div>
                            <div className={cx('pin', 'pin2')}>📦</div>
                            <div className={cx('pin', 'pin3')}>+</div>
                            <div className={cx('pin', 'pin4')}>+</div>
                        </div>
                    </div>

                    <div className={cx('shipperCard')}>
                        <div className={cx('cardHeader')}>
                            <h3>Danh sách Shipper</h3>
                            <div className={cx('tools')}>
                                <button
                                    type="button"
                                    className={cx('toolBtn')}
                                    onClick={() => {
                                        const confirmedOrders = orders.filter((item) => {
                                            const status = String(item?.status || '').toLowerCase();

                                            return status === 'confirmed';
                                        });

                                        toast.info(`Có ${confirmedOrders.length} đơn đã xác nhận`);
                                    }}
                                >
                                    <FontAwesomeIcon icon={faFilter} />
                                </button>

                                <button
                                    type="button"
                                    className={cx('toolBtn')}
                                    onClick={() => {
                                        const rows = [
                                            ['Tên', 'Email', 'SĐT', 'Trạng thái'],
                                            ...shippers.map((item) => [
                                                item.fullname || '',
                                                item.email || '',
                                                formatPhone(item.phone),
                                                getStatusText(item),
                                            ]),
                                        ];

                                        const csvContent = rows.map((row) => row.join(',')).join('\n');

                                        const blob = new Blob([csvContent], {
                                            type: 'text/csv;charset=utf-8;',
                                        });

                                        const url = window.URL.createObjectURL(blob);

                                        const link = document.createElement('a');

                                        link.href = url;
                                        link.setAttribute('download', 'shippers.csv');

                                        document.body.appendChild(link);

                                        link.click();

                                        document.body.removeChild(link);

                                        toast.success('Xuất file shipper thành công');
                                    }}
                                >
                                    <FontAwesomeIcon icon={faDownload} />
                                </button>
                            </div>
                        </div>

                        <table className={cx('shipperTable')}>
                            <thead>
                                <tr>
                                    <th>Shipper</th>
                                    <th>Số điện thoại</th>
                                    <th>Email</th>
                                    <th>Trạng thái</th>
                                    <th>Đánh giá</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6">Đang tải dữ liệu...</td>
                                    </tr>
                                ) : shippers.length > 0 ? (
                                    shippers.map((item) => (
                                        <tr key={item._id}>
                                            <td>
                                                <div className={cx('profile')}>
                                                    <div className={cx('avatar')}>
                                                        {item?.avatar ? (
                                                            <img
                                                                src={item.avatar}
                                                                alt={item.fullname}
                                                                className={cx('avatarImg')}
                                                            />
                                                        ) : (
                                                            getInitials(item.fullname)
                                                        )}
                                                    </div>

                                                    <div>
                                                        <strong>{item.fullname || 'Chưa có tên'}</strong>
                                                        <span>ID: #{item._id?.slice(0, 8)}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>{formatPhone(item?.phone)}</td>
                                            <td>{item?.email || 'Chưa cập nhật'}</td>

                                            <td>
                                                <span className={cx('status', getStatusClass(item))}>
                                                    {getStatusText(item)}
                                                </span>
                                            </td>

                                            <td className={cx('rating')}>
                                                5.0
                                                <FontAwesomeIcon icon={faStar} />
                                            </td>

                                            <td>
                                                <div className={cx('actions')}>
                                                    <button type="button" onClick={() => handleOpenAssignModal(item)}>
                                                        Gán đơn
                                                    </button>

                                                    <button type="button" onClick={() => handleShowDetail(item)}>
                                                        Chi tiết
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6">Chưa có shipper nào.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className={cx('rightCol')}>
                    <div className={cx('alertCard')}>
                        <h3>
                            <FontAwesomeIcon icon={faTriangleExclamation} />
                            Đơn giao cần xử lý
                        </h3>

                        {urgentOrders.length > 0 ? (
                            urgentOrders.map((item) => (
                                <div key={item._id} className={cx('alertItem')}>
                                    <strong>#{getOrderCode(item)}</strong>
                                    <p>{getOrderProductName(item)}</p>
                                    <span>{item?.status || 'Đang xử lý'}</span>
                                </div>
                            ))
                        ) : (
                            <div className={cx('alertItem')}>
                                <strong>Không có đơn cần xử lý</strong>
                                <p>Hiện tại chưa có đơn giao mới.</p>
                                <span>Ổn định</span>
                            </div>
                        )}
                    </div>

                    <div className={cx('deviceCard')}>
                        <h3>Tình trạng vận hành</h3>

                        <div className={cx('deviceItem')}>
                            <div>
                                <span>Shipper sẵn sàng</span>
                                <strong>
                                    {activeShippers}/{shippers.length}
                                </strong>
                            </div>

                            <div className={cx('progress')}>
                                <span
                                    style={{
                                        width: `${shippers.length ? (activeShippers / shippers.length) * 100 : 0}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <div className={cx('deviceItem')}>
                            <div>
                                <span>Đơn hoàn thành</span>
                                <strong>
                                    {completedOrders}/{orders.length}
                                </strong>
                            </div>

                            <div className={cx('progress')}>
                                <span style={{ width: `${successRate}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showAssignModal && selectedShipper && (
                <div className={cx('modalOverlay')}>
                    <div className={cx('detailModal')}>
                        <div className={cx('modalHeader')}>
                            <h3>Gán đơn cho {selectedShipper.fullname}</h3>

                            <button type="button" onClick={() => setShowAssignModal(false)}>
                                ✕
                            </button>
                        </div>

                        <div className={cx('detailBody')}>
                            <div className={cx('assignBox')}>
                                <label>Chọn đơn hàng</label>

                                <select value={selectedOrderId} onChange={(e) => setSelectedOrderId(e.target.value)}>
                                    <option value="">-- Chọn đơn cần giao --</option>

                                    {availableOrders.map((order) => (
                                        <option key={order._id} value={order._id}>
                                            #{getOrderCode(order)} - {getOrderProductName(order)} -{' '}
                                            {Number(order.sumprice || 0).toLocaleString('vi-VN')}đ
                                        </option>
                                    ))}
                                </select>

                                {availableOrders.length === 0 && <p>Hiện không có đơn hàng nào chưa gán shipper.</p>}

                                <button
                                    type="button"
                                    onClick={handleConfirmAssignOrder}
                                    disabled={assigning || !selectedOrderId}
                                >
                                    {assigning ? 'Đang gán...' : 'Xác nhận gán đơn'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ManageShipper;
