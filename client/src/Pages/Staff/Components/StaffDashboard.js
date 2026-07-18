import { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../../Styles/StaffPortal.module.scss';
import request from '../../../Config/api';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBoxOpen,
    faComments,
    faUserDoctor,
    faTruck,
    faHeadset,
    faFileExport,
    faRotate,
    faShieldHalved,
    faUser,
    faUserGear,
    faStar,
    faCheck,
    faBell,
    faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons';
import { getOrderStatusInfo } from '../../../utils/orderStatus';

const cx = classNames.bind(styles);

function formatMoney(value) {
    return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

function formatRelativeTime(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    const now = new Date();
    const diffMin = Math.floor((now - date) / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const sameDay =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
    if (sameDay) {
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('vi-VN');
}

function StaffDashboard({ onNavigate, refreshKey = 0, notifCount = 0 }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [search, setSearch] = useState('');

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await request.get('/api/staff/dashboard');
            setData(res.data || null);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể tải dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard, refreshKey]);

    if (loading && !data) {
        return <div className={cx('empty')}>Đang tải bảng điều khiển...</div>;
    }

    const stats = data?.statistics || {};
    const shipping = data?.shippingStats || {};
    const keyword = search.trim().toLowerCase();

    const filteredQuestions = (data?.recentQuestions || []).filter((item) => {
        if (!keyword) return true;
        return [item.askerName, item.lastMessage, item.question, item.sourceLabel]
            .join(' ')
            .toLowerCase()
            .includes(keyword);
    });

    const filteredOrders = (data?.recentOrders || []).filter((item) => {
        if (!keyword) return true;
        return [item.orderCode, item.productName, item.status]
            .join(' ')
            .toLowerCase()
            .includes(keyword);
    });

    const filteredDoctors = (data?.doctors || []).filter((item) => {
        if (!keyword) return true;
        return [item.fullname, item.specialty, item.statusLabel]
            .join(' ')
            .toLowerCase()
            .includes(keyword);
    });

    const filteredShippers = (data?.shippers || []).filter((item) => {
        if (!keyword) return true;
        return [item.fullname, item.statusLabel].join(' ').toLowerCase().includes(keyword);
    });

    const activityIcon = (type) => {
        if (type === 'escalate') return faUserDoctor;
        if (type === 'answer') return faCheck;
        return faComments;
    };

    return (
        <div className={cx('dashWrap')}>
            <div className={cx('dashTopBar')}>
                <div className={cx('dashSearch')}>
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm đơn, khách hàng, bác sĩ, shipper..."
                    />
                </div>
                <div className={cx('dashTopActions')}>
                    <button
                        type="button"
                        className={cx('outlineBtn')}
                        onClick={() => {
                            try {
                                const rows = [
                                    ['Loại', 'Mã/Tên', 'Chi tiết', 'Trạng thái', 'Thời gian'],
                                    ...(data?.recentOrders || []).map((o) => [
                                        'Đơn hàng',
                                        o.orderCode,
                                        o.customerName,
                                        o.status,
                                        o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '',
                                    ]),
                                    ...(data?.recentQuestions || []).map((q) => [
                                        'Câu hỏi',
                                        q.askerName || '',
                                        (q.lastMessage || q.question || '').slice(0, 80),
                                        q.sourceLabel || '',
                                        q.updatedAt ? new Date(q.updatedAt).toLocaleString('vi-VN') : '',
                                    ]),
                                    ...(data?.recentSupports || []).map((s) => [
                                        'Hỗ trợ',
                                        s.code,
                                        s.title,
                                        s.status,
                                        s.updatedAt ? new Date(s.updatedAt).toLocaleString('vi-VN') : '',
                                    ]),
                                ];
                                const csv = rows
                                    .map((r) =>
                                        r
                                            .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
                                            .join(','),
                                    )
                                    .join('\n');
                                const blob = new Blob(['\uFEFF' + csv], {
                                    type: 'text/csv;charset=utf-8;',
                                });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `staff-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
                                a.click();
                                URL.revokeObjectURL(url);
                                toast.success('Đã xuất báo cáo CSV từ dữ liệu thực');
                            } catch (error) {
                                toast.error('Không thể xuất báo cáo');
                            }
                        }}
                    >
                        <FontAwesomeIcon icon={faFileExport} />
                        Xuất báo cáo
                    </button>
                    <button type="button" className={cx('greenBtn')} onClick={fetchDashboard}>
                        <FontAwesomeIcon icon={faRotate} />
                        Làm mới
                    </button>
                    <button
                        type="button"
                        className={cx('bellBtn')}
                        onClick={() => onNavigate?.(5, 'pending')}
                        aria-label="Thông báo"
                    >
                        <FontAwesomeIcon icon={faBell} />
                        {notifCount > 0 ? (
                            <span className={cx('bellBadge')}>{notifCount > 9 ? '9+' : notifCount}</span>
                        ) : null}
                    </button>
                </div>
            </div>

            <div className={cx('dashTitleBlock')}>
                <h1>Bảng điều khiển nhân viên</h1>
                <p>Theo dõi vận hành, điều phối bác sĩ / shipper và hỗ trợ khách hàng kịp thời.</p>
            </div>

            <div className={cx('statsRow5')}>
                {[
                    {
                        key: 'orders',
                        label: 'Đơn hàng mới',
                        value: stats.newOrders ?? 0,
                        delta: stats.newOrdersChange,
                        icon: faBoxOpen,
                        tone: 'green',
                        tab: 2,
                    },
                    {
                        key: 'questions',
                        label: 'Câu hỏi chờ xử lý',
                        value: stats.pendingQuestions ?? 0,
                        delta: stats.pendingQuestionsChange,
                        icon: faComments,
                        tone: 'orange',
                        tab: 5,
                        filter: 'pending',
                    },
                    {
                        key: 'transfer',
                        label: 'Đã chuyển bác sĩ',
                        value: stats.transferredToDoctors ?? 0,
                        delta: stats.transferredToDoctorsChange,
                        icon: faUserDoctor,
                        tone: 'blue',
                        tab: 5,
                        filter: 'escalated',
                    },
                    {
                        key: 'ship',
                        label: 'Đơn giao hàng',
                        value: stats.shippingOrders ?? 0,
                        delta: stats.shippingOrdersChange,
                        icon: faTruck,
                        tone: 'purple',
                        tab: 4,
                    },
                    {
                        key: 'support',
                        label: 'Yêu cầu hỗ trợ',
                        value: stats.supportRequests ?? 0,
                        delta: stats.supportRequestsChange,
                        icon: faHeadset,
                        tone: 'red',
                        tab: 6,
                    },
                    {
                        key: 'internal',
                        label: 'Thông báo nội bộ',
                        value: stats.internalNotifications ?? stats.totalStaffUnread ?? 0,
                        delta: stats.internalNotificationsChange,
                        icon: faBell,
                        tone: 'orange',
                        tab: 5,
                        filter: 'pending',
                    },
                ].map((card) => (
                    <button
                        type="button"
                        key={card.key}
                        className={cx('metricCard')}
                        onClick={() => onNavigate?.(card.tab, card.filter)}
                    >
                        <div className={cx('metricTop')}>
                            <span className={cx('metricLabel')}>{card.label}</span>
                            <span className={cx('metricIcon', card.tone)}>
                                <FontAwesomeIcon icon={card.icon} />
                            </span>
                        </div>
                        <strong className={cx('metricValue')}>{card.value}</strong>
                        {card.delta != null ? (
                            <span className={cx('metricDelta')}>
                                {card.delta >= 0 ? '↑' : '↓'} {Math.abs(card.delta)}% so với hôm qua
                            </span>
                        ) : (
                            <span className={cx('metricDelta')} style={{ color: '#8a9688' }}>
                                Dữ liệu thực tế
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className={cx('grid3')}>
                <section className={cx('card')}>
                    <div className={cx('cardHead')}>
                        <h3>Tổng quan luồng xử lý</h3>
                    </div>
                    <div className={cx('flowMap')}>
                        <div className={cx('flowNode', 'user')}>
                            <div className={cx('flowIcon')}>
                                <FontAwesomeIcon icon={faUser} />
                            </div>
                            <strong>Khách hàng / User</strong>
                            <ul>
                                <li>Gửi câu hỏi</li>
                                <li>Tạo đơn hàng</li>
                                <li>Theo dõi dịch vụ</li>
                            </ul>
                        </div>
                        <div className={cx('flowNode', 'doctor')}>
                            <div className={cx('flowIcon')}>
                                <FontAwesomeIcon icon={faUserDoctor} />
                            </div>
                            <strong>Bác sĩ / Doctor</strong>
                            <ul>
                                <li>Tư vấn chuyên môn</li>
                                <li>Trả lời câu hỏi</li>
                                <li>Ghi chú nội bộ</li>
                            </ul>
                        </div>

                        <div className={cx('flowCenter')}>
                            <div className={cx('flowHub')}>
                                <FontAwesomeIcon icon={faUserGear} />
                                <strong>Nhân viên</strong>
                                <span>Tiếp nhận · Phân loại · Điều phối</span>
                            </div>
                        </div>

                        <div className={cx('flowNode', 'shipper')}>
                            <div className={cx('flowIcon')}>
                                <FontAwesomeIcon icon={faTruck} />
                            </div>
                            <strong>Shipper</strong>
                            <ul>
                                <li>Nhận đơn</li>
                                <li>Giao hàng</li>
                                <li>Cập nhật trạng thái</li>
                            </ul>
                        </div>
                        <div className={cx('flowNode', 'admin')}>
                            <div className={cx('flowIcon')}>
                                <FontAwesomeIcon icon={faShieldHalved} />
                            </div>
                            <strong>Admin</strong>
                            <ul>
                                <li>Duyệt</li>
                                <li>Giám sát</li>
                                <li>Báo cáo</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className={cx('card')}>
                    <div className={cx('cardHead')}>
                        <h3>Câu hỏi khách hàng mới</h3>
                        <button type="button" className={cx('textLink')} onClick={() => onNavigate?.(5)}>
                            Xem tất cả
                        </button>
                    </div>
                    <div className={cx('qList')}>
                        {(filteredQuestions || []).length ? (
                            filteredQuestions.map((item) => (
                                <button
                                    type="button"
                                    key={item._id}
                                    className={cx('qRow')}
                                    onClick={() => onNavigate?.(5)}
                                >
                                    <div className={cx('qAvatar')}>
                                        {(item.askerName || 'K').charAt(0).toUpperCase()}
                                    </div>
                                    <div className={cx('qInfo')}>
                                        <div className={cx('qTop')}>
                                            <strong>{item.askerName || 'Khách hàng'}</strong>
                                            <span>{formatRelativeTime(item.updatedAt || item.createdAt)}</span>
                                        </div>
                                        <p>{item.lastMessage || item.question}</p>
                                        <div className={cx('qTags')}>
                                            <span
                                                className={cx('tag', {
                                                    green: item.sourceLabel === 'Khách hàng',
                                                    purple: item.sourceLabel !== 'Khách hàng',
                                                })}
                                            >
                                                {item.sourceLabel}
                                            </span>
                                            {(item.staffUnread || 0) > 0 ? (
                                                <span className={cx('tag', 'red')}>
                                                    {item.staffUnread} tin mới
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className={cx('empty')}>Chưa có câu hỏi mới.</div>
                        )}
                    </div>
                </section>

                <section className={cx('card')}>
                    <div className={cx('cardHead')}>
                        <h3>Điều phối bác sĩ</h3>
                        <button type="button" className={cx('textLink')} onClick={() => onNavigate?.(5, 'escalated')}>
                            Xem tất cả
                        </button>
                    </div>
                    <div className={cx('tableWrap')}>
                        <table className={cx('niceTable')}>
                            <thead>
                                <tr>
                                    <th>Bác sĩ</th>
                                    <th>Chuyên khoa</th>
                                    <th>Trạng thái</th>
                                    <th>Đang phụ trách</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(filteredDoctors || []).length ? (
                                    filteredDoctors.map((doc) => (
                                        <tr key={doc.doctorId}>
                                            <td>
                                                <div className={cx('docCell')}>
                                                    <span className={cx('docAvatar')}>
                                                        {(doc.fullname || 'B').charAt(0)}
                                                    </span>
                                                    <strong>BS. {doc.fullname}</strong>
                                                </div>
                                            </td>
                                            <td>{doc.specialty}</td>
                                            <td>
                                                <span
                                                    className={cx('statusChip', {
                                                        free: doc.status !== 'busy',
                                                        busy: doc.status === 'busy',
                                                    })}
                                                >
                                                    <i />
                                                    {doc.statusLabel}
                                                </span>
                                            </td>
                                            <td>
                                                <strong>{doc.activeCases}</strong>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4}>
                                            <div className={cx('empty')}>Chưa có bác sĩ đã duyệt.</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <div className={cx('grid3')}>
                <section className={cx('card')}>
                    <div className={cx('cardHead')}>
                        <h3>Quản lý Shipping</h3>
                        <button type="button" className={cx('textLink')} onClick={() => onNavigate?.(4)}>
                            Xem tất cả
                        </button>
                    </div>
                    <div className={cx('shipBoxes')}>
                        <div className={cx('shipBox', 'warn')}>
                            <strong>{shipping.waitingPickup ?? 0}</strong>
                            <span>Chờ lấy hàng</span>
                        </div>
                        <div className={cx('shipBox', 'info')}>
                            <strong>{shipping.shipping ?? 0}</strong>
                            <span>Đang giao</span>
                        </div>
                        <div className={cx('shipBox', 'ok')}>
                            <strong>{shipping.delivered ?? 0}</strong>
                            <span>Giao thành công</span>
                        </div>
                        <div className={cx('shipBox', 'danger')}>
                            <strong>{shipping.failed ?? 0}</strong>
                            <span>Giao thất bại</span>
                        </div>
                    </div>
                    <h4 className={cx('subTitle')}>Shipper đang hoạt động</h4>
                    <div className={cx('shipperList')}>
                        {(filteredShippers || []).slice(0, 4).map((s) => (
                            <div key={s.shipperId} className={cx('shipperRow')}>
                                <div>
                                    <strong>{s.fullname}</strong>
                                    <div className={cx('stars')}>
                                        {s.rating != null ? (
                                            <>
                                                <FontAwesomeIcon icon={faStar} />
                                                <span>{Number(s.rating).toFixed(1)}</span>
                                            </>
                                        ) : (
                                            <span style={{ color: '#8a9688' }}>Chưa có đánh giá</span>
                                        )}
                                    </div>
                                </div>
                                <span
                                    className={cx('shipTag', {
                                        shipping: s.status === 'shipping',
                                        rest: s.status === 'idle',
                                    })}
                                >
                                    {s.statusLabel}
                                </span>
                                <strong>{s.activeOrders} đơn</strong>
                            </div>
                        ))}
                        {!(filteredShippers || []).length ? (
                            <div className={cx('empty')}>Chưa có shipper.</div>
                        ) : null}
                    </div>
                </section>

                <section className={cx('card')}>
                    <div className={cx('cardHead')}>
                        <h3>Đơn hàng & sản phẩm</h3>
                        <button type="button" className={cx('textLink')} onClick={() => onNavigate?.(2)}>
                            Xem tất cả
                        </button>
                    </div>
                    <div className={cx('tableWrap')}>
                        <table className={cx('niceTable')}>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Sản phẩm</th>
                                    <th>Giá</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(filteredOrders || []).map((o) => (
                                    <tr key={o._id}>
                                        <td>{o.orderCode}</td>
                                        <td>{o.productName}</td>
                                        <td>{formatMoney(o.total)}</td>
                                        <td>
                                            <span
                                                className={cx(
                                                    'orderBadge',
                                                    getOrderStatusInfo(o).className || o.status,
                                                )}
                                            >
                                                {getOrderStatusInfo(o).text}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {!(filteredOrders || []).length ? (
                                    <tr>
                                        <td colSpan={4}>
                                            <div className={cx('empty')}>Chưa có đơn hàng.</div>
                                        </td>
                                    </tr>
                                ) : null}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className={cx('card')}>
                    <div className={cx('cardHead')}>
                        <h3>Hoạt động gần đây</h3>
                    </div>
                    <div className={cx('timeline')}>
                        {(data?.recentActivities || []).length ? (
                            data.recentActivities.map((act, index) => (
                                <div key={`${act.at}-${index}`} className={cx('timelineItem')}>
                                    <span className={cx('timelineIcon', act.type || 'default')}>
                                        <FontAwesomeIcon icon={activityIcon(act.type)} />
                                    </span>
                                    <div>
                                        <p>{act.text}</p>
                                        <span>
                                            {act.actor} · {formatRelativeTime(act.at)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={cx('empty')}>Chưa có hoạt động.</div>
                        )}
                    </div>
                </section>
            </div>

            <div className={cx('grid3')}>
                <section className={cx('card')}>
                    <div className={cx('cardHead')}>
                        <h3>Yêu cầu hỗ trợ</h3>
                        <button type="button" className={cx('textLink')} onClick={() => onNavigate?.(6)}>
                            Xem tất cả
                        </button>
                    </div>
                    <div className={cx('tableWrap')}>
                        <table className={cx('niceTable')}>
                            <thead>
                                <tr>
                                    <th>Mã</th>
                                    <th>Người gửi</th>
                                    <th>Vấn đề</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.recentSupports || []).length ? (
                                    data.recentSupports.map((s) => (
                                        <tr key={s._id}>
                                            <td>{s.code}</td>
                                            <td>{s.sender}</td>
                                            <td>{s.title}</td>
                                            <td>
                                                <span className={cx('orderBadge', s.status)}>{s.status}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4}>
                                            <div className={cx('empty')}>Chưa có yêu cầu hỗ trợ.</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className={cx('card')}>
                    <div className={cx('cardHead')}>
                        <h3>Tiến độ xử lý</h3>
                    </div>
                    <div className={cx('progressList')}>
                        {(data?.progressBreakdown || []).map((item) => {
                            const total = (data?.progressBreakdown || []).reduce(
                                (sum, x) => sum + (x.value || 0),
                                0,
                            );
                            const pct = total ? Math.round(((item.value || 0) / total) * 100) : 0;
                            return (
                                <div key={item.key} className={cx('progressRow')}>
                                    <div className={cx('progressMeta')}>
                                        <strong>{item.label}</strong>
                                        <span>
                                            {item.value} ({pct}%)
                                        </span>
                                    </div>
                                    <div className={cx('progressTrack')}>
                                        <i style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                        {!(data?.progressBreakdown || []).length ? (
                            <div className={cx('empty')}>Chưa có dữ liệu tiến độ.</div>
                        ) : null}
                    </div>
                </section>

                <section className={cx('card')}>
                    <div className={cx('cardHead')}>
                        <h3>Quy trình phối hợp</h3>
                    </div>
                    <div className={cx('processSteps')}>
                        {[
                            'Khách gửi yêu cầu',
                            'Nhân viên tiếp nhận',
                            'Phân loại',
                            'Chuyển BS / Shipper',
                            'Hoàn tất & phản hồi',
                        ].map((step, idx) => (
                            <div key={step} className={cx('processStep')}>
                                <span>{idx + 1}</span>
                                <strong>{step}</strong>
                            </div>
                        ))}
                    </div>
                    <p className={cx('processNote')}>
                        Cập nhật lúc{' '}
                        {data?.updatedAt
                            ? new Date(data.updatedAt).toLocaleString('vi-VN')
                            : '—'}
                        . Dữ liệu realtime từ hệ thống.
                    </p>
                </section>
            </div>

            <div className={cx('sloganBanner')}>
                <FontAwesomeIcon icon={faShieldHalved} />
                <div>
                    <strong>Phối hợp nhịp nhàng – Hỗ trợ kịp thời – Chăm sóc tận tâm</strong>
                    <p>Nhân viên là trung tâm kết nối khách hàng, bác sĩ, shipper và admin.</p>
                </div>
            </div>
        </div>
    );
}

export default StaffDashboard;
