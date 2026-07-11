import classNames from 'classnames/bind';
import styles from '../Styles/Cart.module.scss';

import Header from '../Components/Header';
import Footer from '../Components/Footer';
import request, { requestUpdateQuantityCart } from '../Config/api';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTrashCan,
    faShieldHalved,
    faTruckFast,
    faArrowRotateLeft,
    faArrowRight,
} from '@fortawesome/free-solid-svg-icons';

import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useStore } from '../hooks/useStore';

const cx = classNames.bind(styles);

function Cart() {
    const navigate = useNavigate();
    const { dataCart = [], getCart } = useStore();
    const [loadingId, setLoadingId] = useState(null);
    const SHIPPING_FEE = Number(process.env.ORDER_SHIPPING_FEE) || 30000;
    const [voucherCode, setVoucherCode] = useState('');

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const dataProducts = useMemo(() => {
        if (!Array.isArray(dataCart)) return [];
        return dataCart.flatMap((cartItem) => cartItem?.products || []);
    }, [dataCart]);

    const totalQuantity = useMemo(() => {
        return dataProducts.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
    }, [dataProducts]);

    const totalPrice = useMemo(() => {
        return dataProducts.reduce((sum, item) => {
            return sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 0);
        }, 0);
    }, [dataProducts]);

    const cartInfo = dataCart?.[0] || {};
    const voucher = cartInfo?.voucher;
    const hasVoucher = voucher?.code;
    const hasProducts = dataProducts.length > 0;
    const productDiscount = hasProducts && hasVoucher && voucher.category !== 'shipping' ? Number(voucher.discountAmount || 0) : 0;
    const shippingDiscount = hasProducts && hasVoucher && voucher.category === 'shipping' ? Number(voucher.discountAmount || 0) : 0;
    const finalShippingFee = hasProducts ? Math.max(SHIPPING_FEE - shippingDiscount, 0) : 0;
    const finalTotal = hasProducts ? Math.max(totalPrice - productDiscount + finalShippingFee, 0) : 0;
    const handleDeleteCart = async (id) => {
        try {
            if (!id || loadingId === id) return;

            setLoadingId(id);

            const res = await request.post('/api/deletecart', { id });
            toast.success(res?.data?.message || 'Xóa sản phẩm thành công');

            await getCart();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Xóa sản phẩm thất bại');
        } finally {
            setLoadingId(null);
        }
    };

    const handleUpdateQuantity = async (item, type) => {
        try {
            if (!item?._id || loadingId === item._id) return;

            const currentQuantity = Number(item.quantity) || 1;
            let newQuantity = currentQuantity;

            if (type === 'increase') {
                newQuantity = currentQuantity + 1;
            }

            if (type === 'decrease') {
                if (currentQuantity <= 1) {
                    toast.error('Số lượng tối thiểu là 1');
                    return;
                }
                newQuantity = currentQuantity - 1;
            }

            setLoadingId(item._id);

            const res = await requestUpdateQuantityCart({
                id: item._id,
                quantity: newQuantity,
            });

            toast.success(res?.message || 'Cập nhật số lượng thành công');
            await getCart();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Cập nhật số lượng thất bại');
        } finally {
            setLoadingId(null);
        }
    };
    const handleApplyVoucher = async () => {
        try {
            if (!voucherCode.trim()) {
                toast.warning('Vui lòng nhập mã voucher');
                return;
            }

            const res = await request.post('/api/apply-voucher', {
                code: voucherCode.trim(),
            });

            toast.success(res?.data?.message || 'Áp dụng voucher thành công');

            await getCart();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Áp dụng voucher thất bại');
        }
    };
    const handleRemoveVoucher = async () => {
        try {
            const res = await request.delete('/api/remove-voucher');

            toast.success(res?.data?.message || 'Đã xóa voucher');

            setVoucherCode('');
            await getCart();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Xóa voucher thất bại');
        }
    };
    const nextPage = () => {
        if (dataProducts.length > 0) {
            navigate('/payments', {
                state: {
                    voucher,
                    productDiscount,
                    shippingDiscount,
                    shippingFee: finalShippingFee,
                    totalBeforeDiscount: totalPrice,
                    totalAfterDiscount: finalTotal,
                },
            });
        } else {
            toast.error('Vui lòng thêm sản phẩm vào giỏ hàng để thanh toán');
        }
    };

    return (
        <div className={cx('wrapper')}>
            <ToastContainer />
            <Header />

            <main className={cx('main')}>
                <div className={cx('breadcrumb')}>
                    <Link to="/">Trang chủ</Link>
                    <span>/</span>
                    <span>Giỏ hàng</span>
                </div>

                <h1 className={cx('title')}>
                    Giỏ hàng của bạn <span>({totalQuantity} sản phẩm)</span>
                </h1>

                <div className={cx('inner')}>
                    <section className={cx('cartSection')}>
                        {dataProducts.length > 0 ? (
                            <div className={cx('cartTable')}>
                                <div className={cx('cartHead')}>
                                    <span>Sản phẩm</span>
                                    <span>Đơn giá</span>
                                    <span>Số lượng</span>
                                    <span>Thành tiền</span>
                                </div>

                                <div className={cx('cartBody')}>
                                    {dataProducts.map((item, index) => (
                                        <div
                                            key={item?._id || `${item?.nameProduct}-${index}`}
                                            className={cx('cartItem')}
                                        >
                                            <div className={cx('productInfo')}>
                                                <div className={cx('imgProduct')}>
                                                    <img
                                                        src={`${process.env.REACT_APP_IMG}/${item?.img}`}
                                                        alt={item?.nameProduct || 'product'}
                                                    />
                                                </div>

                                                <div className={cx('infoProduct')}>
                                                    <h2>{item?.nameProduct}</h2>
                                                    {item?.code && <p>Mã: {item?.code}</p>}
                                                    {item?.color && <p>Màu: {item?.color}</p>}
                                                    {item?.capacity && <p>Dung tích: {item?.capacity}</p>}
                                                    <button
                                                        className={cx('btnDelete')}
                                                        onClick={() => handleDeleteCart(item?._id)}
                                                        disabled={loadingId === item?._id}
                                                        type="button"
                                                    >
                                                        <FontAwesomeIcon icon={faTrashCan} />
                                                        <span>Xóa</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className={cx('unitPrice')}>
                                                {(Number(item?.price) || 0).toLocaleString('vi-VN')}đ
                                            </div>

                                            <div className={cx('quantityBox')}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateQuantity(item, 'decrease')}
                                                    disabled={loadingId === item?._id}
                                                >
                                                    -
                                                </button>

                                                <span>{Number(item?.quantity) || 1}</span>

                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateQuantity(item, 'increase')}
                                                    disabled={loadingId === item?._id}
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <div className={cx('totalItem')}>
                                                {(
                                                    (Number(item?.price) || 0) * (Number(item?.quantity) || 0)
                                                ).toLocaleString('vi-VN')}
                                                đ
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className={cx('noProduct')}>
                                <img src="https://static.topcv.vn/v4/image/job-list/none-result.png" alt="empty-cart" />
                                <span>Bạn chưa có sản phẩm nào trong giỏ hàng</span>
                                <Link to="/category">Tiếp tục mua sắm</Link>
                            </div>
                        )}

                        {dataProducts.length > 0 && (
                            <div className={cx('couponBox')}>
                                <div className={cx('couponTitle')}>Mã giảm giá</div>

                                <div className={cx('couponForm')}>
                                    <input
                                        type="text"
                                        placeholder="Nhập mã của bạn"
                                        value={voucherCode}
                                        onChange={(e) => setVoucherCode(e.target.value)}
                                        disabled={!!hasVoucher}
                                    />

                                    {hasVoucher ? (
                                        <button type="button" onClick={handleRemoveVoucher}>
                                            Hủy mã
                                        </button>
                                    ) : (
                                        <button type="button" onClick={handleApplyVoucher}>
                                            Áp dụng
                                        </button>
                                    )}
                                </div>

                                {hasVoucher && (
                                    <p className={cx('voucherApplied')}>
                                        Đã áp dụng: <strong>{voucher.code}</strong> - {voucher.title}
                                    </p>
                                )}
                            </div>
                        )}
                    </section>

                    <aside className={cx('summarySection')}>
                        <div className={cx('summaryCard')}>
                            <h3>Tóm tắt đơn hàng</h3>

                            <div className={cx('summaryRow')}>
                                <span>Tạm tính:</span>
                                <strong>{totalPrice.toLocaleString('vi-VN')}đ</strong>
                            </div>

                            <div className={cx('summaryRow')}>
                                <span>Phí vận chuyển:</span>
                                <strong>{finalShippingFee.toLocaleString('vi-VN')}đ</strong>
                            </div>

                            <div className={cx('summaryRow')}>
                                <span>Giảm sản phẩm:</span>
                                <span>-{productDiscount.toLocaleString('vi-VN')}đ</span>
                            </div>

                            <div className={cx('summaryRow')}>
                                <span>Giảm vận chuyển:</span>
                                <span>-{shippingDiscount.toLocaleString('vi-VN')}đ</span>
                            </div>

                            <div className={cx('summaryDivider')}></div>

                            <div className={cx('summaryTotal')}>
                                <div>
                                    <span>Tổng cộng:</span>
                                </div>

                                <div>
                                    <strong>{finalTotal.toLocaleString('vi-VN')}đ</strong>
                                    <small>Đã áp dụng phí vận chuyển và voucher nếu có</small>{' '}
                                </div>
                            </div>

                            <button className={cx('checkoutBtn')} onClick={nextPage} type="button">
                                Tiến hành thanh toán
                                <FontAwesomeIcon icon={faArrowRight} />
                            </button>

                            <Link to="/category" className={cx('continueShopping')}>
                                Tiếp tục mua sắm
                            </Link>
                        </div>

                        <div className={cx('serviceBox')}>
                            <div className={cx('serviceItem')}>
                                <div className={cx('serviceIcon')}>
                                    <FontAwesomeIcon icon={faShieldHalved} />
                                </div>
                                <div>
                                    <h4>Bảo mật thanh toán</h4>
                                    <p>Mã hóa thông tin 100%</p>
                                </div>
                            </div>

                            <div className={cx('serviceItem')}>
                                <div className={cx('serviceIcon')}>
                                    <FontAwesomeIcon icon={faTruckFast} />
                                </div>
                                <div>
                                    <h4>Giao hàng nhanh</h4>
                                    <p>Trong vòng 24h - 48h</p>
                                </div>
                            </div>

                            <div className={cx('serviceItem')}>
                                <div className={cx('serviceIcon')}>
                                    <FontAwesomeIcon icon={faArrowRotateLeft} />
                                </div>
                                <div>
                                    <h4>Đổi trả dễ dàng</h4>
                                    <p>Hoàn tiền trong 15 ngày</p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <Footer />
        </div>
    );
}

export default Cart;
