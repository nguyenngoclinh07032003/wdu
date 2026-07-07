import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../../Styles/ReminderPage.module.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBell,
    faCheck,
    faClock,
    faEnvelope,
    faMessage,
    faXmark,
    faHeartPulse,
    faHandHoldingMedical,
} from '@fortawesome/free-solid-svg-icons';

import { getReminders, createReminder, deleteReminder, completeReminder } from '../../../services/reminderService';

const cx = classNames.bind(styles);

function ReminderPage() {
    const [reminders, setReminders] = useState([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [time, setTime] = useState('08:00');
    const [frequency, setFrequency] = useState('daily');
    const [methods, setMethods] = useState(['email']);
    const [loading, setLoading] = useState(false);
    const [showReport, setShowReport] = useState(false);

    const fetchData = async () => {
        try {
            const res = await getReminders();
            if (res.success) setReminders(res.data || []);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const todayReminders = useMemo(() => reminders.slice(0, 2), [reminders]);

    const totalReminders = reminders.length;
    const activeReminders = reminders.filter((item) => item.isActive !== false).length;
    const emailReminders = reminders.filter((item) => item.methods?.includes('email')).length;
    const complianceRate = totalReminders > 0 ? Math.round((activeReminders / totalReminders) * 100) : 0;

    const toggleMethod = (value) => {
        setMethods((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
    };

    const handleCreate = async () => {
        if (!title.trim()) { alert('Vui lòng nhập tên nhắc nhở'); return; }
        if (methods.length === 0) { alert('Vui lòng chọn phương thức thông báo'); return; }
        try {
            setLoading(true);
            await createReminder({ title, description, frequency, times: [time], methods });
            setTitle(''); setDescription(''); setTime('08:00'); setFrequency('daily'); setMethods(['email']);
            fetchData();
        } catch (error) {
            console.log(error);
            alert(error.response?.data?.message || 'Tạo nhắc nhở thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (id) => {
        try {
            await completeReminder(id);
            alert('Đã đánh dấu hoàn thành');
            fetchData();
        } catch (error) { console.log(error); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Xóa nhắc nhở này?')) return;
        try {
            await deleteReminder(id);
            fetchData();
        } catch (error) { console.log(error); }
    };

    const isCompletedToday = (item) => {
        if (!item.lastCompletedAt) return false;
        const today = new Date();
        const completed = new Date(item.lastCompletedAt);
        return today.getDate() === completed.getDate() && today.getMonth() === completed.getMonth() && today.getFullYear() === completed.getFullYear();
    };

    return (
        <div className={cx('wrapper')}>
            <div className={cx('header')}>
                <h2>Cài đặt Nhắc nhở</h2>
                <p>Quản lý lịch trình nhắc nhở của bạn.</p>
            </div>

            <div className={cx('layout')}>
                <section className={cx('left')}>
                    <div className={cx('reminderGrid')}>
                        {todayReminders.length > 0 ? (
                            todayReminders.map((item, index) => (
                                <div className={cx('topCard')} key={item._id}>
                                    <div className={cx('cardTop')}>
                                        <FontAwesomeIcon icon={index % 2 === 0 ? faHeartPulse : faHandHoldingMedical} />
                                        <span>{item.frequency === 'weekly' ? 'Hằng tuần' : 'Hằng ngày'}</span>
                                    </div>
                                    <h3>{item.title}</h3>
                                    <p>{item.description || 'Nhắc nhở chăm sóc sức khỏe'}</p>
                                    <strong><FontAwesomeIcon icon={faClock} />{item.times?.[0] || '--:--'}</strong>
                                    <div className={cx('cardActions')}>
                                        {isCompletedToday(item) ? (
                                            <button type="button" className={cx('completedBtn')} disabled>✓ Hoàn thành</button>
                                        ) : (
                                            <button type="button" onClick={() => handleComplete(item._id)}>Hoàn thành</button>
                                        )}
                                        <button type="button" onClick={() => handleDelete(item._id)}>Xóa</button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className={cx('emptyBox')}>Chưa có nhắc nhở nào</div>
                        )}
                    </div>

                    <div className={cx('logBox')}>
                        <div className={cx('logHeader')}>
                            <h3>Nhật ký Tuân thủ</h3>
                            <button type="button" onClick={() => setShowReport(true)}>Xem báo cáo chi tiết</button>
                        </div>
                        {reminders.length > 0 ? (
                            reminders.slice(0, 5).map((item, index) => (
                                <div className={cx('logItem')} key={item._id}>
                                    <div className={cx('logIcon', { missed: index === 1 })}>
                                        <FontAwesomeIcon icon={index === 1 ? faXmark : faCheck} />
                                    </div>
                                    <div className={cx('logInfo')}>
                                        <h4>{item.title}</h4>
                                        <p>{index === 0 ? 'Hôm nay' : 'Gần đây'}, {item.times?.[0]}</p>
                                    </div>
                                    <span className={cx('logStatus', { missed: index === 1 })}>{index === 1 ? 'Bỏ lỡ' : 'Hoàn thành'}</span>
                                </div>
                            ))
                        ) : (
                            <p className={cx('emptyText')}>Chưa có dữ liệu tuân thủ</p>
                        )}
                    </div>

                    <div className={cx('banner')}>
                        <h3>Độ chính xác là Ưu tiên</h3>
                        <p>Hệ thống giúp bạn duy trì thói quen sức khỏe ổn định mỗi ngày.</p>
                    </div>
                </section>

                <aside className={cx('right')}>
                    <h3>Thêm Nhắc nhở Mới</h3>
                    <label>Tên nhắc nhở</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Đến giờ thư giãn cơ" />
                    <label>Mô tả</label>
                    <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ví dụ: Đấm bóp vai gáy" />
                    <label>Tần suất</label>
                    <div className={cx('frequency')}>
                        <button type="button" className={cx({ active: frequency === 'daily' })} onClick={() => setFrequency('daily')}>Hằng ngày</button>
                        <button type="button" className={cx({ active: frequency === 'weekly' })} onClick={() => setFrequency('weekly')}>Hằng tuần</button>
                        <button type="button" className={cx({ active: frequency === 'custom' })} onClick={() => setFrequency('custom')}>Tùy chỉnh</button>
                    </div>
                    <div className={cx('row')}>
                        <div>
                            <label>Thời gian</label>
                            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                        </div>
                        <div>
                            <label>Số lần nhắc</label>
                            <input value="1" readOnly />
                        </div>
                    </div>
                    <label>Phương thức thông báo</label>
                    <div className={cx('method')} onClick={() => toggleMethod('push')}>
                        <input type="checkbox" checked={methods.includes('push')} readOnly />
                        <FontAwesomeIcon icon={faBell} /><span>Thông báo đẩy Push</span>
                    </div>
                    <div className={cx('method')} onClick={() => toggleMethod('email')}>
                        <input type="checkbox" checked={methods.includes('email')} readOnly />
                        <FontAwesomeIcon icon={faEnvelope} /><span>Email</span>
                    </div>
                    <div className={cx('method')} onClick={() => toggleMethod('sms')}>
                        <input type="checkbox" checked={methods.includes('sms')} readOnly />
                        <FontAwesomeIcon icon={faMessage} /><span>SMS</span>
                    </div>
                    <button className={cx('saveBtn')} onClick={handleCreate} disabled={loading}>
                        {loading ? 'Đang lưu...' : 'Lưu cài đặt nhắc nhở'}
                    </button>
                </aside>
            </div>

            {showReport && (
                <div className={cx('modalOverlay')} onClick={() => setShowReport(false)}>
                    <div className={cx('reportModal')} onClick={(e) => e.stopPropagation()}>
                        <div className={cx('reportHeader')}>
                            <div>
                                <h3>Báo cáo tuân thủ chi tiết</h3>
                                <p>Tổng quan lịch nhắc nhở chăm sóc sức khỏe của bạn</p>
                            </div>
                            <button type="button" onClick={() => setShowReport(false)}>×</button>
                        </div>
                        <div className={cx('reportGrid')}>
                            <div className={cx('reportCard')}><span>Tổng nhắc nhở</span><strong>{totalReminders}</strong></div>
                            <div className={cx('reportCard')}><span>Đang hoạt động</span><strong>{activeReminders}</strong></div>
                            <div className={cx('reportCard')}><span>Nhắc qua Email</span><strong>{emailReminders}</strong></div>
                            <div className={cx('reportCard')}><span>Tỷ lệ hoạt động</span><strong>{complianceRate}%</strong></div>
                        </div>
                        <div className={cx('reportList')}>
                            <h4>Danh sách nhắc nhở</h4>
                            {reminders.length > 0 ? (
                                reminders.map((item) => (
                                    <div className={cx('reportItem')} key={item._id}>
                                        <div>
                                            <strong>{item.title}</strong>
                                            <p>{item.description || 'Không có mô tả'}</p>
                                        </div>
                                        <div className={cx('reportMeta')}>
                                            <span>{item.times?.join(', ')}</span>
                                            <b>{item.isActive === false ? 'Đã tắt' : 'Đang bật'}</b>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className={cx('emptyText')}>Chưa có dữ liệu báo cáo</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ReminderPage;
