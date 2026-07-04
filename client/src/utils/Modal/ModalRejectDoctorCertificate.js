import { useEffect, useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import classNames from 'classnames/bind';
import styles from '../../Styles/ModalRejectDoctorCertificate.module.scss';

const cx = classNames.bind(styles);

function ModalRejectDoctorCertificate({ show, setShow, doctorName, onConfirm, loading }) {
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (show) {
            setReason('');
        }
    }, [show]);

    const handleClose = () => {
        if (loading) return;
        setShow(false);
    };

    const handleSubmit = () => {
        const trimmed = reason.trim();
        if (!trimmed) return;
        onConfirm(trimmed);
    };

    return (
        <Modal show={show} onHide={handleClose} centered dialogClassName={cx('dialog')}>
            <Modal.Header closeButton className={cx('header')}>
                <Modal.Title>Từ chối chứng chỉ bác sĩ</Modal.Title>
            </Modal.Header>

            <Modal.Body className={cx('body')}>
                <p className={cx('doctorName')}>
                    Bác sĩ: <strong>{doctorName || '---'}</strong>
                </p>
                <p className={cx('hint')}>
                    Vui lòng ghi rõ lý do từ chối. Nội dung này sẽ hiển thị cho bác sĩ trên trang hồ sơ.
                </p>

                <label className={cx('label')} htmlFor="reject-reason">
                    Lý do từ chối <span>*</span>
                </label>
                <textarea
                    id="reject-reason"
                    className={cx('textarea')}
                    rows={5}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="VD: Ảnh chứng chỉ mờ, không đọc được số giấy phép hành nghề..."
                    disabled={loading}
                />
            </Modal.Body>

            <Modal.Footer className={cx('footer')}>
                <button type="button" className={cx('cancelBtn')} onClick={handleClose} disabled={loading}>
                    Hủy
                </button>
                <button
                    type="button"
                    className={cx('rejectBtn')}
                    onClick={handleSubmit}
                    disabled={loading || !reason.trim()}
                >
                    {loading ? 'Đang gửi...' : 'Xác nhận từ chối'}
                </button>
            </Modal.Footer>
        </Modal>
    );
}

export default ModalRejectDoctorCertificate;
