import { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../../Styles/DoctorPanel.module.scss';
import request from '../../../Config/api';
import { toast } from 'react-toastify';
import { STATUS_LABELS } from '../doctorUtils';

const cx = classNames.bind(styles);

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

    if (loading) {
        return <div className={cx('doctorPage')}>Đang tải Q&A...</div>;
    }

    const canAsk = profileStatus === 'approved';

    return (
        <div className={cx('doctorPage')}>
            <h2 className={cx('pageTitle')}>Hỏi đáp chuyên môn</h2>
            <p className={cx('pageDesc')}>
                Gửi câu hỏi chuyên môn y tế và nhận câu trả lời từ hệ thống AI hỗ trợ bác sĩ.
            </p>

            {!canAsk ? (
                <div className={cx('statusCard', 'statusPending')}>
                    Chức năng Q&A chỉ khả dụng khi chứng chỉ đã được duyệt (
                    {STATUS_LABELS[profileStatus] || profileStatus}).
                </div>
            ) : null}

            <div className={cx('formGroup', 'fullWidth')}>
                <label>Câu hỏi của bạn</label>
                <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Nhập câu hỏi chuyên môn..."
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
                    {submitting ? 'Đang gửi...' : 'Gửi câu hỏi'}
                </button>
            </div>

            <h3 style={{ marginTop: 32 }}>Lịch sử hỏi đáp</h3>

            <div className={cx('qaList')}>
                {questions.length ? (
                    questions.map((item) => (
                        <div key={item._id} className={cx('qaItem')}>
                            <p className={cx('qaQuestion')}>Q: {item.question}</p>
                            <div
                                className={cx('qaAnswer')}
                                dangerouslySetInnerHTML={{
                                    __html: item.answer || '<em>Chưa có câu trả lời</em>',
                                }}
                            />
                            <div className={cx('qaMeta')}>
                                {item.answerSource ? `Nguồn: ${item.answerSource}` : ''}
                                {item.createdAt ? ` • ${new Date(item.createdAt).toLocaleString('vi-VN')}` : ''}
                            </div>
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
