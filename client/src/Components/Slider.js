import React from 'react';
import classNames from 'classnames/bind';
import styles from '../Styles/Slider.module.scss';

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
        }, 3500); // thời gian chuyển banner

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

                {/* dots */}
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

            {/* Info boxes (giữ nguyên nội dung bạn) */}
            <div className={cx('container')}>
                <div className={cx('box')}>
                    <img src={shipIcon} alt="Miễn phí vận chuyển" />
                    <div id={cx('info')}>
                        <span style={{ fontWeight: '800' }}>Miễn phí vận chuyển</span>
                        <br />
                        <span>Cho đơn hàng từ 300k</span>
                    </div>
                </div>

                <div className={cx('box')}>
                    <img src={qualityIcon} alt="Bảo hành" />
                    <div className={cx('info')}>
                        <span className={cx('title')}>Bảo hành 6 tháng</span>
                        <span className={cx('desc')}>15 ngày đổi trả</span>
                    </div>
                </div>

                <div className={cx('box')}>
                    <img src={paymentIcon} alt="Thanh toán" /> <br />
                    <div className={cx('info')}>
                        <span className={cx('title')}>Thanh toán</span>
                        <span className={cx('desc')}>Hỗ trợ nhiều hình thức</span>
                    </div>
                </div>

                <div className={cx('box', 'noBorder')}>
                    <img src={serviceIcon} alt="Hỗ trợ" />
                    <div className={cx('info')}>
                        <span className={cx('title')}>Hỗ trợ</span>
                        <span className={cx('desc')}>24/7</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Slider;
