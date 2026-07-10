import { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../Styles/InboxChat.module.scss';
import request from '../Config/api';
import { toast } from 'react-toastify';
import { useStore } from '../hooks/useStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faArrowLeft, faUserDoctor } from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

function InboxChatPanel({ conversationId, onClose, onUpdated, title, inline = false, backLabel = 'Quay lại' }) {
    const { dataUser } = useStore();
    const [conversation, setConversation] = useState(null);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showEscalateForm, setShowEscalateForm] = useState(false);
    const [escalateNote, setEscalateNote] = useState('');
    const [escalating, setEscalating] = useState(false);
    const messagesEndRef = useRef(null);

    const fetchConversation = useCallback(async (silent = false) => {
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
    }, [conversationId]);

    useEffect(() => {
        fetchConversation();
        const timer = setInterval(() => fetchConversation(true), 5000);
        return () => clearInterval(timer);
    }, [fetchConversation]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation?.messages]);

    const handleSend = async (e) => {
        e.preventDefault();

        if (!message.trim() || sending || !conversation?.canSend) return;

        try {
            setSending(true);
            await request.post(`/api/doctor-inbox/conversation/${conversationId}/messages`, {
                message: message.trim(),
            });
            setMessage('');
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

    const isMine = (msg) => String(msg.senderId) === String(dataUser?._id);

    const isSystemMessage = (msg) =>
        msg.messageType === 'system' || msg.messageType === 'escalation' || msg.senderRole === 'system';

    const getSenderLabel = (msg) => {
        if (isSystemMessage(msg)) return 'Hệ thống';
        if (msg.senderRole === 'doctor') return `Bác sĩ ${msg.senderName || ''}`.trim();
        if (msg.senderRole === 'staff') return `Nhân viên ${msg.senderName || ''}`.trim();
        return msg.senderName || 'Khách hàng';
    };

    const partnerName =
        title || conversation?.partnerName || (conversation?.targetRole === 'staff' ? 'Nhân viên' : 'Bác sĩ');

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
                        {conversation?.escalatedToDoctor
                            ? 'Cả khách hàng, nhân viên và bác sĩ đều thấy cuộc chat này'
                            : conversation?.myRole === 'asker'
                              ? 'Bạn đang chat trực tiếp'
                              : 'Phản hồi khách hàng'}
                    </span>
                </div>
            </div>

            {conversation?.escalatedToDoctor ? (
                <div className={cx('escalationBanner')}>
                    <FontAwesomeIcon icon={faUserDoctor} />
                    <span>
                        Đã chuyển cho bác sĩ
                        {conversation.assignedDoctorName ? `: ${conversation.assignedDoctorName}` : ' — chờ bác sĩ phản hồi'}
                    </span>
                </div>
            ) : null}

            <div className={cx('messages')}>
                {loading ? (
                    <p className={cx('empty')}>Đang tải tin nhắn...</p>
                ) : conversation?.messages?.length ? (
                    conversation.messages.map((msg, index) =>
                        isSystemMessage(msg) ? (
                            <div key={`${msg.createdAt}-${index}`} className={cx('systemMessage')}>
                                <p>{msg.text}</p>
                                <span className={cx('time')}>
                                    {msg.createdAt ? new Date(msg.createdAt).toLocaleString('vi-VN') : ''}
                                </span>
                            </div>
                        ) : (
                            <div
                                key={`${msg.createdAt}-${index}`}
                                className={cx('messageRow', { mine: isMine(msg) })}
                            >
                                <div className={cx('bubble')}>
                                    {!isMine(msg) ? (
                                        <span className={cx('sender')}>{getSenderLabel(msg)}</span>
                                    ) : null}
                                    <p>{msg.text}</p>
                                    <span className={cx('time')}>
                                        {msg.createdAt
                                            ? new Date(msg.createdAt).toLocaleString('vi-VN')
                                            : ''}
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
                            <textarea
                                rows={3}
                                value={escalateNote}
                                onChange={(e) => setEscalateNote(e.target.value)}
                                placeholder="Mô tả triệu chứng / lý do chuyển bác sĩ..."
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

            {conversation?.canSend ? (
                <form className={cx('inputForm')} onSubmit={handleSend}>
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Nhập tin nhắn..."
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
