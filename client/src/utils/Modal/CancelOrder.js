import { useEffect, useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import request from '../../Config/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from '../../Styles/CancelOrder.module.scss';

function ModalCancelOrder({ show, setShow, item, onCancelSuccess, apiUrl = '/api/cancelorder', mode = 'user' }) {
    const [loading, setLoading] = useState(false);
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');

    const orderId = item?._id || item;

    const cancelReasons = [
        'Đặt nhầm sản phẩm',
        'Muốn thay đổi địa chỉ nhận hàng',
        'Muốn thay đổi sản phẩm',
        'Tìm được giá tốt hơn',
        'Không còn nhu cầu mua',
        'Lý do khác',
    ];

    const status = useMemo(() => {
        if (item?.status) return String(item.status).trim().toLowerCase();

        if (item?.tinhtrang === true) return 'completed';
        if (item?.trangthai === true) return 'shipping';

        return 'pending';
    }, [item]);

    const canCancel = useMemo(() => {
        if (mode === 'admin') {
            return status !== 'completed' && status !== 'cancelled';
        }

        return status === 'pending';
    }, [mode, status]);

    const finalReason = useMemo(() => {
        if (reason === 'Lý do khác') return customReason.trim();
        return reason.trim();
    }, [reason, customReason]);

    useEffect(() => {
        if (show) {
            setReason('');
            setCustomReason('');
        }
    }, [show]);

    const handleClose = () => {
        if (loading) return;
        setShow(false);
    };

    const handleCancelOrder = async () => {
        try {
            if (!orderId) {
                toast.error('Không tìm thấy mã đơn hàng');
                return;
            }

            if (!canCancel) {
                toast.error('Đơn hàng này không thể hủy');
                return;
            }

            if (!finalReason) {
                toast.error('Vui lòng chọn hoặc nhập lý do hủy đơn');
                return;
            }

            setLoading(true);

            const res = await request.post(apiUrl, {
                id: orderId,
                reason: finalReason,
                cancelledBy: mode,
            });

            toast.success(res?.data?.message || 'Hủy đơn hàng thành công');

            if (typeof onCancelSuccess === 'function') {
                onCancelSuccess(orderId, res?.data?.order || null);
            }

            handleClose();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Hủy đơn hàng thất bại');
        } finally {
            setLoading(false);
        }
    };

    const getStatusLabel = (value) => {
        switch (value) {
            case 'pending':
                return 'Chờ xử lý';
            case 'confirmed':
                return 'Đã xác nhận';
            case 'shipping':
                return 'Đang giao hàng';
            case 'completed':
                return 'Hoàn thành';
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

    return (
        <Modal show={show} onHide={handleClose} centered className={styles.modalCancel}>
            <Modal.Header closeButton={!loading}>
                <Modal.Title>Hủy đơn hàng</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <div className={styles.warningText}>Bạn có chắc muốn hủy đơn hàng này không?</div>

                {orderId && (
                    <div className={styles.infoLine}>
                        <strong>Mã đơn:</strong> #{String(orderId).slice(0, 7)}
                    </div>
                )}

                <div className={styles.infoLine}>
                    <strong>Trạng thái hiện tại:</strong> {getStatusLabel(status)}
                </div>

                {canCancel && (
                    <div className={styles.reasonBox}>
                        <label>Lý do hủy đơn *</label>

                        <select value={reason} onChange={(e) => setReason(e.target.value)} disabled={loading}>
                            <option value="">-- Chọn lý do hủy --</option>

                            {cancelReasons.map((item) => (
                                <option key={item} value={item}>
                                    {item}
                                </option>
                            ))}
                        </select>

                        {reason === 'Lý do khác' && (
                            <textarea
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Nhập lý do hủy đơn..."
                                rows={3}
                                disabled={loading}
                            />
                        )}
                    </div>
                )}

                {!canCancel && <div className={styles.errorText}>Đơn hàng ở trạng thái này không thể hủy.</div>}
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose} disabled={loading}>
                    Đóng
                </Button>

                <Button variant="danger" onClick={handleCancelOrder} disabled={loading || !canCancel}>
                    {loading ? 'Đang hủy...' : 'Xác nhận hủy đơn'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export default ModalCancelOrder;
