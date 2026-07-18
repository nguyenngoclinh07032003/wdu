import { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../../Styles/DoctorPanel.module.scss';
import request from '../../../Config/api';
import { toast } from 'react-toastify';
import InboxChatPanel from '../../../Components/InboxChatPanel';

const cx = classNames.bind(styles);

const EMPTY_TAB_COUNTS = {
    all: 0,
    unread: 0,
    pending: 0,
    reviewing: 0,
    answered: 0,
    escalated: 0,
    request_info: 0,
    urgent: 0,
    closed: 0,
};

const FILTERS = [
    { key: '', label: 'Tất cả', countKey: 'all' },
    { key: 'unread', label: 'Chưa đọc', countKey: 'unread' },
    { key: 'pending', label: 'Chờ trả lời', countKey: 'pending' },
    { key: 'reviewing', label: 'Đang xử lý', countKey: 'reviewing' },
    { key: 'answered', label: 'Đã trả lời', countKey: 'answered' },
    { key: 'escalated', label: 'Chuyển từ NV', countKey: 'escalated' },
    { key: 'request_info', label: 'Yêu cầu bổ sung', countKey: 'request_info' },
    { key: 'urgent', label: 'Khẩn cấp', countKey: 'urgent' },
    { key: 'closed', label: 'Đã đóng', countKey: 'closed' },
];

function DoctorInbox({ onUnreadChange, inboxRefreshKey = 0, initialFilter = 'pending' }) {
    const [questions, setQuestions] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [tabCounts, setTabCounts] = useState(EMPTY_TAB_COUNTS);
    const [filter, setFilter] = useState(initialFilter == null ? 'pending' : initialFilter);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [answeringId, setAnsweringId] = useState(null);
    const [answerDrafts, setAnswerDrafts] = useState({});
    const [submittingId, setSubmittingId] = useState(null);
    const [profileStatus, setProfileStatus] = useState('pending');
    const [activeChatId, setActiveChatId] = useState(null);
    const [activeChatPartner, setActiveChatPartner] = useState('');
    const [aiInsertText, setAiInsertText] = useState('');

    useEffect(() => {
        setFilter(initialFilter == null ? 'pending' : initialFilter);
    }, [initialFilter]);

    const markAsRead = useCallback(
        async (conversationId) => {
            try {
                const res = await request.patch(`/api/doctor-inbox/inbox/${conversationId}/read`);
                const nextTotal = res?.data?.data?.totalUnread ?? 0;
                const nextTabs = res?.data?.data?.tabCounts || EMPTY_TAB_COUNTS;
                setTabCounts(nextTabs);
                onUnreadChange?.(nextTotal, nextTabs);
                setQuestions((prev) =>
                    prev.map((item) =>
                        String(item._id) === String(conversationId)
                            ? { ...item, unreadCount: 0, doctorUnreadCount: 0 }
                            : item,
                    ),
                );
            } catch (error) {
                console.log('markAsRead error:', error);
            }
        },
        [onUnreadChange],
    );

    const fetchInbox = useCallback(
        async (silent = false) => {
            try {
                if (!silent) setLoading(true);
                const [inboxRes, profileRes] = await Promise.all([
                    request.get('/api/doctor-inbox/inbox', {
                        params: {
                            ...(filter ? { status: filter } : {}),
                            ...(search.trim() ? { q: search.trim() } : {}),
                        },
                    }),
                    request.get('/api/doctor/profile'),
                ]);
                setQuestions(Array.isArray(inboxRes.data?.data) ? inboxRes.data.data : []);
                setPendingCount(inboxRes.data?.pendingCount || 0);
                const nextTabCounts = inboxRes.data?.tabCounts || EMPTY_TAB_COUNTS;
                setTabCounts(nextTabCounts);
                onUnreadChange?.(inboxRes.data?.totalUnread || 0, nextTabCounts);
                setProfileStatus(profileRes?.data?.status || 'pending');
            } catch (error) {
                if (!silent) {
                    toast.error(error?.response?.data?.message || 'Không thể tải hộp thư câu hỏi');
                }
                setQuestions([]);
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [filter, search, onUnreadChange],
    );

    useEffect(() => {
        fetchInbox();
    }, [fetchInbox, inboxRefreshKey]);

    useEffect(() => {
        if (!activeChatId || !inboxRefreshKey) return;
        markAsRead(activeChatId);
    }, [inboxRefreshKey, activeChatId, markAsRead]);

    useEffect(() => {
        const handler = (event) => {
            if (event?.detail?.text) {
                setAiInsertText(event.detail.text);
            }
        };
        window.addEventListener('doctor-ai-insert', handler);
        return () => window.removeEventListener('doctor-ai-insert', handler);
    }, []);

    useEffect(() => {
        if (!aiInsertText || !answeringId) return;
        setAnswerDrafts((prev) => ({
            ...prev,
            [answeringId]: `${prev[answeringId] || ''}${prev[answeringId] ? '\n\n' : ''}${aiInsertText}`,
        }));
        setAiInsertText('');
        toast.info('Đã chèn nội dung AI vào khung trả lời. Hãy kiểm tra trước khi gửi.');
    }, [aiInsertText, answeringId]);

    const openConversation = async (item) => {
        setActiveChatId(item._id);
        setActiveChatPartner(item.askerName || item.asker?.fullname || 'Khách hàng');
        if ((item.unreadCount || 0) > 0) {
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
            const res = await request.put(`/api/doctor-inbox/inbox/${id}/answer`, {
                answer,
                usedAiAssist: answer.includes('[AI]'),
            });
            toast.success(res?.data?.message || 'Đã gửi câu trả lời');
            setAnsweringId(null);
            await fetchInbox(true);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Gửi câu trả lời thất bại');
        } finally {
            setSubmittingId(null);
        }
    };

    const startAnswer = async (item) => {
        setAnsweringId(item._id);
        setAnswerDrafts({
            ...answerDrafts,
            [item._id]: answerDrafts[item._id] || '',
        });
        if ((item.unreadCount || 0) > 0) {
            await markAsRead(item._id);
        }
    };

    if (loading && !questions.length) {
        return <div className={cx('doctorPage')}>Đang tải câu hỏi...</div>;
    }

    const canAnswer = profileStatus === 'approved';

    return (
        <div className={cx('doctorPage')}>
            <h2 className={cx('pageTitle')}>Câu hỏi từ khách hàng</h2>
            <p className={cx('pageDesc')}>
                Xem và trả lời câu hỏi từ khách hàng / nhân viên chuyển tiếp.
                {pendingCount > 0 ? ` (${pendingCount} câu chờ trả lời)` : ''}
            </p>

            {!canAnswer ? (
                <div className={cx('statusCard', 'statusPending')}>
                    Chỉ bác sĩ đã được duyệt chứng chỉ mới trả lời câu hỏi khách hàng.
                </div>
            ) : null}

            <div className={cx('searchRow')}>
                <input
                    className={cx('searchInput')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo tên khách, mã, nội dung, chuyên khoa..."
                />
                <button type="button" className={cx('secondaryBtn')} onClick={() => fetchInbox()}>
                    Tìm kiếm
                </button>
            </div>

            <div className={cx('inboxFilters')}>
                {FILTERS.map((item) => (
                    <button
                        key={item.key || 'all'}
                        type="button"
                        className={cx('filterBtn', { active: filter === item.key })}
                        onClick={() => setFilter(item.key)}
                    >
                        {item.label}
                        <span className={cx('filterBadge')}>{tabCounts?.[item.countKey] || 0}</span>
                    </button>
                ))}
            </div>

            <div className={cx('qaList')}>
                {questions.length ? (
                    questions.map((item) => (
                        <div
                            key={item._id}
                            className={cx('qaItem', {
                                hasUnread: (item.unreadCount || 0) > 0,
                                urgentItem: item.priority === 'urgent',
                            })}
                        >
                            <div className={cx('inboxMeta')}>
                                <span className={cx('askerBadge')}>{item.askerRoleLabel || 'Khách'}</span>
                                <strong>{item.askerName || item.asker?.fullname || 'Người hỏi'}</strong>
                                {(item.unreadCount || 0) > 0 ? (
                                    <span className={cx('askerBadge', 'unreadBadge')}>
                                        {item.unreadCount} tin mới
                                    </span>
                                ) : null}
                                {item.isEscalated || item.escalatedToDoctor ? (
                                    <span className={cx('askerBadge', 'escalated')}>Chuyển từ nhân viên</span>
                                ) : null}
                                {item.priority === 'urgent' ? (
                                    <span className={cx('askerBadge', 'urgentBadge')}>Khẩn cấp</span>
                                ) : null}
                                <span className={cx('askerBadge')}>
                                    {item.workflowStatusLabel || item.workflowStatus || item.status}
                                </span>
                                <span className={cx('qaMeta')}>
                                    {item.updatedAt || item.createdAt
                                        ? new Date(item.updatedAt || item.createdAt).toLocaleString('vi-VN')
                                        : ''}
                                </span>
                            </div>

                            <p className={cx('qaQuestion')}>
                                <strong>{item.title || 'Câu hỏi'}:</strong> {item.question}
                            </p>
                            {item.specialty ? <p className={cx('qaMeta')}>Chuyên khoa: {item.specialty}</p> : null}
                            {item.escalatedByName ? (
                                <p className={cx('qaMeta')}>NV chuyển: {item.escalatedByName}</p>
                            ) : null}
                            {item.responseDeadline ? (
                                <p className={cx('qaMeta')}>
                                    Hạn phản hồi: {new Date(item.responseDeadline).toLocaleString('vi-VN')}
                                </p>
                            ) : null}
                            {item.escalationNote ? (
                                <p className={cx('escalationNote')}>Lý do chuyển: {item.escalationNote}</p>
                            ) : null}
                            {item.lastMessage ? (
                                <p className={cx('qaMeta')}>
                                    Tin gần nhất ({item.lastMessageSenderRole || '—'}): {item.lastMessage}
                                </p>
                            ) : null}

                            {item.isEscalated ||
                            item.escalatedToDoctor ||
                            item.status === 'answered' ||
                            item.needsReply ||
                            item.workflowStatus === 'DOCTOR_REVIEWING' ||
                            item.workflowStatus === 'ASSIGNED_TO_DOCTOR' ? (
                                <div className={cx('qaAnswer')}>
                                    <div className={cx('actions')} style={{ marginTop: 12 }}>
                                        <button
                                            type="button"
                                            className={cx('primaryBtn')}
                                            onClick={() => openConversation(item)}
                                        >
                                            {(item.unreadCount || 0) > 0 || item.needsReply
                                                ? 'Mở & trả lời'
                                                : 'Mở cuộc trò chuyện'}
                                        </button>
                                    </div>
                                </div>
                            ) : canAnswer && !item.isEscalated && !item.escalatedToDoctor ? (
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
                                                    onClick={() => openConversation(item)}
                                                >
                                                    Mở chat đầy đủ
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
                                                onClick={() => startAnswer(item)}
                                            >
                                                Trả lời nhanh
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
                            ) : (
                                <div className={cx('actions')} style={{ marginTop: 12 }}>
                                    <button
                                        type="button"
                                        className={cx('secondaryBtn')}
                                        onClick={() => openConversation(item)}
                                    >
                                        Xem chi tiết
                                    </button>
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
                    enableDoctorActions
                    initialDraft={aiInsertText}
                    onClose={() => {
                        setActiveChatId(null);
                        setActiveChatPartner('');
                        setAiInsertText('');
                        fetchInbox(true);
                    }}
                    onUpdated={() => fetchInbox(true)}
                />
            ) : null}
        </div>
    );
}

export default DoctorInbox;
