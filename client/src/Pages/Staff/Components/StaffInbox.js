import { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../../Styles/DoctorPanel.module.scss';
import request from '../../../Config/api';
import { toast } from 'react-toastify';
import InboxChatPanel from '../../../Components/InboxChatPanel';

const cx = classNames.bind(styles);

function StaffInbox({ onUnreadChange, initialFilter = 'pending', refreshKey = 0 }) {
    const [questions, setQuestions] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [filter, setFilter] = useState(initialFilter || 'pending');
    const [loading, setLoading] = useState(true);
    const [answeringId, setAnsweringId] = useState(null);
    const [answerDrafts, setAnswerDrafts] = useState({});
    const [submittingId, setSubmittingId] = useState(null);
    const [activeChatId, setActiveChatId] = useState(null);
    const [activeChatPartner, setActiveChatPartner] = useState('');

    useEffect(() => {
        if (initialFilter !== undefined) setFilter(initialFilter || '');
    }, [initialFilter]);

    const fetchInbox = useCallback(
        async (silent = false) => {
            try {
                if (!silent) setLoading(true);
                const params = {};
                if (filter === 'escalated') {
                    // client-side filter after fetch all
                } else if (filter) {
                    params.status = filter;
                }
                const inboxRes = await request.get('/api/staff-inbox/inbox', { params });
                let list = Array.isArray(inboxRes.data?.data) ? inboxRes.data.data : [];
                if (filter === 'escalated') {
                    list = list.filter((q) => q.escalatedToDoctor || q.isEscalated);
                }
                setQuestions(list);
                setPendingCount(inboxRes.data?.pendingCount || 0);

                try {
                    const summary = await request.get('/api/staff-inbox/inbox/unread-summary');
                    onUnreadChange?.(summary?.data?.totalUnread || 0);
                } catch (e) {
                    // ignore
                }
            } catch (error) {
                if (!silent) {
                    toast.error(error?.response?.data?.message || 'Không thể tải hộp thư câu hỏi');
                }
                setQuestions([]);
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [filter, onUnreadChange],
    );

    useEffect(() => {
        fetchInbox();
    }, [fetchInbox, refreshKey]);

    const markAsRead = async (conversationId) => {
        try {
            await request.patch(`/api/staff-inbox/inbox/${conversationId}/read`);
            setQuestions((prev) =>
                prev.map((item) =>
                    String(item._id) === String(conversationId)
                        ? { ...item, staffUnread: 0, staffUnreadCount: 0 }
                        : item,
                ),
            );
            const summary = await request.get('/api/staff-inbox/inbox/unread-summary');
            onUnreadChange?.(summary?.data?.totalUnread || 0);
        } catch (error) {
            console.log(error);
        }
    };

    const openConversation = async (item) => {
        setActiveChatId(item._id);
        setActiveChatPartner(item.askerName || item.asker?.fullname || 'Khách hàng');
        if ((item.staffUnread || item.staffUnreadCount || 0) > 0) {
            await markAsRead(item._id);
        }
    };

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
            await fetchInbox(true);
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
                Tiếp nhận, trả lời hoặc chuyển bác sĩ.
                {pendingCount > 0 ? ` (${pendingCount} câu chờ xử lý)` : ''}
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
                    className={cx('filterBtn', { active: filter === 'escalated' })}
                    onClick={() => setFilter('escalated')}
                >
                    Chuyển bác sĩ
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
                    questions.map((item) => {
                        const unread = item.staffUnread || item.staffUnreadCount || 0;
                        return (
                            <div
                                key={item._id}
                                className={cx('qaItem', { hasUnread: unread > 0 })}
                            >
                                <div className={cx('inboxMeta')}>
                                    <span className={cx('askerBadge')}>
                                        {item.askerRoleLabel || 'Khách'}
                                    </span>
                                    <strong>{item.askerName || item.asker?.fullname || 'Người hỏi'}</strong>
                                    {unread > 0 ? (
                                        <span className={cx('askerBadge', 'unreadBadge')}>
                                            {unread} tin mới
                                        </span>
                                    ) : null}
                                    {item.doctorViewed ? (
                                        <span className={cx('askerBadge', 'escalated')}>Bác sĩ đã xem</span>
                                    ) : null}
                                    {item.isEscalated || item.escalatedToDoctor ? (
                                        <span className={cx('askerBadge', 'escalated')}>Đã chuyển bác sĩ</span>
                                    ) : null}
                                    <span className={cx('qaMeta')}>
                                        {item.updatedAt || item.createdAt
                                            ? new Date(item.updatedAt || item.createdAt).toLocaleString(
                                                  'vi-VN',
                                              )
                                            : ''}
                                    </span>
                                </div>

                                <p className={cx('qaQuestion')}>
                                    <strong>{item.title || 'Q'}:</strong> {item.question}
                                </p>

                                {item.status === 'answered' ||
                                item.needsReply ||
                                item.escalatedToDoctor ? (
                                    <div className={cx('qaAnswer')}>
                                        <strong>
                                            A (
                                            {item.assignedDoctorName ||
                                                item.answeredByName ||
                                                'Nhân viên'}
                                            ):
                                        </strong>
                                        <p style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>
                                            {item.lastMessage || item.answer}
                                        </p>
                                        <div className={cx('actions')} style={{ marginTop: 12 }}>
                                            <button
                                                type="button"
                                                className={cx('primaryBtn')}
                                                onClick={() => openConversation(item)}
                                            >
                                                {unread > 0 || item.needsReply
                                                    ? 'Mở & xử lý'
                                                    : 'Mở cuộc trò chuyện'}
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
                                                        {submittingId === item._id
                                                            ? 'Đang gửi...'
                                                            : 'Gửi trả lời'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={cx('secondaryBtn')}
                                                        onClick={() => openConversation(item)}
                                                    >
                                                        Mở chat / chuyển BS
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
                                            <div className={cx('actions')}>
                                                <button
                                                    type="button"
                                                    className={cx('primaryBtn')}
                                                    onClick={() => {
                                                        setAnsweringId(item._id);
                                                        markAsRead(item._id);
                                                    }}
                                                >
                                                    Trả lời câu hỏi
                                                </button>
                                                <button
                                                    type="button"
                                                    className={cx('secondaryBtn')}
                                                    onClick={() => openConversation(item)}
                                                >
                                                    Mở hội thoại
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
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
                        fetchInbox(true);
                    }}
                    onUpdated={() => fetchInbox(true)}
                />
            ) : null}
        </div>
    );
}

export default StaffInbox;
