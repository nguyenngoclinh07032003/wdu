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

function AskDoctor() {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [title, setTitle] = useState('');
    const [question, setQuestion] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [severity, setSeverity] = useState('mild');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeChatId, setActiveChatId] = useState(null);
    const [activeChatPartner, setActiveChatPartner] = useState('');

    const fetchQuestions = async () => {
        try {
            setLoading(true);
            const res = await request.get('/api/doctor-inbox/my-questions', {
                params: { targetRole: 'doctor' },
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
        document.title = 'Hỏi bác sĩ';
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
                title: title.trim() || question.trim().slice(0, 80),
                question: question.trim(),
                specialty: specialty.trim(),
                severity,
                targetRole: 'doctor',
            });
            toast.success(res?.data?.message || 'Đã gửi câu hỏi');
            setTitle('');
            setQuestion('');
            setSpecialty('');
            setSeverity('mild');
            await fetchQuestions();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Gửi câu hỏi thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const openChat = (item) => {
        if (item.status !== 'answered' && !item.escalatedToDoctor && item.workflowStatus !== 'WAITING_CUSTOMER_INFORMATION') {
            return;
        }
        setActiveChatId(item._id);
        setActiveChatPartner(item.answeredByName || 'Bác sĩ');
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
                        <h1>Hỏi bác sĩ</h1>
                        <p>Gửi câu hỏi sức khỏe / thiết bị y tế. Bác sĩ đã duyệt chứng chỉ sẽ trả lời bạn.</p>
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
                    <label htmlFor="ask-title">Tiêu đề</label>
                    <input
                        id="ask-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="VD: Huyết áp cao buổi sáng"
                        disabled={submitting}
                        style={{ width: '100%', marginBottom: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid #d8e2d4' }}
                    />
                    <label htmlFor="ask-specialty">Chuyên khoa</label>
                    <input
                        id="ask-specialty"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder="VD: Tim mạch, Nội tổng quát..."
                        disabled={submitting}
                        style={{ width: '100%', marginBottom: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid #d8e2d4' }}
                    />
                    <label htmlFor="ask-severity">Mức độ nghiêm trọng</label>
                    <select
                        id="ask-severity"
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        disabled={submitting}
                        style={{ width: '100%', marginBottom: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid #d8e2d4' }}
                    >
                        <option value="mild">Nhẹ</option>
                        <option value="moderate">Trung bình</option>
                        <option value="severe">Nghiêm trọng</option>
                    </select>
                    <label htmlFor="ask-question">Nội dung câu hỏi / triệu chứng</label>
                    <textarea
                        id="ask-question"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Mô tả triệu chứng, thời gian xuất hiện, thuốc đang dùng..."
                        rows={5}
                        disabled={submitting}
                    />
                    <button type="button" className={cx('submitBtn')} onClick={handleSubmit} disabled={submitting}>
                        {submitting ? 'Đang gửi...' : 'Gửi câu hỏi tới bác sĩ'}
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
                                    clickable:
                                        item.status === 'answered' ||
                                        item.escalatedToDoctor ||
                                        item.workflowStatus === 'WAITING_CUSTOMER_INFORMATION',
                                })}
                                onClick={() => openChat(item)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') openChat(item);
                                }}
                                role={
                                    item.status === 'answered' ||
                                    item.escalatedToDoctor ||
                                    item.workflowStatus === 'WAITING_CUSTOMER_INFORMATION'
                                        ? 'button'
                                        : undefined
                                }
                                tabIndex={
                                    item.status === 'answered' ||
                                    item.escalatedToDoctor ||
                                    item.workflowStatus === 'WAITING_CUSTOMER_INFORMATION'
                                        ? 0
                                        : undefined
                                }
                            >
                                <div className={cx('qaHead')}>
                                    <span className={cx('badge', item.status)}>
                                        {item.workflowStatusLabel ||
                                            (item.status === 'answered' ? 'Đã trả lời' : 'Chờ bác sĩ')}
                                    </span>
                                    <span className={cx('date')}>
                                        {item.createdAt
                                            ? new Date(item.createdAt).toLocaleString('vi-VN')
                                            : ''}
                                    </span>
                                </div>
                                <p className={cx('question')}>
                                    <strong>{item.title || 'Bạn hỏi'}:</strong> {item.question}
                                </p>
                                {item.status === 'answered' ? (
                                    <div className={cx('answer')}>
                                        <strong>
                                            Trả lời từ {item.answeredByName || 'Bác sĩ'}:
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
                                    <p className={cx('waiting')}>Bác sĩ đang xem xét câu hỏi của bạn...</p>
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

export default AskDoctor;
