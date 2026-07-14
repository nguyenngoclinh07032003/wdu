import classNames from 'classnames/bind';
import styles from '../Styles/Footer.module.scss';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationDot, faPhone, faEnvelope, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faInstagram, faYoutube } from '@fortawesome/free-brands-svg-icons';
import { CONTACT_INFO } from '../constants/contactInfo';
import logo from '../assests/logo/Logo.png';

const cx = classNames.bind(styles);

const POLICY_POPUPS = {
    warranty: {
        title: 'Chính sách bảo hành',
        description: 'HealthCare Device hỗ trợ bảo hành để khách hàng yên tâm trong quá trình sử dụng sản phẩm:',
        items: [
            'Thời hạn bảo hành áp dụng trong 6 tháng kể từ ngày mua hàng hoặc theo thông tin ghi trên từng sản phẩm.',
            'Sản phẩm được bảo hành khi lỗi phát sinh từ nhà sản xuất, còn tem nhãn và có thông tin đơn hàng hợp lệ.',
            'Không áp dụng bảo hành với sản phẩm hư hỏng do va đập, sử dụng sai hướng dẫn, tự ý sửa chữa hoặc bảo quản không đúng cách.',
            'Khách hàng vui lòng liên hệ hotline, Zalo hoặc fanpage để được hướng dẫn kiểm tra và gửi sản phẩm bảo hành.',
            'Thời gian xử lý bảo hành phụ thuộc vào tình trạng sản phẩm và sẽ được nhân viên thông báo cụ thể.',
        ],
    },
    returnPolicy: {
        title: 'Chính sách đổi trả',
        description: 'Chúng tôi hỗ trợ đổi trả khi sản phẩm gặp vấn đề hợp lệ theo quy định của cửa hàng:',
        items: [
            'Thời gian hỗ trợ đổi trả trong vòng 15 ngày kể từ khi khách hàng nhận được sản phẩm.',
            'Sản phẩm đổi trả cần còn đầy đủ phụ kiện, bao bì, tem nhãn và chưa có dấu hiệu đã qua sử dụng sai cách.',
            'Áp dụng đổi trả khi sản phẩm bị lỗi kỹ thuật, giao nhầm mẫu, thiếu phụ kiện hoặc hư hỏng trong quá trình vận chuyển.',
            'Không hỗ trợ đổi trả với sản phẩm đã bị rơi vỡ, trầy xước do người dùng hoặc không còn đầy đủ chứng từ mua hàng.',
            'Sau khi tiếp nhận yêu cầu, cửa hàng sẽ kiểm tra tình trạng sản phẩm và phản hồi phương án xử lý phù hợp.',
        ],
    },
    shipping: {
        title: 'Chính sách vận chuyển',
        description: 'HealthCare Device giao hàng trên toàn quốc với quy trình rõ ràng và thuận tiện:',
        items: [
            'Miễn phí vận chuyển cho đơn hàng từ 300.000đ trở lên.',
            'Đơn hàng dưới 300.000đ áp dụng phí vận chuyển theo khu vực hoặc theo đơn vị giao hàng tại thời điểm đặt hàng.',
            'Thời gian giao hàng dự kiến từ 1 đến 4 ngày làm việc tùy địa chỉ nhận hàng và tình trạng vận chuyển.',
            'Nhân viên có thể liên hệ xác nhận thông tin trước khi bàn giao đơn cho đơn vị vận chuyển.',
            'Khách hàng vui lòng kiểm tra tình trạng kiện hàng khi nhận và phản hồi sớm nếu có móp méo, thiếu hàng hoặc giao sai sản phẩm.',
        ],
    },
    shoppingGuide: {
        title: 'Hướng dẫn mua hàng',
        description: 'Quý khách có thể đặt mua sản phẩm tại website HealthCare Device theo các bước sau:',
        items: [
            'Chọn sản phẩm cần mua, kiểm tra thông tin, số lượng và bấm thêm vào giỏ hàng.',
            'Vào giỏ hàng để kiểm tra lại sản phẩm, áp dụng mã giảm giá nếu có.',
            'Điền đầy đủ họ tên, số điện thoại, địa chỉ nhận hàng và ghi chú giao hàng nếu cần.',
            'Chọn phương thức thanh toán phù hợp, sau đó xác nhận đặt hàng.',
            'Nhân viên sẽ liên hệ xác nhận đơn hàng và hỗ trợ giao hàng trong thời gian sớm nhất.',
        ],
    },
    serviceTerms: {
        title: 'Điều khoản dịch vụ',
        description: 'Khi sử dụng website và đặt hàng tại HealthCare Device, quý khách vui lòng lưu ý:',
        items: [
            'Thông tin đặt hàng cần chính xác để quá trình xác nhận và giao hàng được thuận lợi.',
            'Giá bán, chương trình khuyến mãi và tồn kho có thể được cập nhật theo từng thời điểm.',
            'Khách hàng có trách nhiệm kiểm tra sản phẩm khi nhận hàng và phản hồi sớm nếu có vấn đề.',
            'HealthCare Device cam kết bảo mật thông tin cá nhân và chỉ sử dụng cho mục đích xử lý đơn hàng, chăm sóc khách hàng.',
            'Các trường hợp đổi trả, bảo hành và vận chuyển được áp dụng theo chính sách tương ứng của cửa hàng.',
        ],
    },
};

