import classNames from 'classnames/bind';
import styles from '../Styles/Footer.module.scss';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faPhone, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faInstagram, faYoutube } from '@fortawesome/free-brands-svg-icons';
import { CONTACT_INFO } from '../constants/contactInfo';
import logo from '../assests/logo/Logo.png';

const cx = classNames.bind(styles);

function Footer() {
    const navigate = useNavigate();
    const year = new Date().getFullYear();

    const onPage = (url) => navigate(url);

    return (
        <footer id="footer" className={cx('wrapper')}>
            <div className={cx('inner')}>
                {/* Cột 1: Logo + slogan + social */}
                <div className={cx('boxItem')}>
                    <div className={cx('brand')}>
                        <img className={cx('logo')} src={logo} alt="logo" />
                        <p className={cx('desc')}>“XOA dịu nỗi đau – XOA tan áp lực”</p>

                        <div className={cx('social')}>
                            <button
                                className={cx('socialBtn')}
                                aria-label="facebook"
                                type="button"
                                onClick={() => window.open(CONTACT_INFO.facebookUrl, '_blank')}
                            >
                                <FontAwesomeIcon icon={faFacebookF} />
                            </button>
                            <button className={cx('socialBtn')} aria-label="instagram" type="button">
                                <FontAwesomeIcon icon={faInstagram} />
                            </button>
                            <button className={cx('socialBtn')} aria-label="youtube" type="button">
                                <FontAwesomeIcon icon={faYoutube} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Cột 2: Liên hệ */}
                <div className={cx('boxItem')}>
                    <h4 className={cx('itemTitle')}>Liên Hệ</h4>
                    <ul className={cx('list')}>
                        <li className={cx('row')}>
                            <span className={cx('icon')}>
                                <FontAwesomeIcon icon={faLocationDot} />
                            </span>
                            <span>{CONTACT_INFO.address}</span>
                        </li>
                        <li className={cx('row')}>
                            <span className={cx('icon')}>
                                <FontAwesomeIcon icon={faPhone} />
                            </span>
                            <a href={`tel:${CONTACT_INFO.phone}`}>{CONTACT_INFO.phoneDisplay}</a>
                        </li>
                        <li className={cx('row')}>
                            <span className={cx('icon')}>
                                <FontAwesomeIcon icon={faEnvelope} />
                            </span>
                            <a href={`mailto:${CONTACT_INFO.customerEmail}`}>{CONTACT_INFO.customerEmail}</a>
                        </li>
                    </ul>
                </div>

                {/* Cột 3: Sản phẩm */}
                <div className={cx('boxItem')}>
                    <h4 className={cx('itemTitle')}>Sản Phẩm</h4>
                    <ul className={cx('list')}>
                        <li className={cx('link')} onClick={() => onPage('/category/dau-gung')}>
                            Dầu Gừng
                        </li>
                        <li className={cx('link')} onClick={() => onPage('/category/nhang-ngai-cuu')}>
                            Nhang Ngải Cứu
                        </li>
                        <li className={cx('link')} onClick={() => onPage('/category/ngam-chan-thao-duoc')}>
                            Ngâm Chân Thảo Dược
                        </li>
                        <li className={cx('link')} onClick={() => onPage('/category/combo')}>
                            Combo ưu đãi
                        </li>
                    </ul>
                </div>

                {/* Cột 4: Chính sách */}
                <div className={cx('boxItem')}>
                    <h4 className={cx('itemTitle')}>Chính Sách</h4>
                    <ul className={cx('list')}>
                        <li className={cx('link')} onClick={() => onPage('/policy/warranty')}>
                            Chính sách bảo hành
                        </li>
                        <li className={cx('link')} onClick={() => onPage('/policy/return')}>
                            Chính sách đổi trả
                        </li>
                        <li className={cx('link')} onClick={() => onPage('/policy/shipping')}>
                            Chính sách vận chuyển
                        </li>
                        <li className={cx('link')} onClick={() => onPage('/guide')}>
                            Hướng dẫn mua hàng
                        </li>
                        <li className={cx('link')} onClick={() => onPage('/terms')}>
                            Điều khoản dịch vụ
                        </li>
                    </ul>
                </div>

                {/* Cột 5: Kênh bán hàng */}
                <div className={cx('boxItem')}>
                    <h4 className={cx('itemTitle')}>Mua Hàng Tại</h4>
                    <ul className={cx('list')}>
                        <li className={cx('link')} onClick={() => window.open('https://shopee.vn', '_blank')}>
                            Shopee
                        </li>
                        <li className={cx('link')} onClick={() => window.open('https://www.tiktokshop.com', '_blank')}>
                            TikTok Shop
                        </li>
                        <li className={cx('link')} onClick={() => window.open('https://www.lazada.vn', '_blank')}>
                            Lazada
                        </li>
                        <li
                            className={cx('link')}
                            onClick={() => window.open(CONTACT_INFO.facebookUrl, '_blank')}
                        >
                            Facebook
                        </li>
                        <li className={cx('link')} onClick={() => window.open(CONTACT_INFO.zaloUrl, '_blank')}>
                            Zalo
                        </li>
                    </ul>
                </div>
            </div>

            <div className={cx('footerBottom')}>
                <p className={cx('copyright')}>Copyright {year} © HealthCare Device</p>

                <div className={cx('payment')}>
                    <span className={cx('pay')}>VISA</span>
                    <span className={cx('pay')}>PayPal</span>
                    <span className={cx('pay')}>MasterCard</span>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
