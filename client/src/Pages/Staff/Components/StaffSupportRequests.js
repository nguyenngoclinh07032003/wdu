import { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../../Styles/StaffSupportRequests.module.scss';
import { toast } from 'react-toastify';
import { fetchSupportRequests } from '../../../services/supportRequestService';
import { SUPPORT_STATUS_LABELS } from '../../../constants/supportRequestStatus';
import StaffSupportRequestDetail from './StaffSupportRequestDetail';

const cx = classNames.bind(styles);

function StaffSupportRequests({ onPendingCountChange }) {
    const [requests, setRequests] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [filter, setFilter] = useState('unprocessed');
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);

    const loadList = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchSupportRequests(filter ? { status: filter } : {});
            setRequests(Array.isArray(res?.data) ? res.data : []);
            setPendingCount(res?.pendingCount || 0);
            onPendingCountChange?.(res?.pendingCount || 0);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể tải yêu cầu hỗ trợ');
            setRequests([]);
        } finally {
            setLoading(false);
        }
    }, [filter, onPendingCountChange]);

    useEffect(() => {
        loadList();
    }, [loadList]);

    if (selectedId) {
        return (
            <StaffSupportRequestDetail
                requestId={selectedId}
                onBack={() => {
                    setSelectedId(null);
                    loadList();
                }}
                onUpdated={loadList}
            />
        );
    }

    if (loading && !requests.length) {
        return <div className={cx('page')}>Đang tải yêu cầu hỗ trợ...</div>;
    }

    return (
        <div className={cx('page')}>
            <h2 className={cx('pageTitle')}>Yêu cầu hỗ trợ</h2>
            <p className={cx('pageDesc')}>
                Tiếp nhận và xử lý yêu cầu từ trang Liên hệ.
                {pendingCount > 0 ? ` (${pendingCount} yêu cầu chờ tiếp nhận)` : ''}
            </p>

            <div className={cx('filters')}>
                <button
                    type="button"
                    className={cx('filterBtn', { active: filter === 'unprocessed' })}
                    onClick={() => setFilter('unprocessed')}
                >
                    Chưa xử lý
                </button>
                <button
                    type="button"
                    className={cx('filterBtn', { active: filter === 'in_progress' })}
                    onClick={() => setFilter('in_progress')}
                >
                    Đang xử lý
                </button>
                <button
                    type="button"
                    className={cx('filterBtn', { active: filter === 'resolved' })}
                    onClick={() => setFilter('resolved')}
                >
                    Đã giải quyết
                </button>
                <button
                    type="button"
                    className={cx('filterBtn', { active: filter === '' })}
                    onClick={() => setFilter('')}
                >
                    Tất cả
                </button>
            </div>

            <div className={cx('listGrid')}>
                {requests.length ? (
                    requests.map((item) => (
                        <button
                            type="button"
                            key={item._id}
                            className={cx('listCard')}
                            onClick={() => setSelectedId(item._id)}
                        >
                            <div className={cx('listCardTop')}>
                                <span className={cx('listCode')}>{item.requestCode}</span>
                                <span className={cx('statusBadge', `status_${item.status}`)}>
                                    {SUPPORT_STATUS_LABELS[item.status] || item.status}
                                </span>
                            </div>
                            <div className={cx('listMeta')}>
                                {item.createdAt
                                    ? new Date(item.createdAt).toLocaleString('vi-VN')
                                    : ''}
                                {item.assignedToName ? ` · ${item.assignedToName}` : ''}
                            </div>
                            <div className={cx('listCustomer')}>
                                {item.fullName} · {item.phone}
                            </div>
                            <div className={cx('listType')}>{item.supportTypeLabel}</div>
                            <p className={cx('listMessage')}>{item.message}</p>
                        </button>
                    ))
                ) : (
                    <div className={cx('emptyCard')}>Không có yêu cầu hỗ trợ nào.</div>
                )}
            </div>
        </div>
    );
}

export default StaffSupportRequests;
