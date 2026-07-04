import { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../../Styles/DoctorPanel.module.scss';
import request from '../../../Config/api';
import { toast } from 'react-toastify';
import InboxChatPanel from '../../../Components/InboxChatPanel';

const cx = classNames.bind(styles);

function StaffInbox() {
    const [questions, setQuestions] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [filter, setFilter] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [answeringId, setAnsweringId] = useState(null);
    const [answerDrafts, setAnswerDrafts] = useState({});
    const [submittingId, setSubmittingId] = useState(null);
    const [activeChatId, setActiveChatId] = useState(null);
    const [activeChatPartner, setActiveChatPartner] = useState('');

    const fetchInbox = async () => {
        try {
            setLoading(true);
            const inboxRes = await request.get('/api/staff-inbox/inbox', {
                params: filter ? { status: filter } : {},
            });
            setQuestions(Array.isArray(inboxRes.data?.data) ? inboxRes.data.data : []);
            setPendingCount(inboxRes.data?.pendingCount || 0);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể tải hộp thư câu hỏi');
            setQuestions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInbox();
    }, [filter]);

    const handleSubmitAnswer = async (id) => {
        const answer = answerDrafts[id]?.trim();
        if (!answer) {
            toast.error('Vui lòng nhập câu trả lời');
            return;
        }

        try {
            setSubmittingId(id);
            const res = await request.put(`/api/staff-inbox/inbox/${id}/answer`, { answer });
            toast.success(res?.data?.message || 'Đã gửi câu trả lời');
            setAnsweringId(null);
            await fetchInbox();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Gửi câu trả lời thất bại');
        } finally {
            setSubmittingId(null);
        }
    };

    if (loading && !questions.length) {
        return <div className={cx('doctorPage')}>Đang tải câu hỏi...</div>;
    }

    return (
        <div className={cx('doctorPage')}>
            <h2 className={cx('pageTitle')}>Câu hỏi từ khách hàng</h2>
            <p className={cx('pageDesc')}>
                Xem và trả lời câu hỏi về đơn hàng, sản phẩm từ khách hàng.
                {pendingCount > 0 ? ` (${pendingCount} câu chờ trả lời)` : ''}
            </p>

            <div className={cx('inboxFilters')}>
                <button
                    type="button"
                    className={cx('filterBtn', { active: filter === 'pending' })}
                    onClick={() => setFilter('pending')}
                >
                    Chờ trả lời
                </button>
                <button
                    type="button"
                    className={cx('filterBtn', { active: filter === 'answered' })}
                    onClick={() => setFilter('answered')}
                >
                    Đã trả lời
                </button>
                <button
                    type="button"
                    className={cx('filterBtn', { active: filter === '' })}
                    onClick={() => setFilter('')}
                >
                    Tất cả
                </button>
            </div>

            <div className={cx('qaList')}>
                {questions.length ? (
                    questions.map((item) => (
                        <div key={item._id} className={cx('qaItem')}>
                            <div className={cx('inboxMeta')}>
                                <span className={cx('askerBadge')}>{item.askerRoleLabel || 'Khách'}</span>
                                <strong>{item.askerName || item.asker?.fullname || 'Người hỏi'}</strong>
                                {item.needsReply ? (
                                    <span className={cx('askerBadge', 'needsReply')}>Khách nhắn mới</span>
                                ) : null}
                                {item.isEscalated || item.escalatedToDoctor ? (
                                    <span className={cx('askerBadge', 'escalated')}>Đã chuyển bác sĩ</span>
                                ) : null}
                                <span className={cx('qaMeta')}>
                                    {item.createdAt
                                        ? new Date(item.createdAt).toLocaleString('vi-VN')
                                        : ''}
                                </span>
                            </div>

                            <p className={cx('qaQuestion')}>Q: {item.question}</p>

                            {item.status === 'answered' || item.needsReply ? (
                                <div className={cx('qaAnswer')}>
                                    <strong>A ({item.answeredByName || 'Nhân viên'}):</strong>
                                    <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>
                                        {item.lastMessage || item.answer}
                                    </p>
                                    <div className={cx('actions')} style={{ marginTop: 12 }}>
                                        <button
                                            type="button"
                                            className={cx('primaryBtn')}
                                            onClick={() => {
                                                setActiveChatId(item._id);
                                                setActiveChatPartner(
                                                    item.askerName || item.asker?.fullname || 'Khách hàng',
                                                );
                                            }}
                                        >
                                            {item.needsReply ? 'Trả lời trong chat' : 'Mở cuộc trò chuyện'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className={cx('answerForm')}>
                                    {answeringId === item._id ? (
                                        <>
                                            <textarea
                                                rows={4}
                                                value={answerDrafts[item._id] || ''}
                                                onChange={(e) =>
                                                    setAnswerDrafts({
                                                        ...answerDrafts,
                                                        [item._id]: e.target.value,
                                                    })
                                                }
                                                placeholder="Nhập câu trả lời cho khách hàng..."
                                                disabled={submittingId === item._id}
                                            />
                                            <div className={cx('actions')}>
                                                <button
                                                    type="button"
                                                    className={cx('primaryBtn')}
                                                    onClick={() => handleSubmitAnswer(item._id)}
                                                    disabled={submittingId === item._id}
                                                >
                                                    {submittingId === item._id ? 'Đang gửi...' : 'Gửi trả lời'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={cx('secondaryBtn')}
                                                    onClick={() => setAnsweringId(null)}
                                                    disabled={submittingId === item._id}
                                                >
                                                    Hủy
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            className={cx('primaryBtn')}
                                            onClick={() => {
                                                setAnsweringId(item._id);
                                                setAnswerDrafts({
                                                    ...answerDrafts,
                                                    [item._id]: answerDrafts[item._id] || '',
                                                });
                                            }}
                                        >
                                            Trả lời câu hỏi
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className={cx('statusCard')}>Không có câu hỏi nào.</div>
                )}
            </div>

            {activeChatId ? (
                <InboxChatPanel
                    conversationId={activeChatId}
                    title={activeChatPartner}
                    backLabel="Câu hỏi khách hàng"
                    onClose={() => {
                        setActiveChatId(null);
                        setActiveChatPartner('');
                    }}
                    onUpdated={fetchInbox}
                />
            ) : null}
        </div>
    );
}

export default StaffInbox;
