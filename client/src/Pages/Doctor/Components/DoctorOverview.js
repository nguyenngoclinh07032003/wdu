import { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../../Styles/DoctorPortal.module.scss';
import request from '../../../Config/api';
import { toast } from 'react-toastify';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faEnvelopeOpenText,
    faHourglassHalf,
    faCircleCheck,
    faTriangleExclamation,
    faStar,
    faClipboardList,
    faRobot,
    faLightbulb,
    faComments,
    faFileMedical,
} from '@fortawesome/free-solid-svg-icons';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const cx = classNames.bind(styles);

function formatRelativeTime(dateValue) {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const sameDay =
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
    if (sameDay) {
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()
    ) {
        return 'Hôm qua';
    }
    return date.toLocaleDateString('vi-VN');
}

function DoctorOverview({ onOpenInbox, onOpenProfile, onOpenAI, inboxRefreshKey = 0 }) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [recent, setRecent] = useState([]);
    const [activities, setActivities] = useState([]);
    const [doctorName, setDoctorName] = useState('');
    const [profile, setProfile] = useState(null);

    const fetchOverview = useCallback(async () => {
        try {
            setLoading(true);
            const [overviewRes, authRes, profileRes] = await Promise.all([
                request.get('/api/doctor-inbox/overview'),
                request.get('/api/auth'),
                request.get('/api/doctor/profile').catch(() => null),
            ]);
            setStats(overviewRes.data?.stats || null);
            setRecent(Array.isArray(overviewRes.data?.recent) ? overviewRes.data.recent : []);
            setActivities(Array.isArray(overviewRes.data?.activities) ? overviewRes.data.activities : []);
            const user = authRes?.data?.user || authRes?.data || {};
            setDoctorName(user?.fullname || user?.email || 'Bác sĩ');
            setProfile(profileRes?.data || null);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể tải tổng quan');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOverview();
    }, [fetchOverview, inboxRefreshKey]);

    const displayName = useMemo(() => {
        if (!doctorName) return 'Bác sĩ';
        return doctorName.startsWith('BS.') || doctorName.startsWith('BS ') ? doctorName : `BS. ${doctorName}`;
    }, [doctorName]);

    const profileCompletion = useMemo(() => {
        if (!profile) return 0;
        let score = 0;
        if (profile.fullname) score += 15;
        if (profile.specialty) score += 20;
        if (profile.licenseNumber) score += 20;
        if (profile.hospital) score += 15;
        if (profile.bio) score += 10;
        if (profile.certificateUrl) score += 20;
        return Math.min(100, score);
    }, [profile]);

    const chartData = useMemo(() => {
        const pending = stats?.pending || 0;
        const reviewing = stats?.reviewing || 0;
        const answered = stats?.answered || 0;
        const total = pending + reviewing + answered || 1;
        return [
            { name: 'Chờ trả lời', value: pending, color: '#f59e0b', pct: Math.round((pending / total) * 1000) / 10 },
            { name: 'Đang xử lý', value: reviewing, color: '#3b82f6', pct: Math.round((reviewing / total) * 1000) / 10 },
            { name: 'Đã trả lời', value: answered, color: '#22c55e', pct: Math.round((answered / total) * 1000) / 10 },
        ];
    }, [stats]);

    if (loading && !stats) {
        return <div className={cx('empty')}>Đang tải tổng quan...</div>;
    }

    const certApproved = profile?.status === 'approved' ? 1 : 0;
    const certPending = profile?.status === 'pending' ? 1 : 0;
    const certRejected = profile?.status === 'rejected' ? 1 : 0;

    return (
        <div>
            <section className={cx('hero')}>
                <h1 className={cx('heroTitle')}>Xin chào, {displayName}</h1>
                <p className={cx('heroDesc')}>
                    Hôm nay bạn có {stats?.pending ?? 0} câu hỏi cần phản hồi
                    {stats?.unread ? ` và ${stats.unread} tin chưa đọc` : ''}.
                </p>
            </section>

            <div className={cx('statsRow')}>
                <div className={cx('statCard')}>
                    <div className={cx('statTop')}>
                        <span className={cx('statLabel')}>Câu hỏi được giao</span>
                        <span className={cx('statIcon', 'green')}>
                            <FontAwesomeIcon icon={faClipboardList} />
                        </span>
                    </div>
                    <div className={cx('statValue')}>{stats?.assignedTotal ?? 0}</div>
                    <div className={cx('statDelta', 'up')}>Tổng hội thoại phụ trách</div>
                </div>

                <div className={cx('statCard')}>
                    <div className={cx('statTop')}>
                        <span className={cx('statLabel')}>Chưa đọc</span>
                        <span className={cx('statIcon', 'red')}>
                            <FontAwesomeIcon icon={faEnvelopeOpenText} />
                        </span>
                    </div>
                    <div className={cx('statValue')}>{stats?.unread ?? 0}</div>
                    <div className={cx('statDelta', 'alert')}>Tin nhắn chưa mở</div>
                </div>

                <div className={cx('statCard')}>
                    <div className={cx('statTop')}>
                        <span className={cx('statLabel')}>Chờ trả lời</span>
                        <span className={cx('statIcon', 'orange')}>
                            <FontAwesomeIcon icon={faHourglassHalf} />
                        </span>
                    </div>
                    <div className={cx('statValue')}>{stats?.pending ?? 0}</div>
                    <div className={cx('statDelta')}>Cần xử lý sớm</div>
                </div>

                <div className={cx('statCard')}>
                    <div className={cx('statTop')}>
                        <span className={cx('statLabel')}>Đã trả lời</span>
                        <span className={cx('statIcon', 'green')}>
                            <FontAwesomeIcon icon={faCircleCheck} />
                        </span>
                    </div>
                    <div className={cx('statValue')}>{stats?.answered ?? 0}</div>
                    <div className={cx('statDelta', 'up')}>Hoàn tất tư vấn</div>
                </div>

                <div className={cx('statCard')}>
                    <div className={cx('statTop')}>
                        <span className={cx('statLabel')}>Khẩn cấp</span>
                        <span className={cx('statIcon', 'red')}>
                            <FontAwesomeIcon icon={faTriangleExclamation} />
                        </span>
                    </div>
                    <div className={cx('statValue')}>{stats?.urgent ?? 0}</div>
                    <div className={cx('statDelta', 'alert')}>Ưu tiên cao</div>
                </div>

                <div className={cx('statCard')}>
                    <div className={cx('statTop')}>
                        <span className={cx('statLabel')}>Đánh giá</span>
                        <span className={cx('statIcon', 'orange')}>
                            <FontAwesomeIcon icon={faStar} />
                        </span>
                    </div>
                    <div className={cx('statValue')}>
                        {stats?.avgRating != null ? `${stats.avgRating}/5` : '—'}
                    </div>
                    <div className={cx('statDelta')}>Chưa có đánh giá bác sĩ</div>
                </div>
            </div>

            <div className={cx('mainGrid')}>
                <div>
                    <div className={cx('panel')} style={{ marginBottom: 16 }}>
                        <div className={cx('panelHead')}>
                            <h3>Câu hỏi mới cần xử lý</h3>
                            <button type="button" className={cx('linkBtn')} onClick={() => onOpenInbox?.('pending')}>
                                Xem tất cả
                            </button>
                        </div>

                        <div className={cx('questionList')}>
                            {recent.length ? (
                                recent.slice(0, 4).map((item) => {
                                    const initial = (item.askerName || 'K').trim().charAt(0).toUpperCase();
                                    return (
                                        <div
                                            key={item._id}
                                            className={cx('questionItem')}
                                            onClick={() => onOpenInbox?.('pending')}
                                        >
                                            <div className={cx('qAvatar')}>{initial}</div>
                                            <div className={cx('qBody')}>
                                                <strong>{item.askerName || 'Khách hàng'}</strong>
                                                <p>{item.title || item.question || item.lastMessage}</p>
                                                <div className={cx('qMeta')}>
                                                    {item.isEscalated || item.escalatedToDoctor ? (
                                                        <span className={cx('pill', 'staff')}>
                                                            Nhân viên chuyển tiếp
                                                        </span>
                                                    ) : (
                                                        <span className={cx('pill', 'customer')}>Khách hàng</span>
                                                    )}
                                                    {(item.unreadCount || 0) > 0 ? (
                                                        <span className={cx('pill', 'new')}>
                                                            {item.unreadCount} tin mới
                                                        </span>
                                                    ) : (
                                                        <span className={cx('pill', 'new')}>Mới</span>
                                                    )}
                                                    {item.priority === 'urgent' ? (
                                                        <span className={cx('pill', 'urgent')}>Gấp</span>
                                                    ) : null}
                                                </div>
                                            </div>
                                            <span className={cx('qTime')}>
                                                {formatRelativeTime(item.updatedAt || item.createdAt)}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className={cx('empty')}>Hiện không có câu hỏi cần xử lý ngay.</div>
                            )}
                        </div>
                    </div>

                    <div className={cx('panel')}>
                        <div className={cx('panelHead')}>
                            <h3>Hoạt động gần đây</h3>
                        </div>
                        <div className={cx('activityList')}>
                            {activities.length ? (
                                activities.map((act, index) => (
                                    <div key={`${act.at}-${index}`} className={cx('activityItem')}>
                                        <span className={cx('activityDot')} />
                                        <div className={cx('activityText')}>
                                            {act.text}
                                            <span>{formatRelativeTime(act.at)}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={cx('empty')}>Chưa có hoạt động gần đây.</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={cx('rightStack')}>
                    <div className={cx('panel')}>
                        <div className={cx('panelHead')}>
                            <h3>Tiến độ xử lý câu hỏi</h3>
                        </div>
                        <div className={cx('chartWrap')}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={48}
                                        outerRadius={72}
                                        paddingAngle={2}
                                    >
                                        {chartData.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className={cx('legend')}>
                            {chartData.map((item) => (
                                <div key={item.name} className={cx('legendRow')}>
                                    <span className={cx('legendLeft')}>
                                        <span
                                            className={cx('dot', {
                                                orange: item.color === '#f59e0b',
                                                blue: item.color === '#3b82f6',
                                                green: item.color === '#22c55e',
                                            })}
                                        />
                                        {item.name}
                                    </span>
                                    <strong>
                                        {item.value} ({item.pct}%)
                                    </strong>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={cx('panel')}>
                        <div className={cx('panelHead')}>
                            <h3>Hồ sơ & Chứng chỉ</h3>
                        </div>
                        <div style={{ fontSize: 13, color: '#55634b', marginBottom: 4 }}>
                            Hoàn thiện hồ sơ: <strong>{profileCompletion}%</strong>
                        </div>
                        <div className={cx('progressBar')}>
                            <span style={{ width: `${profileCompletion}%` }} />
                        </div>
                        <div className={cx('certStats')}>
                            <div className={cx('certStat')}>
                                <strong>{certApproved}</strong>
                                <span>Đã duyệt</span>
                            </div>
                            <div className={cx('certStat')}>
                                <strong>{certPending}</strong>
                                <span>Chờ duyệt</span>
                            </div>
                            <div className={cx('certStat')}>
                                <strong>{certRejected}</strong>
                                <span>Từ chối</span>
                            </div>
                        </div>
                        <button type="button" className={cx('primaryBtn')} onClick={() => onOpenProfile?.()}>
                            Cập nhật hồ sơ
                        </button>
                    </div>

                    <div className={cx('panel')}>
                        <div className={cx('panelHead')}>
                            <h3>Hỏi đáp AI</h3>
                        </div>
                        <div className={cx('aiCards')}>
                            <button type="button" className={cx('aiCard')} onClick={() => onOpenAI?.()}>
                                <span className={cx('aiIcon')}>
                                    <FontAwesomeIcon icon={faComments} />
                                </span>
                                <div>
                                    <strong>Tóm tắt hội thoại</strong>
                                    <span>AI hỗ trợ tóm tắt nội dung tư vấn</span>
                                </div>
                            </button>
                            <button type="button" className={cx('aiCard')} onClick={() => onOpenAI?.()}>
                                <span className={cx('aiIcon')}>
                                    <FontAwesomeIcon icon={faLightbulb} />
                                </span>
                                <div>
                                    <strong>Gợi ý câu trả lời</strong>
                                    <span>Nhận draft rồi chỉnh sửa trước khi gửi</span>
                                </div>
                            </button>
                            <button type="button" className={cx('aiCard')} onClick={() => onOpenAI?.()}>
                                <span className={cx('aiIcon')}>
                                    <FontAwesomeIcon icon={faRobot} />
                                </span>
                                <div>
                                    <strong>Tạo câu hỏi bổ sung</strong>
                                    <span>Gợi ý thông tin cần hỏi thêm khách</span>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className={cx('panel')}>
                        <div className={cx('panelHead')}>
                            <h3>Thông báo</h3>
                        </div>
                        <div className={cx('notifList')}>
                            {(stats?.unread || 0) > 0 ? (
                                <div className={cx('notifItem')}>
                                    <FontAwesomeIcon icon={faEnvelopeOpenText} style={{ color: '#c62828' }} />
                                    <div>
                                        <strong>Bạn có {stats.unread} tin chưa đọc</strong>
                                        <span>Mở Câu hỏi khách hàng để xử lý</span>
                                    </div>
                                </div>
                            ) : null}
                            {(stats?.urgent || 0) > 0 ? (
                                <div className={cx('notifItem')}>
                                    <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: '#c47d0e' }} />
                                    <div>
                                        <strong>{stats.urgent} câu hỏi khẩn cấp</strong>
                                        <span>Ưu tiên phản hồi ngay</span>
                                    </div>
                                </div>
                            ) : null}
                            {profile?.status === 'pending' ? (
                                <div className={cx('notifItem')}>
                                    <FontAwesomeIcon icon={faFileMedical} style={{ color: '#2f6f3e' }} />
                                    <div>
                                        <strong>Hồ sơ đang chờ duyệt</strong>
                                        <span>Admin sẽ xem xét chứng chỉ của bạn</span>
                                    </div>
                                </div>
                            ) : null}
                            {!stats?.unread && !stats?.urgent && profile?.status !== 'pending' ? (
                                <div className={cx('empty')}>Không có thông báo mới.</div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            <div className={cx('perfRow')}>
                <div className={cx('perfCard')}>
                    <div className={cx('perfLabel')}>Tỷ lệ phản hồi đúng hạn</div>
                    <div className={cx('perfValue')}>
                        {stats?.onTimeRate != null ? `${stats.onTimeRate}%` : '—'}
                    </div>
                    <div className={cx('statDelta', 'up')}>Theo dữ liệu phản hồi hiện có</div>
                </div>
                <div className={cx('perfCard')}>
                    <div className={cx('perfLabel')}>Thời gian phản hồi TB</div>
                    <div className={cx('perfValue')}>
                        {stats?.avgResponseMinutes != null ? `${stats.avgResponseMinutes} phút` : '—'}
                    </div>
                    <div className={cx('statDelta')}>Từ lúc tạo đến lúc trả lời</div>
                </div>
                <div className={cx('perfCard')}>
                    <div className={cx('perfLabel')}>Mức độ hài lòng</div>
                    <div className={cx('perfValue')}>
                        {stats?.avgRating != null ? `${stats.avgRating}/5` : '—'}
                    </div>
                    <div className={cx('statDelta')}>Chưa có module đánh giá bác sĩ</div>
                </div>
            </div>
        </div>
    );
}

export default DoctorOverview;
