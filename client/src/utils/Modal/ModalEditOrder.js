import { useEffect, useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import request from '../../Config/api';

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function ModalEditOrder({ show, setShow, id, address, currentStatus = 'pending', onSuccess }) {
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);

    const normalizedCurrentStatus = String(currentStatus || 'pending')
        .trim()
        .toLowerCase();

    const statusOptions = useMemo(() => {
        switch (normalizedCurrentStatus) {
            case 'pending':
                return [
                    { value: 'confirmed', label: 'Đã xác nhận' },
                    { value: 'cancelled', label: 'Hủy đơn' },
                ];

            case 'confirmed':
                return [
                    { value: 'shipping', label: 'Đang giao hàng' },
                    { value: 'cancelled', label: 'Hủy đơn' },
                ];

            case 'shipping':
                return [
                    { value: 'completed', label: 'Giao thành công' },
                    { value: 'failed', label: 'Giao thất bại' },
                ];

            case 'failed':
                return [{ value: 'returning', label: 'Đang hoàn hàng' }];

            case 'returning':
                return [{ value: 'returned', label: 'Đã hoàn hàng về kho' }];

            default:
                return [];
        }
    }, [normalizedCurrentStatus]);

    const getStatusLabel = (value) => {
        const normalizedValue = String(value || '')
            .trim()
            .toLowerCase();

        switch (normalizedValue) {
            case 'pending':
                return 'Chờ xác nhận';
            case 'confirmed':
                return 'Đã xác nhận';
            case 'shipping':
                return 'Đang giao hàng';
            case 'completed':
                return 'Giao thành công';
            case 'failed':
                return 'Giao thất bại';
            case 'returning':
                return 'Đang hoàn hàng';
            case 'returned':
                return 'Đã hoàn hàng';
            case 'cancelled':
                return 'Đã hủy';
            default:
                return 'Không xác định';
        }
    };

    const isLocked =
        normalizedCurrentStatus === 'completed' ||
        normalizedCurrentStatus === 'returned' ||
        normalizedCurrentStatus === 'cancelled' ||
        statusOptions.length === 0;

    const handleClose = () => {
        if (loading) return;
        setStatus('');
        setShow(false);
    };

    useEffect(() => {
        if (!show) return;

        if (statusOptions.length > 0) {
            setStatus(statusOptions[0].value);
        } else {
            setStatus('');
        }
    }, [show, statusOptions]);

    const handleEditOrder = async () => {
        try {
            if (!id) {
                toast.error('Không tìm thấy mã đơn hàng');
                return;
            }

            if (isLocked) {
                toast.error('Đơn hàng này không thể cập nhật thêm');
                return;
            }

            if (!status) {
                toast.error('Vui lòng chọn trạng thái');
                return;
            }

            setLoading(true);

            const res = await request.post('/api/admin/update-order', {
                id,
                status,
            });

            const responseData = res?.data || {};
            const updatedOrder = responseData?.order || null;
            const updatedStatus = String(updatedOrder?.status || responseData?.status || status)
                .trim()
                .toLowerCase();

            toast.success(responseData?.message || 'Cập nhật đơn hàng thành công');

            if (typeof onSuccess === 'function') {
                onSuccess({
                    status: updatedStatus,
                    order: updatedOrder,
                });
            }

            handleClose();
        } catch (error) {
            console.log('Cập nhật trạng thái lỗi:', error?.response?.data || error);
            toast.error(error?.response?.data?.message || 'Cập nhật đơn hàng thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={handleClose} centered backdrop={loading ? 'static' : true}>
            <Modal.Header closeButton={!loading}>
                <Modal.Title>Chỉnh sửa đơn hàng</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <div style={{ marginBottom: '10px' }}>
                    <strong>Mã đơn hàng:</strong> {id || 'Không có mã đơn'}
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <strong>Địa chỉ giao hàng:</strong> {address || 'Không có địa chỉ'}
                </div>

                <div style={{ marginBottom: '14px' }}>
                    <strong>Trạng thái hiện tại:</strong> {getStatusLabel(normalizedCurrentStatus)}
                </div>

                {isLocked ? (
                    <div className="text-muted">Đơn hàng này không thể cập nhật thêm.</div>
                ) : (
                    <>
                        <label className="form-label">Chọn trạng thái mới</label>
                        <select
                            className="form-select"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            disabled={loading}
                        >
                            {statusOptions.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </>
                )}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose} disabled={loading}>
                    Đóng
                </Button>

                {!isLocked && (
                    <Button variant="primary" onClick={handleEditOrder} disabled={loading || !status}>
                        {loading ? 'Đang lưu...' : 'Lưu lại'}
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
}

export default ModalEditOrder;