function Footer() {
    const navigate = useNavigate();
    const year = new Date().getFullYear();
    const [activePolicy, setActivePolicy] = useState(null);

    const onPage = (url) => navigate(url);
    const currentPolicy = activePolicy ? POLICY_POPUPS[activePolicy] : null;

    useEffect(() => {
        if (!activePolicy) return undefined;

        const closeOnEscape = (event) => {
            if (event.key === 'Escape') {
                setActivePolicy(null);
            }
        };

        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [activePolicy]);

    return (
        <footer id="footer" className={cx('wrapper')}>
            <div className={cx('inner')}>
                {/* Cột 1: Logo + slogan + social */}
                <div className={cx('boxItem')}>
                    <div className={cx('brand')}>
                        <img className={cx('logo')} src={logo} alt="logo" />
                        <p className={cx('desc')}>
                            {'“Healthcare kết nối yêu thương,'}
                            <br />
                            <span className={cx('descCenter')}>{'nâng niu sức khỏe”'}</span>
                        </p>

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

                {/* Cột 3: Dịch vụ & tiện ích */}
                <div className={cx('boxItem')}>
                    <h4 className={cx('itemTitle')}>Dịch Vụ & Tiện Ích</h4>
                    <ul className={cx('list')}>
                        <li className={cx('link')} onClick={() => onPage('/hoi-bac-si')}>
                            Tư vấn bác sĩ
                        </li>
                        <li className={cx('link')} onClick={() => onPage('/info?tab=reminder')}>
                            Nhắc lịch chăm sóc
                        </li>
                        <li className={cx('link')} onClick={() => onPage('/contact')}>
                            Hỗ trợ khách hàng
                        </li>
                        <li className={cx('link')} onClick={() => onPage('/blog')}>
                            Bài viết sức khỏe
                        </li>
                    </ul>
                </div>

                {/* Cột 4: Chính sách */}
                <div className={cx('boxItem')}>
                    <h4 className={cx('itemTitle')}>Chính Sách</h4>
                    <ul className={cx('list')}>
                        <li>
                            <button className={cx('link')} type="button" onClick={() => setActivePolicy('warranty')}>
                                Chính sách bảo hành
                            </button>
                        </li>
                        <li>
                            <button className={cx('link')} type="button" onClick={() => setActivePolicy('returnPolicy')}>
                                Chính sách đổi trả
                            </button>
                        </li>
                        <li>
                            <button className={cx('link')} type="button" onClick={() => setActivePolicy('shipping')}>
                                Chính sách vận chuyển
                            </button>
                        </li>
                        <li>
                            <button className={cx('link')} type="button" onClick={() => setActivePolicy('shoppingGuide')}>
                                Hướng dẫn mua hàng
                            </button>
                        </li>
                        <li>
                            <button className={cx('link')} type="button" onClick={() => setActivePolicy('serviceTerms')}>
                                Điều khoản dịch vụ
                            </button>
                        </li>
                    </ul>
                </div>

                {/* Cột 5: Kênh bán hàng */}
                <div className={cx('boxItem')}>
                    <h4 className={cx('itemTitle')}>Kênh Kết Nối</h4>
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

            {currentPolicy && (
                <div
                    className={cx('policyOverlay')}
                    role="dialog"
                    aria-modal="true"
                    aria-label={currentPolicy.title}
                    onClick={() => setActivePolicy(null)}
                >
                    <div className={cx('policyModal')} onClick={(event) => event.stopPropagation()}>
                        <div className={cx('policyHeader')}>
                            <h3>{currentPolicy.title}</h3>
                            <button
                                className={cx('policyClose')}
                                type="button"
                                aria-label="Đóng"
                                onClick={() => setActivePolicy(null)}
                            >
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        </div>

                        <p className={cx('policyIntro')}>{currentPolicy.description}</p>

                        <ol className={cx('policyList')}>
                            {currentPolicy.items.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ol>
                    </div>
                </div>
            )}
        </footer>
    );
}

export default Footer;
