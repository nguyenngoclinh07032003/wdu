import { useState } from 'react';
import classNames from 'classnames/bind';
import styles from './ShipperDashboard.module.scss';
import { FAILURE_REASONS } from '../../utils/deliveryStatus';

const cx = classNames.bind(styles);

function DeliveryFailureModal({
    open,
    mode = 'first', // first | second
    onClose,
    onSubmit,
    submitting,
}) {
    const [failureReason, setFailureReason] = useState(FAILURE_REASONS[0]);
    const [failureNote, setFailureNote] = useState('');
    const [redeliveryDate, setRedeliveryDate] = useState('');
    const [redeliveryTime, setRedeliveryTime] = useState('09:00');
    const [evidenceFile, setEvidenceFile] = useState(null);
    const [confirmReturn, setConfirmReturn] = useState(false);
    const [error, setError] = useState('');

    if (!open) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!failureReason) {
            setError('Vui lòng chọn lý do');
            return;
        }
        if (failureReason === 'Lý do khác' && !failureNote.trim()) {
            setError('Lý do khác bắt buộc nhập ghi chú');
            return;
        }

        if (mode === 'first') {
            if (!redeliveryDate || !redeliveryTime) {
                setError('Bắt buộc chọn thời gian giao lại dự kiến');
                return;
            }
            const redeliveryScheduledAt = new Date(`${redeliveryDate}T${redeliveryTime}:00`);
            if (Number.isNaN(redeliveryScheduledAt.getTime())) {
                setError('Thời gian giao lại không hợp lệ');
                return;
            }
            onSubmit({
                failureReason,
                failureNote,
                redeliveryScheduledAt: redeliveryScheduledAt.toISOString(),
                evidenceFile,
            });
            return;
        }

        if (!failureNote.trim()) {
            setError('Bắt buộc nhập ghi chú chi tiết');
            return;
        }
        if (!confirmReturn) {
            setError('Phải xác nhận sẽ hoàn hàng về hệ thống');
            return;
        }

        onSubmit({
            failureReason,
            failureNote,
            confirmReturn: true,
            evidenceFile,
        });
    };

    return (
        <div className={cx('modalOverlay')} role="dialog" aria-modal="true">
            <div className={cx('modalCard')}>
                <div className={cx('modalHead')}>
                    <h3>
                        {mode === 'first'
                            ? 'Giao hàng thất bại lần 1'
                            : 'Giao hàng thất bại lần 2'}
                    </h3>
                    <button type="button" onClick={onClose} aria-label="Đóng">
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={cx('modalForm')}>
                    <label>
                        Lý do giao hàng thất bại <span>*</span>
                        <select
                            value={failureReason}
                            onChange={(e) => setFailureReason(e.target.value)}
                        >
                            {FAILURE_REASONS.map((reason) => (
                                <option key={reason} value={reason}>
                                    {reason}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        Ghi chú {mode === 'second' ? <span>*</span> : null}
                        <textarea
                            rows={3}
                            value={failureNote}
                            onChange={(e) => setFailureNote(e.target.value)}
                            placeholder={
                                mode === 'second'
                                    ? 'Nhập ghi chú chi tiết...'
                                    : 'Ghi chú thêm (bắt buộc nếu chọn Lý do khác)'
                            }
                        />
                    </label>

                    <label>
                        Ảnh minh chứng
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                        />
                    </label>

                    {mode === 'first' ? (
                        <div className={cx('datetimeRow')}>
                            <label>
                                Ngày giao lại <span>*</span>
                                <input
                                    type="date"
                                    value={redeliveryDate}
                                    onChange={(e) => setRedeliveryDate(e.target.value)}
                                />
                            </label>
                            <label>
                                Giờ <span>*</span>
                                <input
                                    type="time"
                                    value={redeliveryTime}
                                    onChange={(e) => setRedeliveryTime(e.target.value)}
                                />
                            </label>
                        </div>
                    ) : (
                        <label className={cx('checkRow')}>
                            <input
                                type="checkbox"
                                checked={confirmReturn}
                                onChange={(e) => setConfirmReturn(e.target.checked)}
                            />
                            Xác nhận sẽ hoàn hàng về hệ thống
                        </label>
                    )}

                    {error ? <p className={cx('formError')}>{error}</p> : null}

                    <div className={cx('modalActions')}>
                        <button type="button" className={cx('actBtn')} onClick={onClose}>
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className={cx('actBtn', mode === 'first' ? 'warn' : 'danger')}
                            disabled={submitting}
                        >
                            {mode === 'first' ? 'Xác nhận giao lại' : 'Xác nhận hoàn hàng'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default DeliveryFailureModal;
