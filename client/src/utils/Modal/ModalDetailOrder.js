import classNames from 'classnames/bind';
import styles from '../../Styles/InfoUser.module.scss';
import { normalizeOrderStatus, getOrderStatusInfo } from '../../utils/orderStatus';
import { resolveDeliveryStatus } from '../../utils/deliveryStatus';
import {
    FaRegClock,
    FaCircleCheck,
    FaTruckFast,
    FaFlagCheckered,
    FaTriangleExclamation,
    FaRotateLeft,
    FaBoxOpen,
    FaBan,
    FaCalendarDays,
} from 'react-icons/fa6';

const cx = classNames.bind(styles);

function OrderDetailModal({ order, onClose }) {
    if (!order) return null;

    const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

    const formatDate = (date) => {
        if (!date) return 'Không có';
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return 'Không có';
        return d.toLocaleDateString('vi-VN');
    };

    const formatShortDateTime = (date) => {
        if (!date) return 'Chưa có';
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return 'Chưa có';

        return d.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const status = normalizeOrderStatus(order);
    const statusInfo = getOrderStatusInfo(order);
    const deliveryStatus = resolveDeliveryStatus(order);
    const publicFailureReason =
        deliveryStatus === 'RETURNING' || deliveryStatus === 'RETURNED'
            ? order.secondFailureReason || order.firstFailureReason
            : order.firstFailureReason;

    const getTimelineSteps = () => {
        if (status === 'cancelled') {
            return [
                {
                    key: 'pending',
                    label: 'Chờ xử lý',
                    icon: <FaRegClock />,
                    time: formatShortDateTime(order?.createdAt),
                },
                {
                    key: 'cancelled',
                    label: 'Đã hủy',
                    icon: <FaBan />,
                    time: formatShortDateTime(order?.cancelledAt || order?.updatedAt),
                },
            ];
        }

        // Timeline theo deliveryStatus khi đã gán shipper
        if (deliveryStatus) {
            const steps = [
                {
                    key: 'pending',
                    label: 'Chờ xử lý',
                    icon: <FaRegClock />,
                    time: formatShortDateTime(order?.createdAt),
                },
                {
                    key: 'ASSIGNED',
                    label: 'Đã giao shipper',
                    icon: <FaCircleCheck />,
                    time: formatShortDateTime(order?.assignedAt || order?.confirmedAt || order?.updatedAt),
                },
                {
                    key: 'DELIVERING',
                    label: 'Đang giao hàng',
                    icon: <FaTruckFast />,
                    time:
                        ['DELIVERING', 'FIRST_DELIVERY_FAILED', 'REDELIVERING', 'DELIVERED', 'DELIVERED_AFTER_RETRY', 'RETURNING', 'RETURNED'].includes(
                            deliveryStatus,
                        )
                            ? formatShortDateTime(order?.shippingAt || order?.updatedAt)
                            : 'Chưa có',
                },
            ];

            if (
                ['FIRST_DELIVERY_FAILED', 'REDELIVERING', 'DELIVERED_AFTER_RETRY', 'RETURNING', 'RETURNED'].includes(
                    deliveryStatus,
                )
            ) {
                steps.push({
                    key: 'FIRST_DELIVERY_FAILED',
                    label: 'Giao thất bại lần 1',
                    icon: <FaTriangleExclamation />,
                    time: formatShortDateTime(order?.firstFailureTime || order?.failedAt || order?.updatedAt),
                });
            }

            if (['REDELIVERING', 'DELIVERED_AFTER_RETRY', 'RETURNING', 'RETURNED'].includes(deliveryStatus)) {
                steps.push({
                    key: 'REDELIVERING',
                    label: 'Đang giao lại',
                    icon: <FaTruckFast />,
                    time: formatShortDateTime(order?.redeliveryScheduledAt || order?.updatedAt),
                });
            }

            if (deliveryStatus === 'DELIVERED' || deliveryStatus === 'DELIVERED_AFTER_RETRY') {
                steps.push({
                    key: deliveryStatus === 'DELIVERED_AFTER_RETRY' ? 'DELIVERED_AFTER_RETRY' : 'DELIVERED',
                    label:
                        deliveryStatus === 'DELIVERED_AFTER_RETRY'
                            ? 'Giao thành công (lần 2)'
                            : 'Giao thành công',
                    icon: <FaFlagCheckered />,
                    time: formatShortDateTime(order?.deliveredAt || order?.completedAt || order?.updatedAt),
                });
            }

            if (deliveryStatus === 'RETURNING' || deliveryStatus === 'RETURNED') {
                steps.push({
                    key: 'RETURNING',
                    label: 'Đang hoàn hàng',
                    icon: <FaRotateLeft />,
                    time: formatShortDateTime(order?.returningAt || order?.updatedAt),
                });
                steps.push({
                    key: 'RETURNED',
                    label: 'Đã hoàn hàng',
                    icon: <FaBoxOpen />,
                    time:
                        deliveryStatus === 'RETURNED'
                            ? formatShortDateTime(order?.returnedAt || order?.updatedAt)
                            : 'Chưa có',
                });
            }

            return steps;
        }

        if (status === 'failed') {
            return [
                {
                    key: 'pending',
                    label: 'Chờ xử lý',
                    icon: <FaRegClock />,
                    time: formatShortDateTime(order?.createdAt),
                },
                {
                    key: 'confirmed',
                    label: 'Đã xác nhận',
                    icon: <FaCircleCheck />,
                    time: formatShortDateTime(order?.confirmedAt || order?.updatedAt),
                },
                {
                    key: 'shipping',
                    label: 'Đang giao hàng',
                    icon: <FaTruckFast />,
                    time: formatShortDateTime(order?.shippingAt || order?.updatedAt),
                },
                {
                    key: 'failed',
                    label: 'Giao thất bại',
                    icon: <FaTriangleExclamation />,
                    time: formatShortDateTime(order?.failedAt || order?.updatedAt),
                },
            ];
        }

        if (status === 'returning' || status === 'returned') {
            return [
                {
                    key: 'pending',
                    label: 'Chờ xử lý',
                    icon: <FaRegClock />,
                    time: formatShortDateTime(order?.createdAt),
                },
                {
                    key: 'confirmed',
                    label: 'Đã xác nhận',
                    icon: <FaCircleCheck />,
                    time: formatShortDateTime(order?.confirmedAt || order?.updatedAt),
                },
                {
                    key: 'shipping',
                    label: 'Đang giao hàng',
                    icon: <FaTruckFast />,
                    time: formatShortDateTime(order?.shippingAt || order?.updatedAt),
                },
                {
                    key: 'returning',
                    label: 'Đang hoàn hàng',
                    icon: <FaRotateLeft />,
                    time:
                        status === 'returning' || status === 'returned'
                            ? formatShortDateTime(order?.returningAt || order?.updatedAt)
                            : 'Chưa có',
                },
                {
                    key: 'returned',
                    label: 'Đã hoàn hàng',
                    icon: <FaBoxOpen />,
                    time:
                        status === 'returned' ? formatShortDateTime(order?.returnedAt || order?.updatedAt) : 'Chưa có',
                },
            ];
        }

        return [
            {
                key: 'pending',
                label: 'Chờ xử lý',
                icon: <FaRegClock />,
                time: formatShortDateTime(order?.createdAt),
            },
            {
                key: 'confirmed',
                label: 'Đã xác nhận',
                icon: <FaCircleCheck />,
                time: ['confirmed', 'shipping', 'completed'].includes(status)
                    ? formatShortDateTime(order?.confirmedAt || order?.updatedAt)
                    : 'Chưa có',
            },
            {
                key: 'shipping',
                label: 'Đang giao hàng',
                icon: <FaTruckFast />,
                time: ['shipping', 'completed'].includes(status)
                    ? formatShortDateTime(order?.shippingAt || order?.updatedAt)
                    : 'Chưa có',
            },
            {
                key: 'completed',
                label: 'Hoàn thành',
                icon: <FaFlagCheckered />,
                time: status === 'completed' ? formatShortDateTime(order?.completedAt || order?.updatedAt) : 'Chưa có',
            },
        ];
    };

    const timelineSteps = getTimelineSteps();

    const resolveActiveTimelineKey = () => {
        if (status === 'cancelled') return 'cancelled';
        if (!deliveryStatus) return status;

        const map = {
            ASSIGNED: 'ASSIGNED',
            ACCEPTED: 'ASSIGNED',
            DELIVERING: 'DELIVERING',
            FIRST_DELIVERY_FAILED: 'FIRST_DELIVERY_FAILED',
            REDELIVERING: 'REDELIVERING',
            DELIVERED: 'DELIVERED',
            DELIVERED_AFTER_RETRY: 'DELIVERED_AFTER_RETRY',
            RETURNING: 'RETURNING',
            RETURNED: 'RETURNED',
        };
        return map[deliveryStatus] || deliveryStatus;
    };

    const activeKey = resolveActiveTimelineKey();
    let currentStepIndex = timelineSteps.findIndex((step) => step.key === activeKey);
    if (currentStepIndex < 0 && deliveryStatus === 'ACCEPTED') {
        currentStepIndex = timelineSteps.findIndex((step) => step.key === 'ASSIGNED');
    }
    if (currentStepIndex < 0) currentStepIndex = 0;

    const products = Array.isArray(order?.products) ? order.products : [];

    const subtotal =
        Number(order?.subtotal || 0) ||
        products.reduce((total, product) => {
            return total + Number(product?.price || 0) * Number(product?.quantity || 0);
        }, 0);

    const shippingFee = Number(order?.shippingFee || 0);
    const tax = Number(order?.tax || 0);
    const productDiscount = Number(order?.productDiscount || 0);
    const shippingDiscount = Number(order?.shippingDiscount || 0);
    const totalDiscount = productDiscount + shippingDiscount;

    const totalPayment = Number(order?.sumprice || 0) || Math.max(subtotal + shippingFee + tax - totalDiscount, 0);

    return (
        <div className={cx('modalOverlay')} onClick={onClose}>
            <div className={cx('modalContent')} onClick={(e) => e.stopPropagation()}>
                <div className={cx('modalHeader')}>
                    <h3>Chi tiết đơn hàng</h3>
                    <button type="button" className={cx('closeBtn')} onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className={cx('orderTimelineBox')}>
                    <div className={cx('timelineTop')}>
                        <div>
                            <h4>Đơn hàng #{order?._id?.slice(-6).toUpperCase()}</h4>
                            <p>
                                <FaCalendarDays />
                                <span>Ngày đặt hàng: {formatDate(order?.createdAt)}</span>
                            </p>
                        </div>
                        <span className={cx('timelineStatus')}>🚚 {statusInfo.text}</span>{' '}
                    </div>

                    <div className={cx('timeline')}>
                        {timelineSteps.map((step, index) => {
                            const active = index <= currentStepIndex;
                            const current = index === currentStepIndex;

                            return (
                                <div
                                    key={step.key}
                                    className={cx('timelineItem', step.key, {
                                        active,
                                        current,
                                        danger: ['cancelled', 'failed'].includes(step.key),
                                        warning: ['returning', 'returned'].includes(step.key),
                                    })}
                                >
                                    <div className={cx('timelineIcon')}>{step.icon}</div>
                                    <strong>{step.label}</strong>
                                    <span>{step.time}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className={cx('modalInfo')}>
                    <p>
                        <strong>Mã đơn:</strong> {order?._id}
                    </p>

                    <p>
                        <strong>Email:</strong> {order?.email || order?.user || 'Không có email'}
                    </p>

                    <p>
                        <strong>Số điện thoại:</strong> {order?.phone || 'Không có'}
                    </p>

                    <p>
                        <strong>Địa chỉ:</strong> {order?.address || 'Không có'}
                    </p>

                    <p>
                        <strong>Phương thức thanh toán:</strong> {order?.paymentMethod || 'COD'}
                    </p>

                    <p>
                        <strong>Trạng thái:</strong>{' '}
                        <span className={cx('statusBadge', statusInfo.className)}>{statusInfo.text}</span>
                    </p>

                    {publicFailureReason ? (
                        <p>
                            <strong>Lý do giao thất bại:</strong> {publicFailureReason}
                        </p>
                    ) : null}

                    {order?.redeliveryScheduledAt ? (
                        <p>
                            <strong>Thời gian giao lại dự kiến:</strong>{' '}
                            {formatShortDateTime(order.redeliveryScheduledAt)}
                        </p>
                    ) : null}

                    {order?.updatedAt ? (
                        <p>
                            <strong>Cập nhật lúc:</strong> {formatShortDateTime(order.updatedAt)}
                        </p>
                    ) : null}
                </div>

                <div className={cx('orderProducts')}>
                    <table className={cx('table', 'detailTable')}>
                        <thead>
                            <tr>
                                <th>Tên sản phẩm</th>
                                <th>Đơn giá</th>
                                <th>Số lượng</th>
                                <th>Thành tiền</th>
                            </tr>
                        </thead>

                        <tbody>
                            {products.length > 0 ? (
                                products.map((product, index) => {
                                    const price = Number(product?.price || 0);
                                    const quantity = Number(product?.quantity || 0);

                                    return (
                                        <tr key={`${order._id}-${index}`}>
                                            <td>{product?.nameProduct || 'Không có tên'}</td>
                                            <td>{formatMoney(price)}</td>
                                            <td>{quantity}</td>
                                            <td>{formatMoney(price * quantity)}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="4" className={cx('emptyRow')}>
                                        Không có sản phẩm
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className={cx('orderSummary')}>
                    <p>
                        <span>Tạm tính</span>
                        <strong>{formatMoney(subtotal)}</strong>
                    </p>

                    <p>
                        <span>Phí vận chuyển</span>
                        <strong>{formatMoney(shippingFee)}</strong>
                    </p>

                    <p>
                        <span>Thuế</span>
                        <strong>{formatMoney(tax)}</strong>
                    </p>

                    <p>
                        <span>Giảm giá</span>
                        <strong>-{formatMoney(totalDiscount)}</strong>
                    </p>

                    <p className={cx('summaryTotal')}>
                        <span>Tổng thanh toán</span>
                        <strong>{formatMoney(totalPayment)}</strong>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default OrderDetailModal;
