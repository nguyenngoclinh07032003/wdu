import { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../Styles/CustomerSupport.module.scss';
import { toast } from 'react-toastify';
import {
    fetchCustomerNotifications,
    markAllCustomerNotificationsRead,
    markCustomerNotificationRead,
} from '../../services/customerSupportService';

const cx = classNames.bind(styles);

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '');

function CustomerNotifications({ onOpenSupportRequest, onUnreadCountChange }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetchCustomerNotifications();
            setNotifications(Array.isArray(res?.data) ? res.data : []);
            onUnreadCountChange?.(res?.unreadCount || 0);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể tải thông báo');
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, [onUnreadCountChange]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const handleOpenNotification = async (item) => {
        try {
            if (!item.isRead) {
                await markCustomerNotificationRead(item._id);
            }
            onOpenSupportRequest?.(item.supportRequestId);
            await loadNotifications();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể mở thông báo');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllCustomerNotificationsRead();
            toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
            await loadNotifications();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể cập nhật thông báo');
        }
    };

    if (loading) {
        return <div className={cx('emptyBox')}>Đang tải thông báo...</div>;
    }

    return (
        <div className={cx('customerPage')}>
            <div className={cx('pageHeader')}>
                <div>
                    <h2 className={cx('pageTitle')}>Thông báo</h2>
                    <p className={cx('pageDesc')}>Cập nhật tiến độ xử lý yêu cầu hỗ trợ từ Mộc Xoa.</p>
                </div>
                {notifications.some((item) => !item.isRead) ? (
                    <button type="button" className={cx('btnSecondary')} onClick={handleMarkAllRead}>
                        Đánh dấu tất cả đã đọc
                    </button>
                ) : null}
            </div>

            <div className={cx('list')}>
                {notifications.length ? (
                    notifications.map((item) => (
                        <button
                            type="button"
                            key={item._id}
                            className={cx('notificationItem', { unread: !item.isRead })}
                            onClick={() => handleOpenNotification(item)}
                        >
                            <h3 className={cx('notificationTitle')}>{item.title}</h3>
                            <p className={cx('notificationMessage')}>{item.message}</p>
                            <div className={cx('notificationMeta')}>
                                Mã {item.requestCode}
                                {item.staffName ? ` · ${item.staffName}` : ''}
                                {item.statusLabel ? ` · ${item.statusLabel}` : ''} ·{' '}
                                {formatDateTime(item.receivedAt || item.createdAt)}
                            </div>
                        </button>
                    ))
                ) : (
                    <div className={cx('emptyBox')}>Chưa có thông báo nào.</div>
                )}
            </div>
        </div>
    );
}

export default CustomerNotifications;
