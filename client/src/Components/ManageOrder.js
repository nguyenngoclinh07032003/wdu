import classNames from 'classnames/bind';
import styles from '../Styles/ManageOrder.module.scss';
import Pagination from './Pagination';

import { useCallback, useEffect, useMemo, useState } from 'react';
import request from '../Config/api';
import ModalEditOrder from '../utils/Modal/ModalEditOrder';
import ModalCancelOrder from '../utils/Modal/CancelOrder';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { normalizeOrderStatus, getOrderStatusInfo, canAdminUpdateOrder } from '../utils/orderStatus';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faBan, faLock, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';
import { faMagnifyingGlass, faFileExport } from '@fortawesome/free-solid-svg-icons';
const cx = classNames.bind(styles);

function ManageOrder({ allowCancelOrder = true, autoRefresh = true, refreshIntervalMs = 15000 }) {
    const [dataCart, setDataCart] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [idPro, setIdPro] = useState('');
    const [address, setAddress] = useState('');
    const [showModalCancelOrder, setShowModalCancelOrder] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [page, setPage] = useState(1);
    const productsPerPage = 5;

    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    const normalizeOrderItem = (order) => {
        const normalizedStatus = normalizeOrderStatus(order);
        return {
            ...order,
            status: normalizedStatus,
        };
    };

    const fetchOrders = useCallback(async () => {
        try {
            const res = await request.get('/api/getallorder');
            const orders = Array.isArray(res.data) ? res.data : [];
            setDataCart(orders.map(normalizeOrderItem));
        } catch (error) {
            console.log('Lỗi lấy đơn hàng:', error);
            setDataCart([]);
        }
    }, []);

    useEffect(() => {
        fetchOrders();

        if (!autoRefresh) return undefined;

        const intervalId = setInterval(fetchOrders, refreshIntervalMs);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchOrders();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [autoRefresh, fetchOrders, refreshIntervalMs]);

    const processedOrders = useMemo(() => {
        let result = [...dataCart].sort((a, b) => {
            const timeA = a?.updatedAt
                ? new Date(a.updatedAt).getTime()
                : a?.createdAt
                  ? new Date(a.createdAt).getTime()
                  : 0;
            const timeB = b?.updatedAt
                ? new Date(b.updatedAt).getTime()
                : b?.createdAt
                  ? new Date(b.createdAt).getTime()
                  : 0;
            return timeB - timeA;
        });

        if (activeTab !== 'all') {
            result = result.filter((item) => normalizeOrderStatus(item) === activeTab);
        }

        if (searchTerm.trim()) {
            const keyword = searchTerm.toLowerCase().trim();

            result = result.filter((item) => {
                const orderId = String(item?._id || '').toLowerCase();
                const gatewayOrderId = String(item?.gatewayOrderId || '').toLowerCase();
                const username = String(item?.username || '').toLowerCase();
                const phone = String(item?.phone || '').toLowerCase();
                const userId = String(item?.userId || '').toLowerCase();

                return (
                    orderId.includes(keyword) ||
                    gatewayOrderId.includes(keyword) ||
                    username.includes(keyword) ||
                    phone.includes(keyword) ||
                    userId.includes(keyword)
                );
            });
        }

        return result;
    }, [dataCart, activeTab, searchTerm]);

    const totalPages = Math.max(1, Math.ceil(processedOrders.length / productsPerPage));
    const startIndex = (page - 1) * productsPerPage;
    const currentProducts = processedOrders.slice(startIndex, startIndex + productsPerPage);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, activeTab]);

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    const handleShowModalEdit = (item) => {
        if (!item) return;
        setSelectedProduct(item);
        setIdPro(item?._id || '');
        setAddress(item?.address || '');
        setShowModal(true);
    };

    const handleShowModalCancelOrder = (item) => {
        if (!item) return;
        setSelectedProduct(item);
        setShowModalCancelOrder(true);
    };

    const updateOrderInState = (orderId, nextStatus, updatedOrder = null) => {
        const normalizedStatus = String(nextStatus || 'pending')
            .trim()
            .toLowerCase();
        const nextUpdatedAt = updatedOrder?.updatedAt || new Date().toISOString();

        setDataCart((prev) =>
            prev.map((item) =>
                item._id === orderId
                    ? {
                          ...item,
                          ...(updatedOrder || {}),
                          status: normalizedStatus,
                          updatedAt: nextUpdatedAt,
                      }
                    : item,
            ),
        );

        setSelectedProduct((prev) =>
            prev && prev._id === orderId
                ? {
                      ...prev,
                      ...(updatedOrder || {}),
                      status: normalizedStatus,
                      updatedAt: nextUpdatedAt,
                  }
                : prev,
        );
    };

    const handleUpdateSuccess = async (payload) => {
        const updatedOrder = payload?.order || null;
        const orderId = updatedOrder?._id || selectedProduct?._id || idPro;
        const updatedStatus = updatedOrder?.status || payload?.status || 'pending';

        if (!orderId) {
            setShowModal(false);
            await fetchOrders();
            return;
        }

        updateOrderInState(orderId, updatedStatus, updatedOrder || { _id: orderId, status: updatedStatus });
        setShowModal(false);
        await fetchOrders();
    };

    const handleCancelSuccess = async (orderId, updatedOrder = null) => {
        if (!orderId) return;

        updateOrderInState(orderId, 'cancelled', updatedOrder || { _id: orderId, status: 'cancelled' });
        setShowModalCancelOrder(false);
        await fetchOrders();
    };

    const tabs = [
        { key: 'all', label: 'Tất cả' },
        { key: 'pending', label: 'Chờ xử lý' },
        { key: 'confirmed', label: 'Đã xác nhận' },
        { key: 'shipping', label: 'Đang giao hàng' },
        { key: 'completed', label: 'Hoàn thành' },
        { key: 'failed', label: 'Giao thất bại' },
        { key: 'returning', label: 'Đang hoàn hàng' },
        { key: 'returned', label: 'Đã hoàn hàng' },
        { key: 'cancelled', label: 'Đã hủy' },
    ];
    const handleExportOrders = () => {
        if (!processedOrders.length) {
            toast.warning('Không có đơn hàng để xuất');
            return;
        }

        const exportData = processedOrders.map((item, index) => ({
            STT: index + 1,
            'Mã đơn hàng': item._id || '',
            'Mã phụ': item.gatewayOrderId || '',
            'Khách hàng': item.username || '',
            'Số điện thoại': item.phone ? `0${item.phone}` : '',
            'Địa chỉ': item.address || '',
            'Tổng tiền': Number(item.sumprice || 0),
            'Thanh toán': item.paymentMethod || '',
            'Trạng thái': getOrderStatusInfo(normalizeOrderStatus(item)).text,
            'Ngày tạo': item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);

        worksheet['!cols'] = [
            { wch: 6 },
            { wch: 28 },
            { wch: 25 },
            { wch: 20 },
            { wch: 18 },
            { wch: 40 },
            { wch: 18 },
            { wch: 18 },
            { wch: 18 },
            { wch: 25 },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachDonHang');

        const now = new Date();
        const fileName = `don_hang_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
            2,
            '0',
        )}-${String(now.getDate()).padStart(2, '0')}.xlsx`;

        XLSX.writeFile(workbook, fileName);

        toast.success('Xuất đơn hàng thành công');
    };
    return (
        <div className={cx('manageOrderPage')}>
            <ToastContainer />

            <div className={cx('headerRow')}>
                <div>
                    <h1 className={cx('pageTitle')}>Quản lý đơn hàng</h1>
                    <p className={cx('pageDesc')}>Quản lý và theo dõi tất cả đơn hàng từ khách hàng.</p>
                </div>

                <div className={cx('headerActions')}>
                    <div className={cx('searchBox')}>
                        <FontAwesomeIcon icon={faMagnifyingGlass} className={cx('searchIcon')} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo mã đơn, mã phụ, khách hàng..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button className={cx('exportBtn')} type="button" onClick={handleExportOrders}>
                        <FontAwesomeIcon icon={faFileExport} />
                        <span>Xuất đơn hàng</span>
                    </button>
                </div>
            </div>

            <div className={cx('tabs')}>
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        className={cx('tabBtn', { active: activeTab === tab.key })}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className={cx('filterBar')}>
                <div className={cx('filterLeft')}>
                    <button type="button" className={cx('filterBtn')}>
                        Ngày đặt hàng
                    </button>
                    <button type="button" className={cx('filterBtn')}>
                        Phương thức thanh toán
                    </button>
                    <button type="button" className={cx('filterBtn')}>
                        Đơn vị vận chuyển
                    </button>
                </div>

                <div className={cx('filterRight')}>
                    Hiển thị{' '}
                    <strong>
                        {processedOrders.length === 0 ? 0 : startIndex + 1}-
                        {Math.min(startIndex + productsPerPage, processedOrders.length)}
                    </strong>{' '}
                    trong số <strong>{processedOrders.length}</strong> đơn hàng
                </div>
            </div>

            <div className={cx('tableCard')}>
                <div className={cx('tableResponsive')}>
                    <table className={cx('orderTable')}>
                        <thead>
                            <tr>
                                <th>Đơn hàng</th>
                                <th>Khách hàng</th>
                                <th>Sản phẩm</th>
                                <th>Thanh toán</th>
                                <th>Tổng tiền</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>

                        <tbody>
                            {currentProducts.length > 0 ? (
                                currentProducts.map((item) => {
                                    const status = normalizeOrderStatus(item);
                                    const statusInfo = getOrderStatusInfo(status);
                                    const products = Array.isArray(item.products) ? item.products : [];
                                    const firstProduct = products[0];
                                    const remainCount = products.length > 1 ? products.length - 1 : 0;
                                    const canUpdate = canAdminUpdateOrder(status);
                                    const canCancel = allowCancelOrder && status !== 'completed' && status !== 'cancelled';

                                    return (
                                        <tr key={item._id}>
                                            <td>
                                                <div className={cx('infoBlock')}>
                                                    <strong className={cx('orderCode')}>{item._id || '---'}</strong>
                                                    <span>Mã phụ: {item.gatewayOrderId || '---'}</span>
                                                    <span>
                                                        {item.createdAt
                                                            ? new Date(item.createdAt).toLocaleString('vi-VN')
                                                            : '---'}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <div className={cx('infoBlock')}>
                                                    <strong>{item.username || '---'}</strong>
                                                    <span>{item.phone ? `0${item.phone}` : '---'}</span>
                                                    <span className={cx('textClamp')}>{item.address || '---'}</span>
                                                </div>
                                            </td>

                                            <td>
                                                <div className={cx('infoBlock')}>
                                                    <strong>{firstProduct?.nameProduct || 'Không có sản phẩm'}</strong>
                                                    <span>Số lượng: {firstProduct?.quantity || 0}</span>
                                                    {remainCount > 0 && (
                                                        <span className={cx('moreProduct')}>
                                                            +{remainCount} sản phẩm khác
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td>
                                                <div className={cx('infoBlock')}>
                                                    <span className={cx('paymentBadge')}>
                                                        {item.paymentMethod || '---'}
                                                    </span>
                                                    <span>ID KH: {item.userId || '---'}</span>
                                                </div>
                                            </td>

                                            <td className={cx('totalPrice')}>
                                                {Number(item.sumprice || 0).toLocaleString('vi-VN')} đ
                                            </td>

                                            <td>
                                                <span className={cx('statusBadge', statusInfo.className)}>
                                                    {statusInfo.text}
                                                </span>
                                            </td>

                                            <td>
                                                <div className={cx('actionWrap')}>
                                                    {canUpdate ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleShowModalEdit(item)}
                                                            className={cx('iconButton', 'editButton')}
                                                            title="Cập nhật đơn hàng"
                                                        >
                                                            <FontAwesomeIcon icon={faPenToSquare} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className={cx('iconButton', 'lockButton')}
                                                            title="Đơn hàng không thể cập nhật"
                                                            disabled
                                                        >
                                                            <FontAwesomeIcon icon={faLock} />
                                                        </button>
                                                    )}

                                                    {canCancel ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleShowModalCancelOrder(item)}
                                                            className={cx('iconButton', 'cancelButton')}
                                                            title="Hủy đơn hàng"
                                                        >
                                                            <FontAwesomeIcon icon={faBan} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className={cx(
                                                                'iconButton',
                                                                status === 'cancelled'
                                                                    ? 'cancelledButton'
                                                                    : 'completedButton',
                                                            )}
                                                            title={
                                                                status === 'cancelled'
                                                                    ? 'Đơn đã hủy'
                                                                    : 'Đơn đã hoàn tất'
                                                            }
                                                            disabled
                                                        >
                                                            <FontAwesomeIcon
                                                                icon={status === 'cancelled' ? faBan : faCircleCheck}
                                                            />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" className={cx('emptyState')}>
                                        Không có đơn hàng nào
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className={cx('paginationWrap')}>
                    <Pagination page={page} totalPages={totalPages} handlePageChange={handlePageChange} />
                </div>
            </div>

            <ModalEditOrder
                show={showModal}
                setShow={setShowModal}
                id={idPro}
                address={address}
                currentStatus={selectedProduct ? normalizeOrderStatus(selectedProduct) : 'pending'}
                onSuccess={handleUpdateSuccess}
            />

            <ModalCancelOrder
                show={showModalCancelOrder}
                setShow={setShowModalCancelOrder}
                item={selectedProduct}
                onCancelSuccess={handleCancelSuccess}
                apiUrl="/api/admin/cancelorder"
                mode="admin"
            />
        </div>
    );
}

export default ManageOrder;
