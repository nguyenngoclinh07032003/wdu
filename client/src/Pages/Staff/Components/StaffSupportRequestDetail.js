import { useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../../Styles/StaffSupportRequests.module.scss';
import { toast } from 'react-toastify';
import request from '../../../Config/api';
import {
    acceptSupportRequest,
    addSupportRequestNote,
    addSupportRequestReply,
    assignSupportRequest,
    fetchSupportRequestDetail,
    fetchSupportStaffUsers,
    updateSupportRequestStatus,
} from '../../../services/supportRequestService';
import { SUPPORT_STATUS_LABELS, SUPPORT_STATUS_OPTIONS } from '../../../constants/supportRequestStatus';

const cx = classNames.bind(styles);

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '');

const buildReplyTimeline = (detail) => {
    if (!detail) return [];

    const timeline = [
        {
            id: 'customer-initial',
            senderRole: 'customer',
            senderName: detail.fullName || 'Khách hàng',
            message: detail.message,
            createdAt: detail.createdAt,
        },
    ];

    if (Array.isArray(detail.replyHistory) && detail.replyHistory.length) {
        detail.replyHistory.forEach((item, index) => {
            timeline.push({
                id: `reply-${index}`,
                senderRole: item.senderRole || 'staff',
                senderName: item.senderName || 'Nhân viên',
                message: item.message,
                createdAt: item.createdAt,
            });
        });
    } else if (detail.staffReply) {
        timeline.push({
            id: 'legacy-reply',
            senderRole: 'staff',
            senderName: detail.staffReplyByName || 'Nhân viên',
            message: detail.staffReply,
            createdAt: detail.staffReplyAt,
        });
    }

    return timeline;
};

const buildHistoryTimeline = (detail) => {
    if (!detail?.statusHistory?.length) return [];

    return detail.statusHistory
        .slice()
        .reverse()
        .map((item, index) => ({
            id: `history-${index}`,
            action: item.action || 'status_change',
            previousStatus: item.previousStatus,
            status: item.status,
            note: item.note,
            updatedByName: item.updatedByName || 'Hệ thống',
            createdAt: item.createdAt,
        }));
};

