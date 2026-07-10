import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import request from '../../Config/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function ModalDeleteUser({ show, setShow, dataOneUser }) {
    const handleClose = () => setShow(false);

    const handleDeleteUser = async () => {
        try {
            const res = await request.delete('/api/deleteuser', { params: { id: dataOneUser._id } });
            toast.success(res.data.message);
        } catch (error) {
            toast.error(error.response.data.message);
        }
    };

    return (
        <>
            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Xóa Người Dùng</Modal.Title>
                </Modal.Header>
                <Modal.Body>Bạn Muốn Xóa Người Dùng Có Tên : {dataOneUser.fullname}</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Đóng
                    </Button>
                    <Button variant="danger" onClick={handleDeleteUser}>
                        Xóa Người Dùng
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default ModalDeleteUser;
