import { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../Styles/InboxChat.module.scss';
import request from '../Config/api';
import { toast } from 'react-toastify';
import { useStore } from '../hooks/useStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faArrowLeft, faUserDoctor } from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

const REJECT_OPTIONS = [
    { code: 'OUT_OF_SPECIALTY', label: 'Không đúng chuyên khoa' },
    { code: 'INSUFFICIENT_INFORMATION', label: 'Nội dung không đủ thông tin' },
    { code: 'NEED_OFFLINE_EXAMINATION', label: 'Cần khám trực tiếp' },
    { code: 'INAPPROPRIATE_CONTENT', label: 'Nội dung không phù hợp' },
    { code: 'DOCTOR_UNAVAILABLE', label: 'Bác sĩ không thể tiếp nhận' },
];

const REQUEST_INFO_PRESETS = [
    'Vui lòng cho biết thời gian xuất hiện triệu chứng.',
    'Có đang sử dụng thuốc nào không?',
    'Có tiền sử dị ứng không?',
    'Vui lòng gửi ảnh rõ hơn.',
    'Vui lòng gửi kết quả xét nghiệm.',
];

function InboxChatPanel({
    conversationId,
    onClose,
    onUpdated,
    title,
    inline = false,
    backLabel = 'Quay lại',
    enableDoctorActions = false,
    initialDraft = '',
}) {
    const { dataUser } = useStore();
    const [conversation, setConversation] = useState(null);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showEscalateForm, setShowEscalateForm] = useState(false);
    const [escalateNote, setEscalateNote] = useState('');
    const [escalateDoctorId, setEscalateDoctorId] = useState('');
    const [escalatePriority, setEscalatePriority] = useState('normal');
    const [escalateDeadline, setEscalateDeadline] = useState('');
    const [doctors, setDoctors] = useState([]);
    const [escalating, setEscalating] = useState(false);
    const [internalMode, setInternalMode] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);
    const [showRequestInfo, setShowRequestInfo] = useState(false);
    const [requestInfoText, setRequestInfoText] = useState(REQUEST_INFO_PRESETS[0]);
    const [showReject, setShowReject] = useState(false);
    const [rejectCode, setRejectCode] = useState('OUT_OF_SPECIALTY');
    const [rejectNote, setRejectNote] = useState('');
    const [usedAiAssist, setUsedAiAssist] = useState(false);
    const messagesEndRef = useRef(null);

    const fetchConversation = useCallback(
        async (silent = false) => {
            try {
                if (!silent) setLoading(true);
                const res = await request.get(`/api/doctor-inbox/conversation/${conversationId}`);
                setConversation(res.data?.data || null);
            } catch (error) {
                if (!silent) {
                    toast.error(error?.response?.data?.message || 'Không thể tải cuộc trò chuyện');
                }
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [conversationId],
    );

    useEffect(() => {
        fetchConversation();
        const timer = setInterval(() => fetchConversation(true), 5000);
        return () => clearInterval(timer);
    }, [fetchConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation?.messages]);

    useEffect(() => {
        if (initialDraft) {
            setMessage((prev) => (prev ? `${prev}\n\n${initialDraft}` : initialDraft));
            setUsedAiAssist(true);
        }
    }, [initialDraft]);

    useEffect(() => {
        if (!showEscalateForm) return;
        const loadDoctors = async () => {
            try {
                const res = await request.get('/api/doctor-inbox/approved-doctors');
                setDoctors(Array.isArray(res.data?.data) ? res.data.data : []);
            } catch (error) {
                console.log(error);
            }
        };
        loadDoctors();
    }, [showEscalateForm]);

    const handleSend = async (e) => {
        e.preventDefault();

        if (!message.trim() || sending) return;
        if (!internalMode && !conversation?.canSend) return;

        try {
            setSending(true);
            await request.post(`/api/doctor-inbox/conversation/${conversationId}/messages`, {
                message: message.trim(),
                isInternal: internalMode,
                usedAiAssist: usedAiAssist && !internalMode,
            });
            setMessage('');
            setUsedAiAssist(false);
            await fetchConversation(true);
            onUpdated?.();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Gửi tin nhắn thất bại');
        } finally {
            setSending(false);
        }
    };

    const handleEscalate = async () => {
        try {
            setEscalating(true);
            const res = await request.post(`/api/staff-inbox/inbox/${conversationId}/escalate`, {
                note: escalateNote.trim(),
                doctorId: escalateDoctorId || undefined,
                priority: escalatePriority,
                deadline: escalateDeadline || undefined,
            });
            toast.success(res?.data?.message || 'Đã chuyển cho bác sĩ');
            setShowEscalateForm(false);
            setEscalateNote('');
            await fetchConversation(true);
            onUpdated?.();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Chuyển cho bác sĩ thất bại');
        } finally {
            setEscalating(false);
        }
    };

    const runDoctorAction = async (fn, successMsg) => {
        try {
            setActionBusy(true);
            const res = await fn();
            toast.success(res?.data?.message || successMsg);
            await fetchConversation(true);
            onUpdated?.();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Thao tác thất bại');
        } finally {
            setActionBusy(false);
        }
    };

    const isMine = (msg) => String(msg.senderId) === String(dataUser?._id);

    const isSystemMessage = (msg) =>
        msg.messageType === 'system' ||
        msg.messageType === 'escalation' ||
        msg.messageType === 'request_info' ||
        msg.senderRole === 'system';

    const isInternalMessage = (msg) => msg.isInternal || msg.messageType === 'internal';

    const getSenderLabel = (msg) => {
        if (isInternalMessage(msg)) return `Ghi chú nội bộ · ${msg.senderName || msg.senderRole}`;
        if (isSystemMessage(msg)) return 'Hệ thống';
        if (msg.senderRole === 'doctor') return `Bác sĩ ${msg.senderName || ''}`.trim();
        if (msg.senderRole === 'staff') return `Nhân viên ${msg.senderName || ''}`.trim();
        return msg.senderName || 'Khách hàng';
    };

    const partnerName =
        title || conversation?.partnerName || (conversation?.targetRole === 'staff' ? 'Nhân viên' : 'Bác sĩ');

    const showDoctorTools = enableDoctorActions && conversation?.myRole === 'doctor';

    const panelContent = (
        <div className={cx('panel', { inlinePanel: inline })} onClick={(e) => e.stopPropagation()}>
            {inline ? (
                <button type="button" className={cx('inlineBackBar')} onClick={onClose} aria-label={backLabel}>
                    <FontAwesomeIcon icon={faArrowLeft} />
                    <span>Quay lại: {backLabel}</span>
                </button>
            ) : null}

            <div className={cx('header', { inlineHeader: inline })}>
                {!inline ? (
                    <button type="button" className={cx('backBtn')} onClick={onClose} aria-label={backLabel}>
                        <FontAwesomeIcon icon={faArrowLeft} />
                        <span>{backLabel}</span>
                    </button>
                ) : null}

                <div className={cx('headerContent')}>
                    <h3>
                        {conversation?.escalatedToDoctor
                            ? 'Hội thoại chuyển tiếp (Khách - NV - BS)'
                            : `Trò chuyện với ${partnerName}`}
                    </h3>
                    <span>
                        {conversation?.workflowStatusLabel || conversation?.workflowStatus || ''}
                        {conversation?.specialty ? ` · ${conversation.specialty}` : ''}
                        {conversation?.priority === 'urgent' ? ' · Khẩn cấp' : ''}
                    </span>
                </div>
            </div>

            {conversation?.escalatedToDoctor ? (
                <div className={cx('escalationBanner')}>
                    <FontAwesomeIcon icon={faUserDoctor} />
                    <span>
                        Đã chuyển cho bác sĩ
                        {conversation.assignedDoctorName
                            ? `: ${conversation.assignedDoctorName}`
                            : ' — chờ bác sĩ phản hồi'}
                        {conversation.firstViewedByDoctorAt || conversation.doctorLastReadAt
                            ? ' · Bác sĩ đã xem'
                            : ''}
                    </span>
                </div>
            ) : null}

            {showDoctorTools ? (
                <div className={cx('doctorActions')}>
                    <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => setShowRequestInfo((v) => !v)}
                    >
                        Yêu cầu bổ sung
                    </button>
                    <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() =>
                            runDoctorAction(
                                () => request.post(`/api/doctor-inbox/inbox/${conversationId}/urgent`),
                                'Đã đánh dấu khẩn cấp',
                            )
                        }
                    >
                        Đánh dấu khẩn cấp
                    </button>
                    <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => {
                            const note = window.prompt('Ghi chú chuyển lại nhân viên:');
                            if (note === null) return;
                            runDoctorAction(
                                () =>
                                    request.post(`/api/doctor-inbox/inbox/${conversationId}/transfer-back`, {
                                        note,
                                    }),
                                'Đã chuyển lại NV',
                            );
                        }}
                    >
                        Chuyển lại NV
                    </button>
                    <button type="button" disabled={actionBusy} onClick={() => setShowReject((v) => !v)}>
                        Từ chối
                    </button>
                    <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() =>
                            runDoctorAction(
                                () => request.post(`/api/doctor-inbox/inbox/${conversationId}/close`),
                                'Đã đóng hội thoại',
                            )
                        }
                    >
                        Đóng
                    </button>
                    <button type="button" disabled={actionBusy} onClick={() => setInternalMode((v) => !v)}>
                        {internalMode ? 'Đang ghi chú nội bộ' : 'Ghi chú nội bộ'}
                    </button>
                </div>
            ) : null}

            {showRequestInfo ? (
                <div className={cx('escalateBox')}>
                    <select value={requestInfoText} onChange={(e) => setRequestInfoText(e.target.value)}>
                        {REQUEST_INFO_PRESETS.map((preset) => (
                            <option key={preset} value={preset}>
                                {preset}
                            </option>
                        ))}
                    </select>
                    <textarea
                        rows={2}
                        value={requestInfoText}
                        onChange={(e) => setRequestInfoText(e.target.value)}
                    />
                    <div className={cx('escalateActions')}>
                        <button
                            type="button"
                            className={cx('escalateBtn')}
                            disabled={actionBusy}
                            onClick={() =>
                                runDoctorAction(
                                    () =>
                                        request.post(`/api/doctor-inbox/inbox/${conversationId}/request-info`, {
                                            message: requestInfoText,
                                        }),
                                    'Đã gửi yêu cầu bổ sung',
                                ).then(() => setShowRequestInfo(false))
                            }
                        >
                            Gửi yêu cầu
                        </button>
                        <button type="button" className={cx('cancelBtn')} onClick={() => setShowRequestInfo(false)}>
                            Hủy
                        </button>
                    </div>
                </div>
            ) : null}

            {showReject ? (
                <div className={cx('escalateBox')}>
                    <select value={rejectCode} onChange={(e) => setRejectCode(e.target.value)}>
                        {REJECT_OPTIONS.map((opt) => (
                            <option key={opt.code} value={opt.code}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <textarea
                        rows={2}
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Ghi chú thêm (tuỳ chọn)"
                    />
                    <div className={cx('escalateActions')}>
                        <button
                            type="button"
                            className={cx('escalateBtn')}
                            disabled={actionBusy}
                            onClick={() =>
                                runDoctorAction(
                                    () =>
                                        request.post(`/api/doctor-inbox/inbox/${conversationId}/reject`, {
                                            reasonCode: rejectCode,
                                            note: rejectNote,
                                        }),
                                    'Đã từ chối',
                                ).then(() => setShowReject(false))
                            }
                        >
                            Xác nhận từ chối
                        </button>
                        <button type="button" className={cx('cancelBtn')} onClick={() => setShowReject(false)}>
                            Hủy
                        </button>
                    </div>
                </div>
            ) : null}

            <div className={cx('messages')}>
                {loading ? (
                    <p className={cx('empty')}>Đang tải tin nhắn...</p>
                ) : conversation?.messages?.length ? (
                    conversation.messages.map((msg, index) =>
                        isSystemMessage(msg) && !isInternalMessage(msg) ? (
                            <div key={`${msg.createdAt}-${index}`} className={cx('systemMessage')}>
                                <p>{msg.text}</p>
                                <span className={cx('time')}>
                                    {msg.createdAt ? new Date(msg.createdAt).toLocaleString('vi-VN') : ''}
                                </span>
                            </div>
                        ) : (
                            <div
                                key={`${msg.createdAt}-${index}`}
                                className={cx('messageRow', {
                                    mine: isMine(msg),
                                    internal: isInternalMessage(msg),
                                })}
                            >
                                <div className={cx('bubble', { internalBubble: isInternalMessage(msg) })}>
                                    <span className={cx('sender')}>{getSenderLabel(msg)}</span>
                                    <p>{msg.text}</p>
                                    {msg.usedAiAssist ? <span className={cx('aiTag')}>Có hỗ trợ AI</span> : null}
                                    <span className={cx('time')}>
                                        {msg.createdAt ? new Date(msg.createdAt).toLocaleString('vi-VN') : ''}
                                    </span>
                                </div>
                            </div>
                        ),
                    )
                ) : (
                    <p className={cx('empty')}>Chưa có tin nhắn.</p>
                )}
                <div ref={messagesEndRef} />
            </div>

            {conversation?.canEscalate ? (
                <div className={cx('escalateBox')}>
                    {showEscalateForm ? (
                        <>
                            <select
                                value={escalateDoctorId}
                                onChange={(e) => setEscalateDoctorId(e.target.value)}
                            >
                                <option value="">Chọn bác sĩ (tuỳ chọn)</option>
                                {doctors.map((doc) => (
                                    <option key={doc.doctorId} value={doc.doctorId}>
                                        {doc.fullname}
                                        {doc.specialty ? ` — ${doc.specialty}` : ''}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={escalatePriority}
                                onChange={(e) => setEscalatePriority(e.target.value)}
                            >
                                <option value="normal">Ưu tiên thường</option>
                                <option value="high">Ưu tiên cao</option>
                                <option value="urgent">Khẩn cấp</option>
                            </select>
                            <input
                                type="datetime-local"
                                value={escalateDeadline}
                                onChange={(e) => setEscalateDeadline(e.target.value)}
                            />
                            <textarea
                                rows={3}
                                value={escalateNote}
                                onChange={(e) => setEscalateNote(e.target.value)}
                                placeholder="Ghi chú nội bộ / lý do chuyển bác sĩ..."
                                disabled={escalating}
                            />
                            <div className={cx('escalateActions')}>
                                <button
                                    type="button"
                                    className={cx('escalateBtn')}
                                    onClick={handleEscalate}
                                    disabled={escalating}
                                >
                                    {escalating ? 'Đang chuyển...' : 'Xác nhận chuyển bác sĩ'}
                                </button>
                                <button
                                    type="button"
                                    className={cx('cancelBtn')}
                                    onClick={() => setShowEscalateForm(false)}
                                    disabled={escalating}
                                >
                                    Hủy
                                </button>
                            </div>
                        </>
                    ) : (
                        <button
                            type="button"
                            className={cx('escalateBtn')}
                            onClick={() => setShowEscalateForm(true)}
                        >
                            <FontAwesomeIcon icon={faUserDoctor} />
                            Chuyển cuộc trò chuyện cho bác sĩ
                        </button>
                    )}
                </div>
            ) : null}

            {conversation?.canSend || (showDoctorTools && internalMode) ? (
                <form className={cx('inputForm')} onSubmit={handleSend}>
                    {internalMode ? (
                        <span className={cx('internalHint')}>Ghi chú nội bộ (khách không thấy)</span>
                    ) : null}
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={internalMode ? 'Nhập ghi chú nội bộ...' : 'Nhập tin nhắn...'}
                        disabled={sending}
                    />
                    <button type="submit" disabled={sending || !message.trim()}>
                        <FontAwesomeIcon icon={faPaperPlane} />
                    </button>
                </form>
            ) : (
                <div className={cx('locked')}>Cuộc trò chuyện chưa sẵn sàng để gửi tin nhắn.</div>
            )}
        </div>
    );

    if (inline) {
        return panelContent;
    }

    return (
        <div className={cx('overlay')} onClick={onClose}>
            {panelContent}
        </div>
    );
}

export default InboxChatPanel;
