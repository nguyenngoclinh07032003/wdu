import React from 'react';
import classNames from 'classnames/bind';
import styles from '../Styles/Slider.module.scss';
import { useNavigate } from 'react-router-dom';

//banner
import banner1 from '../assests/banner/banner5.png';
import banner2 from '../assests/banner/banner2.png';
import banner3 from '../assests/banner/banner3.png';
import banner from '../assests/banner/banner.png';
//icon
import shipIcon from '../assests/icons/ship.png';
import qualityIcon from '../assests/icons/quality.png';
import paymentIcon from '../assests/icons/payment.png';
import serviceIcon from '../assests/icons/service.png';

const cx = classNames.bind(styles);

function Slider() {
    const navigate = useNavigate();
    const [showShippingPopup, setShowShippingPopup] = React.useState(false);
    const [showWarrantyPopup, setShowWarrantyPopup] = React.useState(false);
    const banners = [
        { src: banner1, alt: 'Banner 1' },
        { src: banner2, alt: 'Banner 2' },
        { src: banner3, alt: 'Banner 3' },
        { src: banner, alt: 'Banner 4' },
    ];

    const [index, setIndex] = React.useState(0);

    React.useEffect(() => {
        if (banners.length <= 1) return;

        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % banners.length);
        }, 3500);

        return () => clearInterval(timer);
    }, [banners.length]);

    const goTo = (i) => setIndex(i);

    return (
        <div className={cx('wrapper')}>
            <div className={cx('slider')}>
                <div className={cx('track')} style={{ transform: `translateX(-${index * 100}%)` }}>
                    {banners.map((b, i) => (
                        <div className={cx('slide')} key={i}>
                            <img src={b.src} alt={b.alt} />
                        </div>
                    ))}
                </div>

                {banners.length > 1 && (
                    <div className={cx('dots')}>
                        {banners.map((_, i) => (
                            <button
                                key={i}
                                className={cx('dot', { active: i === index })}
                                onClick={() => goTo(i)}
                                aria-label={`Chuyển banner ${i + 1}`}
                                type="button"
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Info boxes */}
            <div className={cx('container')}>
                {/* Miễn phí vận chuyển → mở popup */}
                <div
                    className={cx('box')}
                    onClick={() => setShowShippingPopup(true)}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    aria-label="Xem chính sách vận chuyển"
                    onKeyDown={(e) => e.key === 'Enter' && setShowShippingPopup(true)}
                >
                    <img src={shipIcon} alt="Miễn phí vận chuyển" />
                    <div id={cx('info')}>
                        <span style={{ fontWeight: '800' }}>Miễn phí vận chuyển</span>
                        <br />
                        <span>Cho đơn hàng từ 300k</span>
                    </div>
                </div>

                <div
                    className={cx('box')}
                    onClick={() => setShowWarrantyPopup(true)}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    aria-label="Xem chính sách bảo hành"
                    onKeyDown={(e) => e.key === 'Enter' && setShowWarrantyPopup(true)}
                >
                    <img src={qualityIcon} alt="Bảo hành" />
                    <div className={cx('info')}>
                        <span className={cx('title')}>Bảo hành 6 tháng</span>
                        <span className={cx('desc')}>15 ngày đổi trả</span>
                    </div>
                </div>

                {/* Thanh toán → vào /cart */}
                <div
                    className={cx('box')}
                    onClick={() => navigate('/cart')}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    aria-label="Đi đến giỏ hàng"
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/cart')}
                >
                    <img src={paymentIcon} alt="Thanh toán" />
                    <div className={cx('info')}>
                        <span className={cx('title')}>Thanh toán</span>
                        <span className={cx('desc')}>Hỗ trợ nhiều hình thức</span>
                    </div>
                </div>

                {/* Hỗ trợ 24/7 → mở chatbot */}
                <div
                    className={cx('box', 'noBorder')}
                    onClick={() => window.dispatchEvent(new CustomEvent('openChatbot'))}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    aria-label="Mở chat hỗ trợ 24/7"
                    onKeyDown={(e) => e.key === 'Enter' && window.dispatchEvent(new CustomEvent('openChatbot'))}
                >
                    <img src={serviceIcon} alt="Hỗ trợ" />
                    <div className={cx('info')}>
                        <span className={cx('title')}>Hỗ trợ</span>
                        <span className={cx('desc')}>24/7</span>
                    </div>
                </div>
            </div>

            {/* Popup Chính sách vận chuyển */}
            {showShippingPopup && (
                <div
                    className={cx('popupOverlay')}
                    onClick={() => setShowShippingPopup(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Chính sách vận chuyển"
                >
                    <div className={cx('popupBox')} onClick={(e) => e.stopPropagation()}>
                        <div className={cx('popupHeader')}>
                            <img src={shipIcon} alt="ship" className={cx('popupIcon')} />
                            <h2>Chính sách vận chuyển</h2>
                            <button
                                className={cx('popupClose')}
                                onClick={() => setShowShippingPopup(false)}
                                aria-label="Đóng"
                                type="button"
                            >
                                ✕
                            </button>
                        </div>

                        <div className={cx('popupBody')}>
                            <div className={cx('policyItem')}>
                                <span className={cx('policyLabel')}>🎁 Điều kiện miễn phí ship</span>
                                <span className={cx('policyValue')}>
                                    Đơn hàng từ <strong>300.000đ</strong> trở lên
                                </span>
                            </div>

                            <div className={cx('policyItem')}>
                                <span className={cx('policyLabel')}>📍 Khu vực áp dụng</span>
                                <span className={cx('policyValue')}>Toàn quốc (63 tỉnh thành)</span>
                            </div>

                            <div className={cx('policyItem')}>
                                <span className={cx('policyLabel')}>⏱ Thời gian giao hàng</span>
                                <span className={cx('policyValue')}>
                                    Nội thành: <strong>24h</strong> – Ngoại tỉnh: <strong>2–4 ngày</strong>
                                </span>
                            </div>

                            <div className={cx('policyItem')}>
                                <span className={cx('policyLabel')}>🚚 Phí vận chuyển nếu không đủ điều kiện</span>
                                <span className={cx('policyValue')}>
                                    <strong>30.000đ</strong> cho đơn dưới 300.000đ
                                </span>
                            </div>
                        </div>

                        <button
                            className={cx('popupBtn')}
                            type="button"
                            onClick={() => {
                                setShowShippingPopup(false);
                                navigate('/category');
                            }}
                        >
                            Mua hàng ngay
                        </button>
                    </div>
                </div>
            )}
            {/* Popup Bảo hành 6 tháng */}
            {showWarrantyPopup && (
                <div
                    className={cx('popupOverlay')}
                    onClick={() => setShowWarrantyPopup(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Chính sách bảo hành"
                >
                    <div className={cx('popupBox')} onClick={(e) => e.stopPropagation()}>
                        <div className={cx('popupHeader')}>
                            <img src={qualityIcon} alt="bảo hành" className={cx('popupIcon')} />
                            <h2>Chính sách bảo hành</h2>
                            <button
                                className={cx('popupClose')}
                                onClick={() => setShowWarrantyPopup(false)}
                                aria-label="Đóng"
                                type="button"
                            >
                                ✕
                            </button>
                        </div>

                        <div className={cx('popupBody')}>
                            <div className={cx('policyItem')}>
                                <span className={cx('policyLabel')}>🛡 Thời hạn bảo hành</span>
                                <span className={cx('policyValue')}>
                                    <strong>6 tháng</strong> kể từ ngày mua hàng
                                </span>
                            </div>

                            <div className={cx('policyItem')}>
                                <span className={cx('policyLabel')}>✅ Điều kiện được bảo hành</span>
                                <span className={cx('policyValue')}>
                                    Sản phẩm lỗi do nhà sản xuất, còn tem niêm phong, có hóa đơn mua hàng
                                </span>
                            </div>

                            <div className={cx('policyItem')}>
                                <span className={cx('policyLabel')}>❌ Điều kiện không bảo hành</span>
                                <span className={cx('policyValue')}>
                                    Hỏng do va đập, tự ý tháo lắp, ngấm nước, hết hạn bảo hành
                                </span>
                            </div>

                            <div className={cx('policyItem')}>
                                <span className={cx('policyLabel')}>🔄 Quy trình đổi trả</span>
                                <span className={cx('policyValue')}>
                                    Đổi trả trong <strong>15 ngày</strong> – Liên hệ hotline hoặc mang sản phẩm đến cửa hàng
                                </span>
                            </div>
                        </div>

                        <button
                            className={cx('popupBtn')}
                            type="button"
                            onClick={() => {
                                setShowWarrantyPopup(false);
                                navigate('/category');
                            }}
                        >
                            Tiếp tục mua hàng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Slider;
