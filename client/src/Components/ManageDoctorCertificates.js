import { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../Styles/ManageDoctorCertificates.module.scss';
import request from '../Config/api';
import { toast, ToastContainer } from 'react-toastify';
import { getCertificateUrl, STATUS_LABELS } from '../Pages/Doctor/doctorUtils';
import ModalRejectDoctorCertificate from '../utils/Modal/ModalRejectDoctorCertificate';

const cx = classNames.bind(styles);

function ManageDoctorCertificates() {
    const [items, setItems] = useState([]);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [loading, setLoading] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await request.get('/api/doctor/admin/certificates', {
                params: statusFilter ? { status: statusFilter } : {},
            });
            setItems(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Không thể tải danh sách chứng chỉ');
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [statusFilter]);

    const handleApprove = async (id) => {
        try {
            const res = await request.put(`/api/doctor/admin/certificates/${id}/approve`);
            toast.success(res?.data?.message || 'Đã duyệt');
            await fetchData();
            window.dispatchEvent(new Event('doctor-certificate-updated'));
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Duyệt thất bại');
        }
    };

    const openRejectModal = (item) => {
        setSelectedItem(item);
        setShowRejectModal(true);
    };

    const handleConfirmReject = async (reason) => {
        if (!selectedItem?._id) return;

        try {
            setRejecting(true);
            const res = await request.put(`/api/doctor/admin/certificates/${selectedItem._id}/reject`, {
                reason,
            });
            toast.success(res?.data?.message || 'Đã từ chối chứng chỉ');
            setShowRejectModal(false);
            setSelectedItem(null);
            await fetchData();
            window.dispatchEvent(new Event('doctor-certificate-updated'));
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Từ chối thất bại');
        } finally {
            setRejecting(false);
        }
    };

    return (
        <div className={cx('adminDoctorPage')}>
            <ToastContainer position="top-right" autoClose={1800} />
            <h2 className={cx('pageTitle')}>Duyệt chứng chỉ Bác sĩ</h2>
            <p className={cx('pageDesc')}>Xem xét và phê duyệt chứng chỉ hành nghề của bác sĩ trên hệ thống.</p>

            <div className={cx('filterRow')}>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="pending">Chờ duyệt</option>
                    <option value="approved">Đã duyệt</option>
                    <option value="rejected">Bị từ chối</option>
                    <option value="">Tất cả</option>
                </select>
            </div>

            <div className={cx('tableCard')}>
                <div className={cx('tableWrap')}>
                    <table className={cx('table')}>
                    <thead>
                        <tr>
                            <th>Bác sĩ</th>
                            <th>Chuyên khoa</th>
                            <th>Giấy phép</th>
                            <th>Chứng chỉ</th>
                            <th>Trạng thái</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="6" className={cx('emptyState')}>
                                    Đang tải...
                                </td>
                            </tr>
                        ) : items.length ? (
                            items.map((item) => (
                                <tr key={item._id}>
                                    <td>
                                        <strong>{item.user?.fullname || '---'}</strong>
                                        <div>{item.user?.email || '---'}</div>
                                    </td>
                                    <td>{item.specialty || '---'}</td>
                                    <td>{item.licenseNumber || '---'}</td>
                                    <td>
                                        {item.certificateUrl ? (
                                            <a
                                                href={getCertificateUrl(item.certificateUrl)}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={cx('linkBtn')}
                                            >
                                                Xem file
                                            </a>
                                        ) : (
                                            'Chưa upload'
                                        )}
                                    </td>
                                    <td>
                                        <span className={cx('badge', item.status)}>{STATUS_LABELS[item.status]}</span>
                                        {item.status === 'rejected' && item.rejectionReason ? (
                                            <div className={cx('rejectReasonBox')}>
                                                <strong>Lý do từ chối:</strong>
                                                <p>{item.rejectionReason}</p>
                                            </div>
                                        ) : null}
                                    </td>
                                    <td>
                                        <div className={cx('actions')}>
                                            {item.status === 'pending' ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        className={cx('approveBtn')}
                                                        onClick={() => handleApprove(item._id)}
                                                    >
                                                        Duyệt
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={cx('rejectBtn')}
                                                        onClick={() => openRejectModal(item)}
                                                    >
                                                        Từ chối
                                                    </button>
                                                </>
                                            ) : (
                                                <span>—</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className={cx('emptyState')}>
                                    Không có hồ sơ nào
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            <ModalRejectDoctorCertificate
                show={showRejectModal}
                setShow={setShowRejectModal}
                doctorName={selectedItem?.user?.fullname}
                onConfirm={handleConfirmReject}
                loading={rejecting}
            />
        </div>
    );
}

export default ManageDoctorCertificates;
