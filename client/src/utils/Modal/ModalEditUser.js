import { useEffect, useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import request from '../../Config/api';
import { toast } from 'react-toastify';
import classNames from 'classnames/bind';
import styles from '../../Styles/ModalEditUser.module.scss';

const cx = classNames.bind(styles);

function ModalEditUser({ show, setShow, dataOneUser, fetchData }) {
    const [fullname, setFullname] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (dataOneUser) {
            setFullname(dataOneUser.fullname || '');
            setIsAdmin(Boolean(dataOneUser.isAdmin));
        }
    }, [dataOneUser]);

    const handleClose = () => {
        if (loading) return;
        setShow(false);
    };
    const [role, setRole] = useState('user');

    useEffect(() => {
        if (dataOneUser) {
            setFullname(dataOneUser.fullname || '');
            setRole(dataOneUser.role || (dataOneUser.isAdmin ? 'admin' : 'user'));
        }
    }, [dataOneUser]);
    const handleSave = async () => {
        try {
            setLoading(true);

            const res = await request.put(`/api/update-user/${dataOneUser._id}`, {
                isAdmin,
                role,
            });

            toast.success(res?.data?.message || 'Cập nhật thành công');
            setShow(false);
            fetchData?.();
        } catch (error) {
            console.error('Lỗi cập nhật user:', error);
            toast.error(error?.response?.data?.message || 'Cập nhật thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            show={show}
            onHide={handleClose}
            centered
            dialogClassName={cx('customModal')}
            contentClassName={cx('modalContent')}
        >
            <Modal.Header closeButton className={cx('modalHeader')}>
                <Modal.Title className={cx('modalTitle')}>Cấp quyền admin</Modal.Title>
            </Modal.Header>

            <Modal.Body className={cx('modalBody')}>
                {/* <div className={cx('infoCard')}>
                    <div className={cx('avatar')}>{fullname?.trim()?.charAt(0)?.toUpperCase() || 'U'}</div>

                    <div className={cx('userInfo')}>
                        <h4>{fullname || 'Chưa có tên'}</h4>
                        <span>ID: {dataOneUser?._id?.slice(0, 8) || '---'}</span>
                    </div>
                </div> */}

                <div className={cx('formGroup')}>
                    <label className={cx('label')}>Họ tên</label>
                    <input type="text" className={cx('input', 'disabledInput')} value={fullname} disabled readOnly />
                </div>

                <div className={cx('formGroup')}>
                    <label className={cx('label')}>Chức vụ</label>
                    <select className={cx('select')} value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="user">Người dùng</option>
                        <option value="staff">Nhân viên (Staff)</option>
                        <option value="doctor">Bác sĩ (Doctor)</option>
                        <option value="admin">Quản trị viên</option>
                        <option value="shipper">Shipper</option>
                    </select>
                </div>
            </Modal.Body>

            <Modal.Footer className={cx('modalFooter')}>
                <button type="button" className={cx('cancelButton')} onClick={handleClose} disabled={loading}>
                    Hủy
                </button>

                <button type="button" className={cx('saveButton')} onClick={handleSave} disabled={loading}>
                    {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
            </Modal.Footer>
        </Modal>
    );
}

export default ModalEditUser;
