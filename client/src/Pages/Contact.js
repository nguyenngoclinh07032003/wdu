import classNames from 'classnames/bind';
import { useRef, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBolt,
    faChevronDown,
    faComments,
    faEnvelope,
    faHeadset,
    faLocationDot,
    faLock,
    faPhone,
    faRoute,
    faShieldHeart,
} from '@fortawesome/free-solid-svg-icons';

import styles from '../Styles/Contact.module.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import Chatbot from '../utils/Chatbot/Chatbot';
import { submitContactRequest } from '../services/contactService';
import compressImageFile from '../utils/compressImageFile';
import {
    CONTACT_FAQS,
    CONTACT_INFO,
    RESPONSE_COMMITMENTS,
    SUPPORT_CARDS,
    SUPPORT_TYPES,
} from '../constants/contactInfo';

const cx = classNames.bind(styles);

const INITIAL_FORM = {
    fullName: '',
    phone: '',
    email: '',
    supportType: 'product-advice',
    orderCode: '',
    message: '',
    agreeTerms: false,
};

const isValidVietnamPhone = (phone) => /^0\d{9}$/.test(String(phone).replace(/\s/g, ''));

function Contact() {
    const formRef = useRef(null);
    const [form, setForm] = useState(INITIAL_FORM);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [lastRequestCode, setLastRequestCode] = useState('');
    const [openFaq, setOpenFaq] = useState(0);

    const showOrderCode = form.supportType === 'order-support' || form.supportType === 'return-warranty';

    const scrollToForm = (supportType) => {
        if (supportType) {
            setForm((prev) => ({ ...prev, supportType }));
        }
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleChange = (field) => (event) => {
        const value = field === 'agreeTerms' ? event.target.checked : event.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleImageChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            setImageFile(null);
            setImagePreview('');
            return;
        }

        if (file.size > 3 * 1024 * 1024) {
            toast.error('Hình ảnh không được vượt quá 3MB');
            event.target.value = '';
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const readFileAsBase64 = async (file) => {
        try {
            return await compressImageFile(file);
        } catch (error) {
            console.log(error);
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.fullName.trim()) {
            toast.error('Vui lòng nhập họ và tên');
            return;
        }

        if (!isValidVietnamPhone(form.phone)) {
            toast.error('Số điện thoại không hợp lệ');
            return;
        }

        if (!form.message.trim()) {
            toast.error('Vui lòng nhập nội dung chi tiết');
            return;
        }

        if (showOrderCode && !form.orderCode.trim()) {
            toast.error('Vui lòng nhập mã đơn hàng');
            return;
        }

        if (!form.agreeTerms) {
            toast.error('Vui lòng đồng ý cung cấp thông tin để Mộc Xoa liên hệ hỗ trợ');
            return;
        }

        setSubmitting(true);

        try {
            let imageData = '';
            if (imageFile) {
                imageData = await readFileAsBase64(imageFile);
            }

            const res = await submitContactRequest({
                ...form,
                imageName: imageFile?.name || '',
                imageData,
            });

            setLastRequestCode(res?.requestCode || '');
            setSubmitted(true);
            setForm(INITIAL_FORM);
            setImageFile(null);
            setImagePreview('');
            toast.success('Mộc Xoa đã nhận được yêu cầu của bạn');
        } catch (error) {
            const status = error?.response?.status;
            if (status === 413) {
                toast.error(
                    error?.response?.data?.message ||
                        'Ảnh đính kèm quá lớn. Vui lòng chọn ảnh nhỏ hơn hoặc gửi không kèm ảnh.',
                );
            } else {
                toast.error(error?.response?.data?.message || 'Không thể gửi yêu cầu, vui lòng thử lại');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Header />
            <ToastContainer position="top-right" autoClose={3000} />

            <main className={cx('wrapper')}>
                <section className={cx('hero')}>
                    <div className={cx('heroOverlay')} />
                    <div className={cx('heroContent')}>
                        <div className={cx('heroVisual')}>
                            <div className={cx('chatBubble', 'bubble1')}>
                                <FontAwesomeIcon icon={faComments} />
                            </div>
                            <div className={cx('chatBubble', 'bubble2')}>
                                <FontAwesomeIcon icon={faHeadset} />
                            </div>
                            <div className={cx('chatBubble', 'bubble3')}>
                                <FontAwesomeIcon icon={faHeadset} />
                            </div>
                        </div>

                        <p className={cx('miniLabel')}>HỖ TRỢ KHÁCH HÀNG</p>
                        <h1>Mộc Xoa luôn sẵn sàng lắng nghe bạn</h1>
                        <p>
                            Bạn cần tư vấn sản phẩm, hỗ trợ đơn hàng hoặc muốn hợp tác cùng Mộc Xoa? Hãy lựa chọn nội
                            dung phù hợp hoặc gửi thông tin cho chúng tôi. Đội ngũ Mộc Xoa sẽ phản hồi trong thời gian
                            sớm nhất.
                        </p>

                        <div className={cx('heroActions')}>
                            <button type="button" className={cx('btnPrimary')} onClick={() => scrollToForm()}>
                                Gửi yêu cầu hỗ trợ
                            </button>
                            <a
                                href={CONTACT_INFO.zaloUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={cx('btnOutline')}
                            >
                                Liên hệ ngay qua Zalo
                            </a>
                        </div>
                    </div>
                </section>

                <section className={cx('supportNeeds')}>
                    <div className={cx('sectionHeading')}>
                        <h2>Bạn cần Mộc Xoa hỗ trợ điều gì?</h2>
                        <span />
                        <small>Chọn nhu cầu phù hợp để được hỗ trợ nhanh hơn</small>
                    </div>

                    <div className={cx('supportGrid')}>
                        {SUPPORT_CARDS.map((card) => (
                            <article className={cx('supportCard')} key={card.id}>
                                <h3>{card.title}</h3>
                                <p>{card.description}</p>
                                <button type="button" className={cx('cardBtn')} onClick={() => scrollToForm(card.id)}>
                                    {card.button}
                                </button>
                            </article>
                        ))}
                    </div>
                </section>

                <section className={cx('formSection')} ref={formRef} id="contact-form">
                    <div className={cx('formLayout')}>
                        <div className={cx('formPanel')}>
                            {submitted ? (
                                <div className={cx('successBox')}>
                                    <h2>Mộc Xoa đã nhận được yêu cầu của bạn</h2>
                                    {lastRequestCode ? (
                                        <p>
                                            Mã yêu cầu của bạn: <strong>{lastRequestCode}</strong>
                                        </p>
                                    ) : null}
                                    <p>
                                        Cảm ơn bạn đã liên hệ. Đội ngũ của chúng tôi sẽ kiểm tra thông tin và phản hồi
                                        trong thời gian sớm nhất.
                                    </p>
                                    <button
                                        type="button"
                                        className={cx('btnPrimary')}
                                        onClick={() => {
                                            setSubmitted(false);
                                            setLastRequestCode('');
                                        }}
                                    >
                                        Gửi yêu cầu khác
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className={cx('panelHeading')}>
                                        <h2>Gửi lời nhắn đến Mộc Xoa</h2>
                                        <p>
                                            Hãy cung cấp một số thông tin để đội ngũ Mộc Xoa có thể hỗ trợ bạn chính
                                            xác và nhanh chóng hơn.
                                        </p>
                                    </div>

                                    <form className={cx('contactForm')} onSubmit={handleSubmit}>
                                        <div className={cx('formRow')}>
                                            <label>
                                                Họ và tên <span>*</span>
                                                <input
                                                    type="text"
                                                    value={form.fullName}
                                                    onChange={handleChange('fullName')}
                                                    placeholder="Nhập họ và tên"
                                                />
                                            </label>
                                            <label>
                                                Số điện thoại <span>*</span>
                                                <input
                                                    type="tel"
                                                    value={form.phone}
                                                    onChange={handleChange('phone')}
                                                    placeholder="0xxxxxxxxx"
                                                />
                                            </label>
                                        </div>

                                        <label>
                                            Email
                                            <input
                                                type="email"
                                                value={form.email}
                                                onChange={handleChange('email')}
                                                placeholder="email@example.com"
                                            />
                                        </label>

                                        <label>
                                            Nội dung cần hỗ trợ <span>*</span>
                                            <select value={form.supportType} onChange={handleChange('supportType')}>
                                                {SUPPORT_TYPES.map((item) => (
                                                    <option key={item.value} value={item.value}>
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        {showOrderCode && (
                                            <label>
                                                Mã đơn hàng <span>*</span>
                                                <input
                                                    type="text"
                                                    value={form.orderCode}
                                                    onChange={handleChange('orderCode')}
                                                    placeholder="Nhập mã đơn hàng"
                                                />
                                            </label>
                                        )}

                                        <label>
                                            Nội dung chi tiết <span>*</span>
                                            <textarea
                                                rows={5}
                                                value={form.message}
                                                onChange={handleChange('message')}
                                                placeholder="Mô tả chi tiết yêu cầu của bạn..."
                                            />
                                        </label>

                                        <label className={cx('fileLabel')}>
                                            Tải hình ảnh
                                            <input type="file" accept="image/*" onChange={handleImageChange} />
                                            <span>Chọn ảnh minh họa (tối đa 3MB, không bắt buộc)</span>
                                        </label>

                                        {imagePreview && (
                                            <div className={cx('imagePreview')}>
                                                <img src={imagePreview} alt="Xem trước" />
                                            </div>
                                        )}

                                        <label className={cx('checkboxLabel')}>
                                            <input
                                                type="checkbox"
                                                checked={form.agreeTerms}
                                                onChange={handleChange('agreeTerms')}
                                            />
                                            <span>Tôi đồng ý cung cấp thông tin để Mộc Xoa liên hệ hỗ trợ.</span>
                                        </label>

                                        <button type="submit" className={cx('btnPrimary', 'submitBtn')} disabled={submitting}>
                                            {submitting ? 'Đang gửi...' : 'Gửi yêu cầu hỗ trợ'}
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>

                        <aside className={cx('directPanel')}>
                            <div className={cx('panelHeading')}>
                                <h2>Kết nối trực tiếp với Mộc Xoa</h2>
                            </div>

                            <div className={cx('directCard')}>
                                <div className={cx('directIcon')}>
                                    <FontAwesomeIcon icon={faPhone} />
                                </div>
                                <div>
                                    <h3>Hotline tư vấn</h3>
                                    <a href={`tel:${CONTACT_INFO.phone}`}>{CONTACT_INFO.phoneDisplay}</a>
                                    <p>Thời gian hỗ trợ: {CONTACT_INFO.hotlineHours}</p>
                                </div>
                            </div>

                            <div className={cx('directCard')}>
                                <div className={cx('directIcon', 'zalo')}>Z</div>
                                <div>
                                    <h3>Zalo hỗ trợ</h3>
                                    <p>Tư vấn sản phẩm, kiểm tra đơn hàng và tiếp nhận phản hồi nhanh chóng.</p>
                                    <a href={CONTACT_INFO.zaloUrl} target="_blank" rel="noreferrer" className={cx('linkBtn')}>
                                        Chat qua Zalo
                                    </a>
                                </div>
                            </div>

                            <div className={cx('directCard')}>
                                <div className={cx('directIcon')}>
                                    <FontAwesomeIcon icon={faEnvelope} />
                                </div>
                                <div>
                                    <h3>Email chăm sóc khách hàng</h3>
                                    <a href={`mailto:${CONTACT_INFO.customerEmail}`}>{CONTACT_INFO.customerEmail}</a>
                                </div>
                            </div>

                            <div className={cx('directCard')}>
                                <div className={cx('directIcon')}>
                                    <FontAwesomeIcon icon={faEnvelope} />
                                </div>
                                <div>
                                    <h3>Email hợp tác</h3>
                                    <a href={`mailto:${CONTACT_INFO.partnerEmail}`}>{CONTACT_INFO.partnerEmail}</a>
                                </div>
                            </div>

                            <div className={cx('directCard')}>
                                <div className={cx('directIcon')}>
                                    <FontAwesomeIcon icon={faLocationDot} />
                                </div>
                                <div>
                                    <h3>Địa chỉ</h3>
                                    <p>{CONTACT_INFO.address}</p>
                                </div>
                            </div>
                        </aside>
                    </div>
                </section>

                <section className={cx('commitments')}>
                    <div className={cx('commitmentGrid')}>
                        {RESPONSE_COMMITMENTS.map((item, index) => (
                            <article className={cx('commitmentCard')} key={item.title}>
                                <div className={cx('commitmentIcon')}>
                                    <FontAwesomeIcon
                                        icon={index === 0 ? faBolt : index === 1 ? faLock : faShieldHeart}
                                    />
                                </div>
                                <h3>{item.title}</h3>
                                <p>{item.description}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className={cx('mapSection')}>
                    <div className={cx('sectionHeading')}>
                        <h2>Tìm Mộc Xoa tại đây</h2>
                        <span />
                    </div>

                    <div className={cx('mapLayout')}>
                        <div className={cx('mapFrame')}>
                            <iframe
                                title="Bản đồ Mộc Xoa"
                                src={CONTACT_INFO.mapEmbedUrl}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                allowFullScreen
                            />
                        </div>

                        <div className={cx('mapInfo')}>
                            <h3>Văn phòng Mộc Xoa</h3>
                            <p>{CONTACT_INFO.address}</p>

                            <h4>Thời gian làm việc</h4>
                            <ul>
                                <li>Thứ Hai – Thứ Sáu: 08:00–17:30</li>
                                <li>Thứ Bảy: 08:00–12:00</li>
                                <li>Chủ nhật: Hỗ trợ trực tuyến</li>
                            </ul>

                            <p className={cx('officeNote')}>{CONTACT_INFO.officeNote}</p>

                            <a
                                href={CONTACT_INFO.mapDirectionsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={cx('btnOutline')}
                            >
                                <FontAwesomeIcon icon={faRoute} /> Xem đường đi
                            </a>
                        </div>
                    </div>
                </section>

                <section className={cx('faqSection')}>
                    <div className={cx('sectionHeading')}>
                        <h2>Câu hỏi thường gặp</h2>
                        <span />
                    </div>

                    <div className={cx('faqList')}>
                        {CONTACT_FAQS.map((item, index) => (
                            <article className={cx('faqItem', { open: openFaq === index })} key={item.question}>
                                <button
                                    type="button"
                                    className={cx('faqQuestion')}
                                    onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                                >
                                    <span>{item.question}</span>
                                    <FontAwesomeIcon icon={faChevronDown} />
                                </button>
                                {openFaq === index && <p className={cx('faqAnswer')}>{item.answer}</p>}
                            </article>
                        ))}
                    </div>
                </section>
            </main>

            <Footer />
            <Chatbot />
        </>
    );
}

export default Contact;
