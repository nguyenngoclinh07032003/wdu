import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
main

const cx = classNames.bind(styles);

function OrderActivity({ dataPayments = [], onViewDetail, onCancelSuccess }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [showModalCancelOrder, setShowModalCancelOrder] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const itemsPerPage = 7;

    const formatDateTime = (date) => {
        if (!date) return 'Không có ngày';

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

    };

    const handleShowModalCancelOrder = (item) => {
        if (!item) return;

        setSelectedOrder(item);
        setShowModalCancelOrder(true);
    };

    const processedPayments = useMemo(() => {
        const source = Array.isArray(dataPayments) ? dataPayments : [];
        const uniqueMap = new Map();

        return [...uniqueMap.values()]
            .filter((item) => !shouldHideOrder(item))
            .sort((a, b) => {
                const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
                const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;

                return String(b?._id || '').localeCompare(String(a?._id || ''));
            });
    }, [dataPayments]);

    const totalPages = Math.ceil(processedPayments.length / itemsPerPage) || 1;



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

                                    const isNewOrder = diffHours !== null && diffHours <= 24;
                                    const status = normalizeOrderStatus(item);
                                    const statusInfo = getOrderStatusInfo(status);
                                    const canCancel = canCancelOrder(status);

                                            <td>
                                                <div className={cx('orderIdBox')}>
                                                    <span className={cx('orderId')}>#{item?._id?.slice(0, 7)}</span>
                                                    {isNewOrder && <span className={cx('newBadge')}>Mới</span>}
                                                </div>
                                            </td>

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

                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {processedPayments.length > 0 && totalPages > 1 && (
                    <div className={cx('pagination')}>

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
