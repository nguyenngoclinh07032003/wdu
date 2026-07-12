import { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../Styles/CustomerSupport.module.scss';
import { toast } from 'react-toastify';
import {
    fetchMySupportRequestDetail,
    fetchMySupportRequests,
} from '../../services/customerSupportService';
import { SUPPORT_STATUS_LABELS } from '../../constants/supportRequestStatus';

const cx = classNames.bind(styles);

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '');

function MySupportRequests({ initialRequestId, onSelectRequest }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(initialRequestId || null);
    const [detail, setDetail] = useState(null);

    const loadList = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchMySupportRequests();
            setRequests(Array.isArray(res?.data) ? res.data : []);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể tải yêu cầu hỗ trợ');
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadDetail = useCallback(async (id) => {
        try {
            const res = await fetchMySupportRequestDetail(id);
            setDetail(res?.data || null);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể tải chi tiết yêu cầu');
            setDetail(null);
        }
    }, []);

    useEffect(() => {
        loadList();
    }, [loadList]);

    useEffect(() => {
        if (selectedId) {
            loadDetail(selectedId);
            onSelectRequest?.(selectedId);
        } else {
            setDetail(null);
        }
    }, [selectedId, loadDetail, onSelectRequest]);

    useEffect(() => {
        if (initialRequestId) {
            setSelectedId(initialRequestId);
        }
    }, [initialRequestId]);

    if (loading) {
        return <div className={cx('emptyBox')}>Đang tải yêu cầu hỗ trợ...</div>;
    }

    return (
        <div className={cx('customerPage')}>
            <div className={cx('pageHeader')}>
                <div>
                    <h2 className={cx('pageTitle')}>Yêu cầu hỗ trợ của tôi</h2>
                    <p className={cx('pageDesc')}>Theo dõi tiến độ xử lý các yêu cầu bạn đã gửi từ trang Liên hệ.</p>
                </div>
                {selectedId ? (
                    <button type="button" className={cx('btnGhost')} onClick={() => setSelectedId(null)}>
                        Quay lại danh sách
                    </button>
                ) : null}
            </div>

            {!selectedId ? (
                <div className={cx('list')}>
                    {requests.length ? (
                        requests.map((item) => (
                            <button
                                type="button"
                                key={item._id}
                                className={cx('listItem')}
                                onClick={() => setSelectedId(item._id)}
                            >
                                <div className={cx('listTop')}>
                                    <span className={cx('code')}>{item.requestCode}</span>
                                    <span className={cx('statusBadge', `status_${item.status}`)}>
                                        {SUPPORT_STATUS_LABELS[item.status] || item.status}
                                    </span>
                                </div>
                                <div className={cx('meta')}>
                                    {formatDateTime(item.createdAt)}
                                    {item.assignedToName ? ` · ${item.assignedToName}` : ''}
                                </div>
                                <p className={cx('message')}>{item.supportTypeLabel}</p>
                                <p className={cx('message')}>{item.message}</p>
                            </button>
                        ))
                    ) : (
                        <div className={cx('emptyBox')}>Bạn chưa có yêu cầu hỗ trợ nào.</div>
                    )}
                </div>
            ) : detail ? (
                <div className={cx('card')}>
                    <div className={cx('listTop')}>
                        <span className={cx('code')}>{detail.requestCode}</span>
                        <span className={cx('statusBadge', `status_${detail.status}`)}>
                            {SUPPORT_STATUS_LABELS[detail.status] || detail.status}
                        </span>
                    </div>

                    <div className={cx('detailGrid')} style={{ marginTop: 16 }}>
                        <div className={cx('infoItem')}>
                            <span className={cx('infoLabel')}>Loại hỗ trợ</span>
                            <span className={cx('infoValue')}>{detail.supportTypeLabel}</span>
                        </div>
                        <div className={cx('infoItem')}>
                            <span className={cx('infoLabel')}>Nhân viên phụ trách</span>
                            <span className={cx('infoValue')}>{detail.assignedToName || 'Chưa phân công'}</span>
                        </div>
                        <div className={cx('infoItem')}>
                            <span className={cx('infoLabel')}>Thời gian gửi</span>
                            <span className={cx('infoValue')}>{formatDateTime(detail.createdAt)}</span>
                        </div>
                        <div className={cx('infoItem')}>
                            <span className={cx('infoLabel')}>Thời gian tiếp nhận</span>
                            <span className={cx('infoValue')}>{formatDateTime(detail.receivedAt) || 'Chưa tiếp nhận'}</span>
                        </div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <span className={cx('infoLabel')}>Nội dung yêu cầu</span>
                        <div className={cx('messageBox')}>{detail.message}</div>
                    </div>

                    <div style={{ marginTop: 18 }}>
                        <h3 className={cx('pageTitle')} style={{ fontSize: 18 }}>
                            Trao đổi với Mộc Xoa
                        </h3>
                        <div className={cx('timeline')}>
                            {(detail.replyTimeline || []).map((item) => (
                                <article
                                    key={item.id}
                                    className={cx('timelineItem', {
                                        timelineStaff: item.senderRole === 'staff',
                                        timelineCustomer: item.senderRole === 'customer',
                                    })}
                                >
                                    <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{item.message}</p>
                                    <div className={cx('timelineMeta')}>
                                        {item.senderRole === 'staff' ? 'Nhân viên' : 'Bạn'} · {item.senderName} ·{' '}
                                        {formatDateTime(item.createdAt)}
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className={cx('emptyBox')}>Đang tải chi tiết...</div>
            )}
        </div>
    );
}

export default MySupportRequests;
