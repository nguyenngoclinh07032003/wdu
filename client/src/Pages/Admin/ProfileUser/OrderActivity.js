import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../../Styles/InfoUser.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faXmark, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import ModalCancelOrder from '../../../utils/Modal/CancelOrder';
import { normalizeOrderStatus, getOrderStatusInfo } from '../../../utils/orderStatus';

const cx = classNames.bind(styles);

function OrderActivity({ dataPayments = [], onViewDetail, onCancelSuccess }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [showModalCancelOrder, setShowModalCancelOrder] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const itemsPerPage = 7;

    const formatDateTime = (date) => {
        if (!date) return 'Không có ngày';
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return 'Không có ngày';
        return d.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTimeAgo = (date) => {
        if (!date) return '';
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return '';
        const diffMs = Date.now() - d.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffMinutes < 1) return 'Vừa xong';
        if (diffMinutes < 60) return `${diffMinutes} phút trước`;
        if (diffHours < 24) return `${diffHours} giờ trước`;
        if (diffDays < 30) return `${diffDays} ngày trước`;
        return formatDateTime(date);
    };

    const canCancelOrder = (status) => {
        return status === 'pending' || status === 'pending';
    };

    const shouldHideOrder = (item) => {
        const status = normalizeOrderStatus(item);
        if (status !== 'completed' && status !== 'cancelled') return false;
        const hiddenBaseTime = item?.updatedAt || item?.createdAt;
        if (!hiddenBaseTime) return false;
        const timeMs = new Date(hiddenBaseTime).getTime();
        if (Number.isNaN(timeMs)) return false;
        const oneDayMs = 24 * 60 * 60 * 1000;
        return Date.now() - timeMs >= oneDayMs;
    };

    const handleShowModalCancelOrder = (item) => {
        if (!item) return;
        const status = normalizeOrderStatus(item);
        if (!canCancelOrder(status)) return;
        setSelectedOrder(item);
        setShowModalCancelOrder(true);
    };

    const processedPayments = useMemo(() => {
        const source = Array.isArray(dataPayments) ? dataPayments : [];
        const uniqueMap = new Map();
        source.forEach((item) => {
            const id = item?._id;
            if (!id) return;
            const oldItem = uniqueMap.get(id);
            if (!oldItem) { uniqueMap.set(id, item); return; }
            const oldTime = oldItem?.updatedAt ? new Date(oldItem.updatedAt).getTime() : oldItem?.createdAt ? new Date(oldItem.createdAt).getTime() : 0;
            const newTime = item?.updatedAt ? new Date(item.updatedAt).getTime() : item?.createdAt ? new Date(item.createdAt).getTime() : 0;
            if (newTime >= oldTime) uniqueMap.set(id, item);
        });
        return [...uniqueMap.values()]
            .filter((item) => !shouldHideOrder(item))
            .sort((a, b) => {
                const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
                if (timeB !== timeA) return timeB - timeA;
                return String(b?._id || '').localeCompare(String(a?._id || ''));
            });
    }, [dataPayments]);

    const totalPages = Math.ceil(processedPayments.length / itemsPerPage) || 1;

    useEffect(() => { setCurrentPage(1); }, [dataPayments]);
    useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

    const paginatedPayments = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedPayments.slice(startIndex, startIndex + itemsPerPage);
    }, [processedPayments, currentPage]);

    const handlePageChange = (page) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    const renderPageNumbers = () => {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(
                <button key={i} type="button" className={cx('pageBtn', { activePage: currentPage === i })} onClick={() => handlePageChange(i)}>
                    {i}
                </button>
            );
        }
        return pages;
    };

    return (
        <>
            <div className={cx('activityCard')}>
                <div className={cx('activityHeader')}>
                    <h3>Đơn hàng gần đây</h3>
                    <span className={cx('activityCount')}>{processedPayments.length} đơn</span>
                </div>

                <div className={cx('tableWrap')}>
                    <table className={cx('table', 'orderTable')}>
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Sản phẩm đầu tiên</th>
                                <th>Số lượng SP</th>
                                <th>Tổng tiền</th>
                                <th>Ngày mua hàng</th>
                                <th>Trạng thái</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedPayments.length > 0 ? (
                                paginatedPayments.map((item) => {
                                    const createdAt = item?.createdAt ? new Date(item.createdAt) : null;
                                    const isValidDate = createdAt && !Number.isNaN(createdAt.getTime());
                                    const diffHours = isValidDate ? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60) : null;
                                    const isNewOrder = diffHours !== null && diffHours <= 24;
                                    const status = normalizeOrderStatus(item);
                                    const statusInfo = getOrderStatusInfo(status);
                                    const canCancel = canCancelOrder(status);
                                    return (
                                        <tr key={item?._id} className={cx('orderRow', { newOrder: isNewOrder })}>
                                            <td>
                                                <div className={cx('orderIdBox')}>
                                                    <span className={cx('orderId')}>#{item?._id?.slice(0, 7)}</span>
                                                    {isNewOrder && <span className={cx('newBadge')}>Mới</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <div className={cx('productCell')}>
                                                    <span className={cx('productName')}>{item?.products?.[0]?.nameProduct || 'Không có sản phẩm'}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={cx('qtyBadge')}>
                                                    {item?.products?.reduce((total, product) => total + Number(product?.quantity || 0), 0) || 0}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={cx('priceText')}>{Number(item?.sumprice || 0).toLocaleString('vi-VN')} đ</span>
                                            </td>
                                            <td>
                                                <div className={cx('dateCell')}>
                                                    <span className={cx('dateMain')}>{formatDateTime(item?.createdAt)}</span>
                                                    <span className={cx('dateSub')}>{getTimeAgo(item?.createdAt)}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={cx('statusBadge', statusInfo.className)}>{statusInfo.text}</span>
                                            </td>
                                            <td>
                                                <div className={cx('actionWrap')}>
                                                    <button type="button" className={cx('detailBtn', 'detailBtnFancy')} onClick={() => onViewDetail?.(item)}>
                                                        <FontAwesomeIcon icon={faEye} />
                                                        <span>Xem</span>
                                                    </button>
                                                    {canCancel ? (
                                                        <button type="button" className={cx('cancelBtn')} onClick={() => handleShowModalCancelOrder(item)}>
                                                            <FontAwesomeIcon icon={faXmark} />
                                                            <span>Hủy đơn</span>
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" className={cx('emptyRow')}>Không có đơn hàng nào</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {processedPayments.length > 0 && totalPages > 1 && (
                    <div className={cx('pagination')}>
                        <button type="button" className={cx('pageNavBtn')} onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                            <FontAwesomeIcon icon={faChevronLeft} />
                        </button>
                        {renderPageNumbers()}
                        <button type="button" className={cx('pageNavBtn')} onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                            <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                    </div>
                )}
            </div>

            <ModalCancelOrder
                show={showModalCancelOrder}
                setShow={setShowModalCancelOrder}
                item={selectedOrder}
                onCancelSuccess={onCancelSuccess}
            />
        </>
    );
}

export default OrderActivity;
