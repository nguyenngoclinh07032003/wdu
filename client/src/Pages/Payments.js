import classNames from 'classnames/bind';
import styles from '../Styles/Payments.module.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import request, { requestPaymentVNPAY, requestUpdateInfoCart } from '../Config/api';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { getAddresses } from '../services/addressService';
import { FaTruck, FaMoneyCheckAlt, FaUniversity, FaHandHoldingUsd } from 'react-icons/fa';

const cx = classNames.bind(styles);

const SHIPPING_FEE = Number(process.env.ORDER_SHIPPING_FEE) || 30000;

function Payments() {
    const [dataCart, setDataCart] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('COD');
    const [dataProducts, setDataProducts] = useState([]);
    const [dataLengthProducts, setDataLengthProducts] = useState(0);

    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState('');

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [email, setEmail] = useState('');
    const [note, setNote] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const navigate = useNavigate();
    const { getCart } = useStore();

    const cartInfo = dataCart?.[0] || {};
    const voucher = cartInfo?.voucher || null;
    const hasVoucher = !!voucher?.code;

    const [hasDefaultAddress, setHasDefaultAddress] = useState(false);

    const totalProduct = useMemo(() => {
        const total = dataCart.map((item) => item.sumprice);
        return total[0] || 0;
    }, [dataCart]);

    const productDiscount = hasVoucher && voucher.category !== 'shipping' ? Number(voucher.discountAmount || 0) : 0;

    const shippingDiscount = hasVoucher && voucher.category === 'shipping' ? Number(voucher.discountAmount || 0) : 0;

    const finalShippingFee = Math.max(SHIPPING_FEE - shippingDiscount, 0);

    const finalTotal = useMemo(() => {
        return Math.max(totalProduct - productDiscount + finalShippingFee, 0);
    }, [totalProduct, productDiscount, finalShippingFee]);

    useEffect(() => {
        const fetchCart = async () => {
            try {
                const res = await request.get('/api/cart');
                setDataCart(Array.isArray(res.data) ? res.data : []);
            } catch (error) {
                console.log('fetchCart error:', error);
                setDataCart([]);
            }
        };

        fetchCart();
    }, []);

    useEffect(() => {
        const newDataProducts = dataCart?.map((item) => item.products);
        setDataProducts(newDataProducts?.[0] || []);
    }, [dataCart]);

    useEffect(() => {
        const totalQuantity = dataCart?.reduce((total, cartItem) => {
            return total + cartItem.products.reduce((sum, product) => sum + product.quantity, 0);
        }, 0);

        setDataLengthProducts(totalQuantity || 0);
    }, [dataCart]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const applyAddressToForm = (item) => {
        if (!item) return;

        const fullAddress = [item.detail, item.ward, item.district, item.province].filter(Boolean).join(', ');

        setName(item.fullName || '');
        setPhone(item.phone || '');
        setAddress(fullAddress);
    };

    useEffect(() => {
        const fetchSavedAddresses = async () => {
            try {
                const list = await getAddresses();
                const safeList = Array.isArray(list) ? list : [];

                setAddresses(safeList);

                const defaultAddress = safeList.find((item) => item.isDefault);

                if (defaultAddress) {
                    setHasDefaultAddress(true);
                    setSelectedAddressId(defaultAddress._id || defaultAddress.id);
                    applyAddressToForm(defaultAddress);
                } else {
                    setHasDefaultAddress(false);
                    setSelectedAddressId('');
                    setName('');
                    setPhone('');
                    setAddress('');
                }
            } catch (error) {
                console.log('fetchSavedAddresses error:', error);
                setAddresses([]);
                setHasDefaultAddress(false);
            }
        };

        fetchSavedAddresses();
    }, []);

    const handleChangeSavedAddress = (e) => {
        const selectedId = e.target.value;
        setSelectedAddressId(selectedId);

        const selected = addresses.find((item) => String(item._id || item.id) === String(selectedId));

        if (selected) {
            applyAddressToForm(selected);
            setHasDefaultAddress(!!selected.isDefault);
        }
    };

    const handlePaymentMethodChange = (e) => {
        setPaymentMethod(e.target.value);
    };

    const saveLastOrderInfo = (extra = {}) => {
        const payload = {
            fullName: name,
            username: name,
            phone,
            address,
            email,
            note,
            products: dataProducts,
            sumprice: finalTotal,
            paymentMethod,
            voucher,
            productDiscount,
            shippingDiscount,
            shippingFee: finalShippingFee,
            ...extra,
        };

        localStorage.setItem('lastOrderInfo', JSON.stringify(payload));
    };

    const validateForm = () => {
        if (!hasDefaultAddress) {
            toast.error('Vui lòng thêm hoặc chọn địa chỉ mặc định trước khi thanh toán');
            return false;
        }

        if (!selectedAddressId) {
            toast.error('Vui lòng chọn địa chỉ giao hàng');
            return false;
        }

        if (!name.trim()) {
            toast.error('Vui lòng chọn hoặc nhập họ tên người nhận');
            return false;
        }

        if (!phone.trim()) {
            toast.error('Vui lòng chọn hoặc nhập số điện thoại');
            return false;
        }

        if (!address.trim()) {
            toast.error('Vui lòng chọn hoặc nhập địa chỉ giao hàng');
            return false;
        }

        if (!Array.isArray(dataProducts) || dataProducts.length === 0) {
            toast.error('Giỏ hàng đang trống');
            return false;
        }

        return true;
    };

    const updateCartInfoBeforePayment = async () => {
        try {
            await requestUpdateInfoCart({
                name,
                phone,
                address,
            });
        } catch (error) {
            console.log('requestUpdateInfoCart error:', error);
        }
    };

    const handlePayment = async () => {
        if (isSubmitting) return;
        if (!validateForm()) return;

        try {
            setIsSubmitting(true);

            await updateCartInfoBeforePayment();

            const payload = {
                dataProducts,
                address,
                name,
                phone,
                email,
                note,
                voucher,
                productDiscount,
                shippingDiscount,
                shippingFee: finalShippingFee,
                finalTotal,
            };

            if (paymentMethod === 'Momo') {
                saveLastOrderInfo();

                const res = await request.post('/api/payment', payload);
                await getCart().catch((err) => console.log('getCart error:', err));

                if (res?.data?.payUrl) {
                    window.open(res.data.payUrl, '_self');
                } else {
                    toast.error('Không lấy được liên kết thanh toán Momo');
                }

                return;
            }

            if (paymentMethod === 'VNPAY') {
                saveLastOrderInfo();

                const res = await requestPaymentVNPAY(payload);

                if (res?.vnpayResponse) {
                    window.open(res.vnpayResponse, '_self');
                } else {
                    toast.error('Không lấy được liên kết thanh toán VNPAY');
                }

                return;
            }

            if (paymentMethod === 'COD') {
                const res = await request.post('/api/paymentcod', payload);

                saveLastOrderInfo({
                    _id: res?.data?._id || res?.data?.order?._id || '',
                    products: res?.data?.order?.products || dataProducts,
                    phone: res?.data?.order?.phone || phone,
                    address: res?.data?.order?.address || address,
                    username: res?.data?.order?.username || name,
                    fullName:
                        res?.data?.order?.fullName || res?.data?.order?.fullname || res?.data?.order?.username || name,
                    sumprice: res?.data?.order?.sumprice || finalTotal,
                    paymentMethod: res?.data?.order?.paymentMethod || 'COD',
                    voucher,
                    productDiscount,
                    shippingDiscount,
                    shippingFee: finalShippingFee,
                });

                toast.success(res?.data?.message || 'Đặt hàng thành công');

                navigate('/paymentsuccess');

                getCart().catch((err) => console.log('getCart error:', err));

                return;
            }

            toast.error('Phương thức thanh toán không hợp lệ');
        } catch (error) {
            console.log('handlePayment error:', error);
            toast.error(error?.response?.data?.message || 'Thanh toán thất bại');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={cx('wrapper')}>
            <ToastContainer />

            <header>
                <Header />
            </header>

            <main className={cx('main')}>
                <div className={cx('hero')}>
                    <h1>Thanh Toán</h1>
                    <p>Xem lại đơn hàng và xác nhận thông tin giao hàng của bạn.</p>
                </div>

                <div className={cx('layout')}>
                    <section className={cx('left')}>
                        <div className={cx('sectionTitle')}>
                            <span className={cx('iconBox')}>
                                <FaTruck />
                            </span>
                            <h3>Thông tin vận chuyển</h3>
                        </div>

                        {addresses.length > 0 && (
                            <div className={cx('savedAddressBox')}>
                                <label>Chọn địa chỉ từ sổ địa chỉ</label>

                                <select value={selectedAddressId} onChange={handleChangeSavedAddress}>
                                    <option value="">Chọn địa chỉ giao hàng</option>

                                    {addresses.map((item) => {
                                        const id = item._id || item.id;

                                        const text = [
                                            item.fullName,
                                            item.phone,
                                            item.detail,
                                            item.ward,
                                            item.district,
                                            item.province,
                                        ]
                                            .filter(Boolean)
                                            .join(' - ');

                                        return (
                                            <option key={id} value={id}>
                                                {item.isDefault ? '[Mặc định] ' : ''}
                                                {text}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        )}

                        <div className={cx('formGroup')}>
                            <label>Họ và tên đầy đủ</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>

                        <div className={cx('row2')}>
                            <div className={cx('formGroup')}>
                                <label>Số điện thoại</label>
                                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </div>

                            <div className={cx('formGroup')}>
                                <label>Địa chỉ email</label>
                                <input type="text" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                        </div>

                        <div className={cx('formGroup')}>
                            <label>Địa chỉ giao hàng</label>
                            <textarea value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>

                        <div className={cx('formGroup')}>
                            <label>Ghi chú đơn hàng</label>
                            <textarea value={note} onChange={(e) => setNote(e.target.value)} />
                        </div>

                        <div className={cx('sectionTitle', 'paymentTitle')}>
                            <span className={cx('iconBox')}>
                                <FaMoneyCheckAlt />
                            </span>
                            <h3>Phương thức thanh toán</h3>
                        </div>

                        <div className={cx('paymentList')}>
                            <label className={cx('paymentCard', { active: paymentMethod === 'Momo' })}>
                                <div className={cx('paymentLeft')}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="Momo"
                                        checked={paymentMethod === 'Momo'}
                                        onChange={handlePaymentMethodChange}
                                    />
                                    <div>
                                        <h4>Credit/Debit Wallet</h4>
                                        <p>Thanh toán qua Momo</p>
                                    </div>
                                </div>

                                <FaMoneyCheckAlt className={cx('paymentIcon')} />
                            </label>

                            {/* <label className={cx('paymentCard', { active: paymentMethod === 'VNPAY' })}>
                                <div className={cx('paymentLeft')}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="VNPAY"
                                        checked={paymentMethod === 'VNPAY'}
                                        onChange={handlePaymentMethodChange}
                                    />
                                    <div>
                                        <h4>Bank Transfer</h4>
                                        <p>Thanh toán qua VNPAY</p>
                                    </div>
                                </div>

                                <FaUniversity className={cx('paymentIcon')} />
                            </label> */}

                            <label className={cx('paymentCard', { active: paymentMethod === 'COD' })}>
                                <div className={cx('paymentLeft')}>
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="COD"
                                        checked={paymentMethod === 'COD'}
                                        onChange={handlePaymentMethodChange}
                                    />
                                    <div>
                                        <h4>Cash on Delivery (COD)</h4>
                                        <p>Thanh toán khi nhận hàng</p>
                                    </div>
                                </div>

                                <FaHandHoldingUsd className={cx('paymentIcon')} />
                            </label>
                        </div>
                    </section>

                    <aside className={cx('summary')}>
                        <h3>Tóm tắt đơn hàng</h3>

                        <div className={cx('productList')}>
                            {dataProducts?.map((item, index) => (
                                <div key={item.id || item._id || index} className={cx('productItem')}>
                                    <div className={cx('productThumb')}>
                                        <img src={`${process.env.REACT_APP_IMG}/${item.img}`} alt={item.nameProduct} />
                                    </div>

                                    <div className={cx('productInfo')}>
                                        <h4>{item.nameProduct}</h4>
                                        <p>SL: {item.quantity}</p>
                                    </div>

                                    <div className={cx('productPrice')}>
                                        {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={cx('summaryRows')}>
                            <div className={cx('summaryRow')}>
                                <span>Tạm tính:</span>
                                <span>{totalProduct.toLocaleString('vi-VN')}đ</span>
                            </div>

                            {hasVoucher && (
                                <div className={cx('summaryRow')}>
                                    <span>Voucher:</span>
                                    <span>
                                        {voucher.code} - {voucher.title}
                                    </span>
                                </div>
                            )}

                            <div className={cx('summaryRow')}>
                                <span>Giảm sản phẩm:</span>
                                <span>-{productDiscount.toLocaleString('vi-VN')}đ</span>
                            </div>

                            <div className={cx('summaryRow')}>
                                <span>Phí vận chuyển:</span>
                                <span>{SHIPPING_FEE.toLocaleString('vi-VN')}đ</span>
                            </div>

                            <div className={cx('summaryRow')}>
                                <span>Giảm vận chuyển:</span>
                                <span>-{shippingDiscount.toLocaleString('vi-VN')}đ</span>
                            </div>

                            <div className={cx('summaryRow')}>
                                <span>Phí vận chuyển sau giảm:</span>
                                <span>{finalShippingFee.toLocaleString('vi-VN')}đ</span>
                            </div>

                            <div className={cx('summaryRow')}>
                                <span>Tổng sản phẩm:</span>
                                <span>{dataLengthProducts}</span>
                            </div>
                        </div>

                        <div className={cx('totalRow')}>
                            <span>Tổng</span>
                            <strong>{finalTotal.toLocaleString('vi-VN')}đ</strong>
                        </div>

                        <button
                            type="button"
                            className={cx('submitBtn', { disabled: isSubmitting })}
                            onClick={handlePayment}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang xử lý...' : 'Hoàn tất đơn hàng'}
                        </button>

                        <p className={cx('summaryNote')}>
                            Bằng việc hoàn tất đơn đặt hàng này, bạn đồng ý với Điều khoản dịch vụ và Nguyên tắc bảo mật
                            dữ liệu của chúng tôi.
                        </p>
                    </aside>
                </div>
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default Payments;
