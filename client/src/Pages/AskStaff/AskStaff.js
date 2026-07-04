import { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../Styles/AskDoctor.module.scss';
import request from '../../Config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../../Components/Header';
import Footer from '../../Components/Footer';
import InboxChatPanel from '../../Components/InboxChatPanel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

function AskStaff() {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeChatId, setActiveChatId] = useState(null);
    const [activeChatPartner, setActiveChatPartner] = useState('');

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const res = await request.get('/api/doctor-inbox/my-questions', {
                params: { targetRole: 'staff' },
            });
            setQuestions(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể tải câu hỏi');
            setQuestions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        document.title = 'Hỏi nhân viên';
        fetchQuestions();
    }, []);

    const handleSubmit = async () => {
        if (!question.trim()) {
            toast.error('Vui lòng nhập câu hỏi');
            return;
        }

        try {
            setSubmitting(true);
            const res = await request.post('/api/doctor-inbox/ask', {
                question: question.trim(),
                targetRole: 'staff',
            });
            toast.success(res?.data?.message || 'Đã gửi câu hỏi');
            setQuestion('');
            await fetchQuestions();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Gửi câu hỏi thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const openChat = (item) => {
        if (item.status !== 'answered' && !item.escalatedToDoctor) return;
        setActiveChatId(item._id);
        setActiveChatPartner(item.answeredByName || 'Nhân viên');
    };

    const closeChat = () => {
        setActiveChatId(null);
        setActiveChatPartner('');
    };

    return (
        <>
            <Header />
            <div className={cx('page')}>
                <ToastContainer position="top-right" autoClose={2500} />

                <div className={cx('container')}>
                    <div className={cx('header')}>
                        <div>
                            <h1>Hỏi nhân viên</h1>
                            <p>
                                Gửi câu hỏi về đơn hàng, sản phẩm, vận chuyển. Nhân viên Mộc Xoa sẽ trả lời bạn.
                            </p>
                        </div>
                        {!activeChatId ? (
                            <Link to="/" className={cx('backLink')}>
                                ← Về trang chủ
                            </Link>
                        ) : null}
                    </div>

                    {activeChatId ? (
                        <InboxChatPanel
                            inline
                            conversationId={activeChatId}
                            title={activeChatPartner}
                            backLabel="Câu hỏi của bạn"
                            onClose={closeChat}
                            onUpdated={fetchQuestions}
                        />
                    ) : (
                        <>
                    <div className={cx('askCard')}>
                        <label htmlFor="ask-staff-question">Câu hỏi của bạn</label>
                        <textarea
                            id="ask-staff-question"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="VD: Đơn hàng #12345 của tôi giao đến khi nào?"
                            rows={5}
                            disabled={submitting}
                        />
                        <button
                            type="button"
                            className={cx('submitBtn')}
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting ? 'Đang gửi...' : 'Gửi câu hỏi tới nhân viên'}
                        </button>
                    </div>

                    <h2 className={cx('sectionTitle')}>
                        <button
                            type="button"
                            className={cx('sectionBackBtn')}
                            onClick={() => navigate(-1)}
                            aria-label="Quay lại trang trước"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} />
                        </button>
                        <span>Câu hỏi của bạn</span>
                    </h2>

                    {loading ? (
                        <p className={cx('empty')}>Đang tải...</p>
                    ) : questions.length ? (
                        <div className={cx('qaList')}>
                            {questions.map((item) => (
                                <div
                                    key={item._id}
                                    className={cx('qaItem', item.status, {
                                        clickable: item.status === 'answered' || item.escalatedToDoctor,
                                    })}
                                    onClick={() => openChat(item)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') openChat(item);
                                    }}
                                    role={item.status === 'answered' ? 'button' : undefined}
                                    tabIndex={item.status === 'answered' ? 0 : undefined}
                                >
                                    <div className={cx('qaHead')}>
                                    <span
                                        className={cx('badge', item.escalatedToDoctor ? 'escalated' : item.status)}
                                    >
                                        {item.escalatedToDoctor
                                            ? 'Bác sĩ tham gia'
                                            : item.status === 'answered'
                                              ? 'Đã trả lời'
                                              : 'Chờ nhân viên'}
                                    </span>
                                        <span className={cx('date')}>
                                            {item.createdAt
                                                ? new Date(item.createdAt).toLocaleString('vi-VN')
                                                : ''}
                                        </span>
                                    </div>
                                    <p className={cx('question')}>
                                        <strong>Bạn hỏi:</strong> {item.question}
                                    </p>
                                    {item.status === 'answered' || item.escalatedToDoctor ? (
                                        <div className={cx('answer')}>
                                            <strong>
                                                Trả lời từ{' '}
                                                {item.escalatedToDoctor && item.assignedDoctorName
                                                    ? `${item.answeredByName || 'Nhân viên'} & Bác sĩ ${item.assignedDoctorName}`
                                                    : item.answeredByName || 'Nhân viên'}
                                                :
                                            </strong>
                                            <p>{item.answer}</p>
                                            {item.answeredAt ? (
                                                <span className={cx('answeredAt')}>
                                                    {new Date(item.answeredAt).toLocaleString('vi-VN')}
                                                </span>
                                            ) : null}
                                            <span className={cx('chatHint')}>
                                                <FontAwesomeIcon icon={faArrowLeft} className={cx('hintIcon')} />
                                                Nhấn để mở chat và tiếp tục trò chuyện
                                            </span>
                                        </div>
                                    ) : (
                                        <p className={cx('waiting')}>
                                            Nhân viên đang xem xét câu hỏi của bạn...
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={cx('empty')}>Bạn chưa gửi câu hỏi nào.</p>
                    )}
                        </>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}

export default AskStaff;
