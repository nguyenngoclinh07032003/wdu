import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import request from '../../Config/api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function ModalDeletePro({ show, setShow, nameProduct }) {
    const id = nameProduct._id;

    const handleClose = () => setShow(false);

    const handleDeletePro = async () => {
        try {
            const res = await request.delete('/api/deleteproduct', { params: { id: id } });
            toast.success(res.data.message);
            handleClose();
        } catch (error) {
            handleClose();
        }
    };

    return (
        <>
            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                    <Modal.Title>Xóa Sản Phẩm</Modal.Title>
                </Modal.Header>
                <Modal.Body>Bạn Muốn Xóa Sản Phẩm Có Tên : {nameProduct.name}</Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Đóng
                    </Button>
                    <Button variant="primary" onClick={handleDeletePro}>
                        Xóa Sản Phẩm
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default ModalDeletePro;