function StaffSupportRequestDetail({ requestId, onBack, onUpdated }) {
    const [detail, setDetail] = useState(null);
    const [currentStaff, setCurrentStaff] = useState(null);
    const [staffUsers, setStaffUsers] = useState([]);
    const [assignStaffId, setAssignStaffId] = useState('');
    const [statusValue, setStatusValue] = useState('pending');
    const [statusNote, setStatusNote] = useState('');
    const [noteText, setNoteText] = useState('');
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [lightboxImage, setLightboxImage] = useState('');
    const autoAcceptAttemptedRef = useRef(false);

    const currentStaffId = currentStaff?.id || currentStaff?._id || '';

    const loadDetail = async () => {
        try {
            setLoading(true);
            const res = await fetchSupportRequestDetail(requestId);
            const data = res?.data || null;
            setDetail(data);
            setStatusValue(data?.status || 'pending');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể tải chi tiết yêu cầu');
            setDetail(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const bootstrap = async () => {
            try {
                const [authRes, staffRes] = await Promise.all([
                    request.get('/api/auth'),
                    fetchSupportStaffUsers(),
                ]);
                setCurrentStaff(authRes?.data?.user || authRes?.data || null);
                setStaffUsers(Array.isArray(staffRes?.data) ? staffRes.data : []);
            } catch (error) {
                console.log(error);
            }
        };

        bootstrap();
        autoAcceptAttemptedRef.current = false;
        loadDetail();
    }, [requestId]);

    useEffect(() => {
        if (!detail || !currentStaffId || loading) return;

        const assignedTo = detail.assignedTo ? String(detail.assignedTo) : '';
        const isTakenByOther = assignedTo && assignedTo !== String(currentStaffId);

        if (detail.status !== 'pending' || isTakenByOther || autoAcceptAttemptedRef.current) {
            return;
        }

        autoAcceptAttemptedRef.current = true;

        const autoAccept = async () => {
            try {
                setSubmitting(true);
                const res = await acceptSupportRequest(requestId);
                toast.success(res?.message || 'Đã tiếp nhận yêu cầu');
                await loadDetail();
                onUpdated?.();
            } catch (error) {
                if (error?.response?.status !== 409) {
                    toast.error(error?.response?.data?.message || 'Không thể tiếp nhận yêu cầu');
                }
                autoAcceptAttemptedRef.current = false;
            } finally {
                setSubmitting(false);
            }
        };

        autoAccept();
    }, [detail, currentStaffId, loading, onUpdated, requestId]);

    const refreshAll = async () => {
        await loadDetail();
        onUpdated?.();
    };

    const isAssignedToCurrent = useMemo(() => {
        if (!detail?.assignedTo || !currentStaffId) return false;
        return String(detail.assignedTo) === String(currentStaffId);
    }, [detail, currentStaffId]);

    const isAssignedToOther = useMemo(() => {
        if (!detail?.assignedTo || !currentStaffId) return Boolean(detail?.assignedTo);
        return String(detail.assignedTo) !== String(currentStaffId);
    }, [detail, currentStaffId]);

    const canAccept = detail?.status === 'pending' && !isAssignedToOther;
    const replyTimeline = useMemo(() => buildReplyTimeline(detail), [detail]);
    const historyTimeline = useMemo(() => buildHistoryTimeline(detail), [detail]);

    const handleAccept = async () => {
        try {
            setSubmitting(true);
            const res = await acceptSupportRequest(requestId);
            toast.success(res?.message || 'Đã tiếp nhận yêu cầu');
            await refreshAll();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể tiếp nhận yêu cầu');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAssign = async () => {
        if (!assignStaffId) {
            toast.error('Vui lòng chọn nhân viên phân công');
            return;
        }

        try {
            setSubmitting(true);
            const res = await assignSupportRequest(requestId, assignStaffId);
            toast.success(res?.message || 'Đã phân công yêu cầu');
            await refreshAll();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể phân công yêu cầu');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async () => {
        try {
            setSubmitting(true);
            const res = await updateSupportRequestStatus(requestId, {
                status: statusValue,
                note: statusNote,
            });
            toast.success(res?.message || 'Đã cập nhật trạng thái');
            setStatusNote('');
            await refreshAll();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể cập nhật trạng thái');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddNote = async () => {
        if (!noteText.trim()) {
            toast.error('Vui lòng nhập ghi chú');
            return;
        }

        try {
            setSubmitting(true);
            const res = await addSupportRequestNote(requestId, noteText.trim());
            toast.success(res?.message || 'Đã thêm ghi chú');
            setNoteText('');
            await refreshAll();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể thêm ghi chú');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddReply = async () => {
        if (!replyText.trim()) {
            toast.error('Vui lòng nhập nội dung phản hồi');
            return;
        }

        try {
            setSubmitting(true);
            const res = await addSupportRequestReply(requestId, replyText.trim());
            toast.success(res?.message || 'Đã gửi phản hồi');
            setReplyText('');
            await refreshAll();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể gửi phản hồi');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className={cx('page')}>Đang tải chi tiết yêu cầu...</div>;
    }

    if (!detail) {
        return (
            <div className={cx('page')}>
                <div className={cx('emptyCard')}>Không tìm thấy yêu cầu hỗ trợ.</div>
                <button type="button" className={cx('btnGhost')} onClick={onBack}>
                    Quay lại danh sách
                </button>
            </div>
        );
    }

    const imageSrc = detail.imageData
        ? `data:image/jpeg;base64,${detail.imageData}`
        : '';

    return (
        <div className={cx('detailPage')}>
            <section className={cx('detailHeader')}>
                <div className={cx('detailHeaderMain')}>
                    <h2 className={cx('detailCode')}>{detail.requestCode}</h2>
                    <div className={cx('detailMetaRow')}>
                        <span className={cx('statusBadge', `status_${detail.status}`)}>
                            {SUPPORT_STATUS_LABELS[detail.status]}
                        </span>
                        <span>Gửi lúc: {formatDateTime(detail.createdAt)}</span>
                        <span className={cx('detailAssignee')}>
                            Phụ trách: {detail.assignedToName || 'Chưa phân công'}
                        </span>
                    </div>
                    {isAssignedToCurrent && detail.status !== 'pending' ? (
                        <span className={cx('handlingBadge')}>Đang do bạn xử lý</span>
                    ) : null}
                    {isAssignedToOther ? (
                        <span className={cx('handlingBadge')} style={{ background: '#fff4d6', color: '#9a6700' }}>
                            Đang do {detail.assignedToName} xử lý
                        </span>
                    ) : null}
                </div>

                <div className={cx('detailActions')}>
                    <button type="button" className={cx('btnGhost')} onClick={onBack}>
                        Quay lại danh sách
                    </button>
                    {canAccept ? (
                        <button
                            type="button"
                            className={cx('btnPrimary')}
                            onClick={handleAccept}
                            disabled={submitting}
                        >
                            Nhận xử lý
                        </button>
                    ) : null}
                </div>
            </section>

            <div className={cx('detailLayout')}>
                <div className={cx('leftColumn')}>
                    <section className={cx('card')}>
                        <h3 className={cx('cardTitle')}>Thông tin yêu cầu</h3>
                        <div className={cx('infoRow')}>
                            <span className={cx('infoLabel')}>Loại hỗ trợ</span>
                            <span className={cx('infoValue')}>{detail.supportTypeLabel}</span>
                        </div>
                        {detail.orderCode ? (
                            <div className={cx('infoRow')}>
                                <span className={cx('infoLabel')}>Mã đơn hàng</span>
                                <span className={cx('infoValue')}>{detail.orderCode}</span>
                            </div>
                        ) : null}
                        <div className={cx('infoRow')}>
                            <span className={cx('infoLabel')}>Nội dung chi tiết</span>
                            <div className={cx('messageBox')}>{detail.message}</div>
                        </div>
                        {imageSrc ? (
                            <div className={cx('infoRow')}>
                                <span className={cx('infoLabel')}>Hình ảnh đính kèm</span>
                                <img
                                    src={imageSrc}
                                    alt={detail.imageName || 'Đính kèm'}
                                    className={cx('imageThumb')}
                                    onClick={() => setLightboxImage(imageSrc)}
                                />
                            </div>
                        ) : null}
                    </section>

                    <section className={cx('card')}>
                        <h3 className={cx('cardTitle')}>Phân công và trạng thái</h3>
                        <div className={cx('formGroup')}>
                            <label>Phân công nhân viên</label>
                            <div className={cx('formRow')}>
                                <select value={assignStaffId} onChange={(e) => setAssignStaffId(e.target.value)}>
                                    <option value="">Chọn nhân viên</option>
                                    {staffUsers.map((staff) => (
                                        <option key={staff._id} value={staff._id}>
                                            {staff.fullname || staff.email}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className={cx('btnSecondary')}
                                    onClick={handleAssign}
                                    disabled={submitting}
                                >
                                    Phân công
                                </button>
                            </div>
                        </div>

                        <div className={cx('formGroup')}>
                            <label>Cập nhật trạng thái</label>
                            <select value={statusValue} onChange={(e) => setStatusValue(e.target.value)}>
                                {SUPPORT_STATUS_OPTIONS.map((item) => (
                                    <option key={item.value} value={item.value}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Lý do hoặc ghi chú khi đổi trạng thái"
                                value={statusNote}
                                onChange={(e) => setStatusNote(e.target.value)}
                            />
                            <button
                                type="button"
                                className={cx('btnSecondary')}
                                onClick={handleUpdateStatus}
                                disabled={submitting}
                            >
                                Cập nhật trạng thái
                            </button>
                        </div>
                    </section>

                    <section className={cx('card')}>
                        <h3 className={cx('cardTitle')}>Ghi chú nội bộ</h3>
                        <div className={cx('formGroup')}>
                            <textarea
                                rows={3}
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Thêm ghi chú xử lý nội bộ..."
                            />
                            <button
                                type="button"
                                className={cx('btnSecondary')}
                                onClick={handleAddNote}
                                disabled={submitting}
                            >
                                Thêm ghi chú
                            </button>
                        </div>

                        {detail.staffNotes?.length ? (
                            <div className={cx('noteList')}>
                                {detail.staffNotes
                                    .slice()
                                    .reverse()
                                    .map((note, index) => (
                                        <article className={cx('noteItem')} key={index}>
                                            <p className={cx('noteText')}>{note.text}</p>
                                            <div className={cx('noteMeta')}>
                                                {note.createdByName || 'Nhân viên'} · {formatDateTime(note.createdAt)}
                                            </div>
                                        </article>
                                    ))}
                            </div>
                        ) : (
                            <p className={cx('noteMeta')}>Chưa có ghi chú nội bộ.</p>
                        )}
                    </section>

                    <section className={cx('card')}>
                        <h3 className={cx('cardTitle')}>Phản hồi khách hàng</h3>
                        <div className={cx('formGroup')}>
                            <textarea
                                rows={4}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Nhập nội dung phản hồi gửi cho khách hàng..."
                            />
                            <button
                                type="button"
                                className={cx('btnPrimary')}
                                onClick={handleAddReply}
                                disabled={submitting}
                            >
                                Gửi phản hồi
                            </button>
                        </div>

                        <div className={cx('replyList')}>
                            {replyTimeline.map((item) => (
                                <article
                                    className={cx('replyItem', {
                                        replyItemStaff: item.senderRole === 'staff',
                                        replyItemCustomer: item.senderRole === 'customer',
                                    })}
                                    key={item.id}
                                >
                                    <p className={cx('replyText')}>{item.message}</p>
                                    <div className={cx('replyMeta')}>
                                        {item.senderRole === 'staff' ? 'Nhân viên' : 'Khách hàng'} ·{' '}
                                        {item.senderName} · {formatDateTime(item.createdAt)}
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </div>

                <div className={cx('rightColumn')}>
                    <section className={cx('card')}>
                        <h3 className={cx('cardTitle')}>Thông tin khách hàng</h3>
                        <div className={cx('infoRow')}>
                            <span className={cx('infoLabel')}>Họ và tên</span>
                            <span className={cx('infoValue')}>{detail.fullName}</span>
                        </div>
                        <div className={cx('infoRow')}>
                            <span className={cx('infoLabel')}>Số điện thoại</span>
                            <span className={cx('infoValue')}>{detail.phone}</span>
                        </div>
                        <div className={cx('infoRow')}>
                            <span className={cx('infoLabel')}>Email</span>
                            <span className={cx('infoValue')}>{detail.email || 'Không cung cấp'}</span>
                        </div>
                        <div className={cx('customerActions')}>
                            <a href={`tel:${detail.phone}`} className={cx('btnSecondary')}>
                                Gọi điện
                            </a>
                            {detail.email ? (
                                <a href={`mailto:${detail.email}`} className={cx('btnSecondary')}>
                                    Gửi email
                                </a>
                            ) : null}
                        </div>
                    </section>

                    <section className={cx('card')}>
                        <h3 className={cx('cardTitle')}>Lịch sử xử lý</h3>
                        {historyTimeline.length ? (
                            <div className={cx('historyList')}>
                                {historyTimeline.map((item) => (
                                    <article className={cx('historyItem')} key={item.id}>
                                        <div className={cx('historyChange')}>
                                            {item.previousStatus
                                                ? `${SUPPORT_STATUS_LABELS[item.previousStatus] || item.previousStatus} → ${
                                                      SUPPORT_STATUS_LABELS[item.status] || item.status
                                                  }`
                                                : SUPPORT_STATUS_LABELS[item.status] || item.status}
                                        </div>
                                        {item.note ? <p className={cx('historyText')}>{item.note}</p> : null}
                                        <div className={cx('historyMeta')}>
                                            {item.updatedByName} · {formatDateTime(item.createdAt)}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <p className={cx('historyMeta')}>Chưa có lịch sử xử lý.</p>
                        )}
                    </section>
                </div>
            </div>

            {lightboxImage ? (
                <div className={cx('lightbox')} onClick={() => setLightboxImage('')}>
                    <button
                        type="button"
                        className={cx('lightboxClose')}
                        onClick={() => setLightboxImage('')}
                    >
                        ×
                    </button>
                    <img
                        src={lightboxImage}
                        alt="Xem ảnh lớn"
                        className={cx('lightboxImage')}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            ) : null}
        </div>
    );
}

export default StaffSupportRequestDetail;
