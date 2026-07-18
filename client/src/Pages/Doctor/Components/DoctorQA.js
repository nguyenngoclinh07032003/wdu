import { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../../Styles/DoctorPanel.module.scss';
import request from '../../../Config/api';
import { toast } from 'react-toastify';
import { STATUS_LABELS } from '../doctorUtils';
import { sanitizeHtml } from '../../../utils/sanitizeHtml';

const cx = classNames.bind(styles);

function stripHtml(html = '') {
    return String(html)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
}

function DoctorQA() {
    const [questions, setQuestions] = useState([]);
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [profileStatus, setProfileStatus] = useState('pending');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [profileRes, questionsRes] = await Promise.all([
                request.get('/api/doctor/profile'),
                request.get('/api/doctor/questions'),
            ]);
            setProfileStatus(profileRes?.data?.status || 'pending');
            setQuestions(Array.isArray(questionsRes.data) ? questionsRes.data : []);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể tải dữ liệu Q&A');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async () => {
        if (!question.trim()) {
            toast.error('Vui lòng nhập câu hỏi');
            return;
        }

        try {
            setSubmitting(true);
            const res = await request.post('/api/doctor/questions', { question: question.trim() });
            toast.success(res?.data?.message || 'Đã gửi câu hỏi');
            setQuestion('');
            await fetchData();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Gửi câu hỏi thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    const insertToReply = (item) => {
        const text = stripHtml(item.answer || '');
        if (!text) {
            toast.error('Chưa có nội dung để chèn');
            return;
        }
        window.dispatchEvent(
            new CustomEvent('doctor-ai-insert', {
                detail: { text: `[Gợi ý AI — cần kiểm tra trước khi gửi]\n${text}` },
            }),
        );
        toast.success('Đã sẵn sàng nội dung AI. Mở “Câu hỏi khách hàng” và khung trả lời để chèn.');
    };

    if (loading) {
        return <div className={cx('doctorPage')}>Đang tải Q&A...</div>;
    }

    const canAsk = profileStatus === 'approved';

    return (
        <div className={cx('doctorPage')}>
            <h2 className={cx('pageTitle')}>Hỏi đáp AI</h2>
            <p className={cx('pageDesc')}>
                AI chỉ hỗ trợ gợi ý nội dung. Bác sĩ phải kiểm tra và chỉnh sửa trước khi gửi cho khách hàng.
            </p>

            <div className={cx('aiDisclaimer')}>
                Nội dung chỉ mang tính tham khảo. Không kết luận chắc chắn về bệnh. Không tự động gửi cho khách hàng.
            </div>

            {!canAsk ? (
                <div className={cx('statusCard', 'statusPending')}>
                    Chức năng Q&A chỉ khả dụng khi chứng chỉ đã được duyệt (
                    {STATUS_LABELS[profileStatus] || profileStatus}).
                </div>
            ) : null}

            <div className={cx('formGroup', 'fullWidth')}>
                <label>Câu hỏi chuyên môn / tóm tắt hội thoại</label>
                <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Nhập câu hỏi, triệu chứng cần gợi ý trả lời, hoặc yêu cầu tóm tắt..."
                    disabled={!canAsk || submitting}
                />
            </div>

            <div className={cx('actions')}>
                <button
                    type="button"
                    className={cx('primaryBtn')}
                    onClick={handleSubmit}
                    disabled={!canAsk || submitting}
                >
                    {submitting ? 'Đang gửi...' : 'Nhận gợi ý AI'}
                </button>
            </div>

            <h3 style={{ marginTop: 32 }}>Lịch sử gợi ý</h3>

            <div className={cx('qaList')}>
                {questions.length ? (
                    questions.map((item) => (
                        <div key={item._id} className={cx('qaItem')}>
                            <p className={cx('qaQuestion')}>Q: {item.question}</p>
                            <div
                                className={cx('qaAnswer')}
                                dangerouslySetInnerHTML={{
                                    __html: sanitizeHtml(item.answer || '<em>Chưa có câu trả lời</em>'),
                                }}
                            />
                            <div className={cx('qaMeta')}>
                                {item.answerSource ? `Nguồn: ${item.answerSource}` : ''}
                                {item.createdAt ? ` • ${new Date(item.createdAt).toLocaleString('vi-VN')}` : ''}
                            </div>
                            {item.answer ? (
                                <div className={cx('actions')} style={{ marginTop: 10 }}>
                                    <button
                                        type="button"
                                        className={cx('secondaryBtn')}
                                        onClick={() => insertToReply(item)}
                                    >
                                        Chèn vào khung trả lời
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ))
                ) : (
                    <div className={cx('statusCard')}>Chưa có câu hỏi nào.</div>
                )}
            </div>
        </div>
    );
}

export default DoctorQA;
