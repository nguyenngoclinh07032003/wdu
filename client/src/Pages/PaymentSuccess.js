import classNames from 'classnames/bind';
import styles from '../Styles/PaymentsSuccess.module.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import { useEffect, useMemo, useState } from 'react';
import request from '../Config/api';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCheck,
    faUser,
    faLocationDot,
    faPhone,
    faBox,
    faShieldHalved,
    faTruckFast,
    faBagShopping,
} from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

const SHIPPING_FEE = Number(process.env.REACT_APP_ORDER_SHIPPING_FEE || process.env.ORDER_SHIPPING_FEE) || 30000;

function PaymentSuccess() {
    const [dataPayment, setDataPayment] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        request
            .get('/api/payment')
            .then((res) => {
                setDataPayment(Array.isArray(res.data) ? res.data : []);
            })
            .catch((err) => {
                console.log('Lỗi lấy đơn hàng:', err);
                setDataPayment([]);
            });
    }, []);

    const savedOrderInfo = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('lastOrderInfo') || '{}');
        } catch {
            return {};
        }
    }, []);

    const order = useMemo(() => {
        if (!Array.isArray(dataPayment) || dataPayment.length === 0) return null;

        const savedOrderId = savedOrderInfo?._id;
        const savedGatewayOrderId = savedOrderInfo?.gatewayOrderId;

        if (savedOrderId) {
            const found = dataPayment.find((item) => String(item?._id) === String(savedOrderId));
            if (found) return found;
        }

        if (savedGatewayOrderId) {
            const found = dataPayment.find(
                (item) => String(item?.gatewayOrderId || '') === String(savedGatewayOrderId),
            );
            if (found) return found;
        }

        return [...dataPayment].sort((a, b) => {
            return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
        })[0];
    }, [dataPayment, savedOrderInfo]);

    const products = useMemo(() => {
        if (Array.isArray(order?.products)) return order.products;
        if (Array.isArray(order?.dataProducts)) return order.dataProducts;
        if (Array.isArray(savedOrderInfo?.products)) return savedOrderInfo.products;
        return [];
    }, [order, savedOrderInfo]);

    const voucher = order?.voucher || savedOrderInfo?.voucher || null;
    const hasVoucher = !!voucher?.code;

    const formatPrice = (value) => {
        return Number(value || 0).toLocaleString('vi-VN') + 'đ';
    };

    const subtotal = useMemo(() => {
        if (order?.subtotal !== undefined) return Number(order.subtotal || 0);
        if (savedOrderInfo?.subtotal !== undefined) return Number(savedOrderInfo.subtotal || 0);

        if (products.length > 0) {
            return products.reduce((total, item) => {
                return total + Number(item?.price || 0) * Number(item?.quantity || 0);
            }, 0);
        }

        return 0;
    }, [order, savedOrderInfo, products]);

    const productDiscount = useMemo(() => {
        if (order?.productDiscount !== undefined) return Number(order.productDiscount || 0);
        if (savedOrderInfo?.productDiscount !== undefined) return Number(savedOrderInfo.productDiscount || 0);
        return 0;
    }, [order, savedOrderInfo]);

    const shippingDiscount = useMemo(() => {
        if (order?.shippingDiscount !== undefined) return Number(order.shippingDiscount || 0);
        if (savedOrderInfo?.shippingDiscount !== undefined) return Number(savedOrderInfo.shippingDiscount || 0);
        return 0;
    }, [order, savedOrderInfo]);

    // Tính toán phí vận chuyển sau khi áp dụng voucher
    const shippingFee = useMemo(() => {
        const orderShippingFee = Number(order?.shippingFee);
        const savedShippingFee = Number(savedOrderInfo?.shippingFee);

        if (order?.shippingFee !== undefined && !Number.isNaN(orderShippingFee) && orderShippingFee > 0) {
            return orderShippingFee;
        }

        if (savedOrderInfo?.shippingFee !== undefined && !Number.isNaN(savedShippingFee) && savedShippingFee > 0) {
            return savedShippingFee;
        }

        return Math.max(SHIPPING_FEE - shippingDiscount, 0);
    }, [order, savedOrderInfo, shippingDiscount]);

    // Tính toán tổng tiền cuối cùng sau khi áp dụng voucher và phí vận chuyển
    const total = useMemo(() => {
        const orderTotal = Number(order?.sumprice);
        const savedTotal = Number(savedOrderInfo?.sumprice);

        const calculatedTotal = Math.max(subtotal - productDiscount + shippingFee, 0);

        if (order?.sumprice !== undefined && !Number.isNaN(orderTotal) && orderTotal >= calculatedTotal) {
            return orderTotal;
        }

        if (savedOrderInfo?.sumprice !== undefined && !Number.isNaN(savedTotal) && savedTotal >= calculatedTotal) {
            return savedTotal;
        }

        return calculatedTotal;
    }, [order, savedOrderInfo, subtotal, productDiscount, shippingFee]);

    const receiverName =
        order?.fullName ||
        order?.name ||
        order?.fullname ||
        order?.username ||
        savedOrderInfo?.fullName ||
        savedOrderInfo?.name ||
        savedOrderInfo?.fullname ||
        savedOrderInfo?.username ||
        'Chưa có tên';

    const receiverPhone = order?.phone || savedOrderInfo?.phone || 'Chưa có số điện thoại';
    const receiverAddress = order?.address || savedOrderInfo?.address || 'Chưa có địa chỉ giao hàng';
    const orderCode = order?._id || savedOrderInfo?._id || 'Chưa có mã đơn hàng';

    return (
        <div className={cx('wrapper')}>
            <header>
                <Header />
            </header>

            <main className={cx('main')}>
                <section className={cx('successTop')}>
                    <div className={cx('successIconOuter')}>
                        <div className={cx('successIconInner')}>
                            <FontAwesomeIcon icon={faCheck} />
                        </div>
                    </div>

                    <h1 className={cx('title')}>Cảm ơn bạn đã đặt hàng!</h1>
                    <p className={cx('subtitle')}>Đơn hàng của bạn đã được tiếp nhận và đang được xử lý.</p>

                    <div className={cx('orderBadge')}>Mã đơn hàng: #{orderCode}</div>
                </section>

                {!order && products.length === 0 ? (
                    <div className={cx('empty')}>Chưa có dữ liệu đơn hàng để hiển thị.</div>
                ) : (
                    <section className={cx('content')}>
                        <div className={cx('leftColumn')}>
                            <div className={cx('card')}>
                                <h2 className={cx('cardTitle')}>Chi tiết sản phẩm</h2>

                                <div className={cx('productList')}>
                                    {products.map((item, index) => (
                                        <div key={item?._id || item?.id || index} className={cx('productRow')}>
                                            <div className={cx('productImage')}>
                                                <img
                                                    src={
                                                        item?.img
                                                            ? `${process.env.REACT_APP_IMG}/${item.img}`
                                                            : 'https://via.placeholder.com/100x100?text=Product'
                                                    }
                                                    alt={item?.nameProduct || item?.name || 'Sản phẩm'}
                                                />
                                            </div>

                                            <div className={cx('productInfo')}>
                                                <h3 className={cx('productName')}>
                                                    {item?.nameProduct || item?.name || 'Sản phẩm'}
                                                </h3>

                                                <span className={cx('productQuantity')}>
                                                    Số lượng: {String(item?.quantity || 1).padStart(2, '0')}
                                                </span>
                                            </div>

                                            <div className={cx('productPrice')}>
                                                {formatPrice(Number(item?.price || 0) * Number(item?.quantity || 0))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className={cx('divider')}></div>

                                <div className={cx('summary')}>
                                    <div className={cx('summaryRow')}>
                                        <span>Tạm tính</span>
                                        <span>{formatPrice(subtotal)}</span>
                                    </div>

                                    {hasVoucher && (
                                        <div className={cx('summaryRow')}>
                                            <span>Voucher</span>
                                            <span>
                                                {voucher.code} - {voucher.title}
                                            </span>
                                        </div>
                                    )}

                                    <div className={cx('summaryRow')}>
                                        <span>Giảm sản phẩm</span>
                                        <span>-{formatPrice(productDiscount)}</span>
                                    </div>

                                    <div className={cx('summaryRow')}>
                                        <span>Phí vận chuyển</span>
                                        <span>{formatPrice(SHIPPING_FEE)}</span>
                                    </div>

                                    <div className={cx('summaryRow')}>
                                        <span>Giảm vận chuyển</span>
                                        <span>-{formatPrice(shippingDiscount)}</span>
                                    </div>

                                    <div className={cx('summaryRow')}>
                                        <span>Phí vận chuyển sau giảm</span>
                                        <span>{formatPrice(shippingFee)}</span>
                                    </div>

                                    <div className={cx('summaryTotal')}>
                                        <span>Tổng cộng</span>
                                        <strong>{formatPrice(total)}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className={cx('actionGroup')}>
                                <button className={cx('btnPrimary')} onClick={() => navigate('/info')}>
                                    <FontAwesomeIcon icon={faTruckFast} />
                                    <span>Theo dõi đơn hàng</span>
                                </button>

                                <button className={cx('btnSecondary')} onClick={() => navigate('/')}>
                                    <FontAwesomeIcon icon={faBagShopping} />
                                    <span>Tiếp tục mua sắm</span>
                                </button>
                            </div>
                        </div>

                        <div className={cx('rightColumn')}>
                            <div className={cx('shippingCard')}>
                                <h2 className={cx('cardTitle')}>Thông tin giao hàng</h2>

                                <div className={cx('infoList')}>
                                    <div className={cx('infoItem')}>
                                        <div className={cx('infoIcon')}>
                                            <FontAwesomeIcon icon={faUser} />
                                        </div>
                                        <div className={cx('infoText')}>
                                            <span className={cx('infoLabel')}>NGƯỜI NHẬN</span>
                                            <span className={cx('infoValue')}>{receiverName}</span>
                                        </div>
                                    </div>

                                    <div className={cx('infoItem')}>
                                        <div className={cx('infoIcon')}>
                                            <FontAwesomeIcon icon={faLocationDot} />
                                        </div>
                                        <div className={cx('infoText')}>
                                            <span className={cx('infoLabel')}>ĐỊA CHỈ</span>
                                            <span className={cx('infoValue')}>{receiverAddress}</span>
                                        </div>
                                    </div>

                                    <div className={cx('infoItem')}>
                                        <div className={cx('infoIcon')}>
                                            <FontAwesomeIcon icon={faPhone} />
                                        </div>
                                        <div className={cx('infoText')}>
                                            <span className={cx('infoLabel')}>SỐ ĐIỆN THOẠI</span>
                                            <span className={cx('infoValue')}>{receiverPhone}</span>
                                        </div>
                                    </div>

                                    <div className={cx('infoItem')}>
                                        <div className={cx('infoIcon')}>
                                            <FontAwesomeIcon icon={faBox} />
                                        </div>
                                        <div className={cx('infoText')}>
                                            <span className={cx('infoLabel')}>PHƯƠNG THỨC VẬN CHUYỂN</span>
                                            <span className={cx('infoValue')}>Giao hàng nhanh (2-3 ngày làm việc)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={cx('noteBox')}>
                                    <div className={cx('noteIcon')}>
                                        <FontAwesomeIcon icon={faShieldHalved} />
                                    </div>

                                    <p className={cx('noteText')}>
                                        HealthCareDevice đảm bảo sản phẩm được đóng gói an toàn.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default PaymentSuccess;
