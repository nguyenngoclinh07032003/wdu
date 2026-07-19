import { useState, useRef, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import { Editor } from '@tinymce/tinymce-react';
import request from '../../Config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from '../../Styles/ModalUpdatePro.module.scss';
import { formatPriceWithCommas, parsePriceInput } from '../formatPriceInput';
import { getUploadUrl } from '../imageUrl';

function ModalUpdatePro({ show, setShow, data }) {
    const [nameProduct, setNameProduct] = useState('');
    const [priceProduct, setPriceProduct] = useState('');
    const [description, setDescription] = useState('');
    const [isCombo, setIsCombo] = useState(false);

    const [images, setImages] = useState([]);
    const [videos, setVideos] = useState([]);

    const [previewImages, setPreviewImages] = useState([]);
    const [previewVideos, setPreviewVideos] = useState([]);

    const editorRef = useRef(null);

    const handleClose = () => setShow(false);

    useEffect(() => {
        if (!data) return;

        setNameProduct(data.name || '');
        setPriceProduct(formatPriceWithCommas(data.price || 0));
        setDescription(data.description || '');
        setIsCombo(Boolean(data.isCombo));

        setImages([]);
        setVideos([]);

        setPreviewImages(data.img?.map((item) => getUploadUrl(item)) || []);
        setPreviewVideos(data.videos?.map((item) => getUploadUrl(item)) || []);
    }, [data]);

    const handleUpdatePro = async () => {
        try {
            const currentDescription = editorRef.current ? editorRef.current.getContent() : description;

            const formData = new FormData();

            formData.append('id', data?._id || data?.id || data);
            formData.append('nameProduct', nameProduct);
            formData.append('priceProduct', parsePriceInput(priceProduct));
            formData.append('description', currentDescription);
            formData.append('isCombo', isCombo);

            images.forEach((file) => {
                formData.append('fileImg', file);
            });

            videos.forEach((file) => {
                formData.append('fileVideo', file);
            });

            const res = await request.post('/api/editpro', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            toast.success(res.data.message || 'Cập nhật sản phẩm thành công');
            setShow(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Cập nhật sản phẩm thất bại');
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files || []);

        setImages(files);
        setPreviewImages(files.map((file) => URL.createObjectURL(file)));

        e.target.value = '';
    };

    const handleVideoChange = (e) => {
        const files = Array.from(e.target.files || []);

        const validVideos = files.filter((file) => {
            if (!file.type.startsWith('video/')) {
                toast.error(`${file.name} không phải là video`);
                return false;
            }

            if (file.size > 100 * 1024 * 1024) {
                toast.error(`${file.name} vượt quá 100MB`);
                return false;
            }

            return true;
        });

        setVideos(validVideos);
        setPreviewVideos(validVideos.map((file) => URL.createObjectURL(file)));

        e.target.value = '';
    };

    return (
        <>
            <ToastContainer />

            <Modal show={show} onHide={handleClose} centered size="lg" className={styles.wrapper}>
                <Modal.Header closeButton>
                    <Modal.Title>Chỉnh Sửa Sản Phẩm</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Tên Sản Phẩm</label>
                        <input
                            className={styles.input}
                            onChange={(e) => setNameProduct(e.target.value)}
                            value={nameProduct}
                            placeholder="Nhập tên sản phẩm"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Giá Sản Phẩm</label>
                        <input
                            className={styles.input}
                            value={priceProduct}
                            type="text"
                            inputMode="numeric"
                            onChange={(e) => setPriceProduct(formatPriceWithCommas(e.target.value))}
                            placeholder="Ví dụ: 126,000"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Ảnh sản phẩm</label>

                        <label className={styles.uploadBox}>
                            <input type="file" multiple accept="image/*" onChange={handleImageChange} />

                            <div className={styles.uploadContent}>
                                <span>📷 Chọn ảnh sản phẩm</span>
                                <small>PNG, JPG, WEBP</small>
                            </div>
                        </label>

                        <div className={styles.previewWrap}>
                            {previewImages.map((img, index) => (
                                <img key={index} src={img} alt="" className={styles.previewImage} />
                            ))}
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Video sản phẩm</label>

                        <label className={styles.uploadBox}>
                            <input
                                type="file"
                                multiple
                                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                                onChange={handleVideoChange}
                            />

                            <div className={styles.uploadContent}>
                                <span>🎥 Chọn video sản phẩm</span>
                                <small>MP4, WEBM, OGG, MOV - tối đa 100MB/video</small>
                            </div>
                        </label>

                        <div className={styles.previewWrap}>
                            {previewVideos.map((video, index) => (
                                <video key={index} src={video} controls muted className={styles.previewVideo} />
                            ))}
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.checkboxLabel}>
                            <input type="checkbox" checked={isCombo} onChange={(e) => setIsCombo(e.target.checked)} />
                            <span>Đây là sản phẩm combo</span>
                        </label>

                        <p className={styles.helpText}>Nếu không tích, sản phẩm sẽ là sản phẩm đơn lẻ.</p>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Mô Tả Sản Phẩm</label>

                        <div className={styles.editor}>
                            <Editor
                                apiKey="n4hxnmi16uwk9dmdgfx6nscsf8oc30528dlcub1mzsk8deqy"
                                onInit={(_evt, editor) => (editorRef.current = editor)}
                                value={description}
                                onEditorChange={(content) => setDescription(content)}
                                init={{
                                    height: 420,
                                    menubar: false,
                                    plugins: [
                                        'advlist',
                                        'autolink',
                                        'lists',
                                        'link',
                                        'image',
                                        'charmap',
                                        'preview',
                                        'anchor',
                                        'searchreplace',
                                        'visualblocks',
                                        'code',
                                        'fullscreen',
                                        'insertdatetime',
                                        'media',
                                        'table',
                                        'help',
                                        'wordcount',
                                    ],
                                    toolbar:
                                        'undo redo | blocks | bold italic forecolor | alignleft aligncenter ' +
                                        'alignright alignjustify | bullist numlist outdent indent | removeformat | help',
                                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
                                }}
                            />
                        </div>
                    </div>
                </Modal.Body>

                <Modal.Footer>
                    <Button className={styles.closeBtn} onClick={handleClose}>
                        Đóng
                    </Button>

                    <Button className={styles.saveBtn} onClick={handleUpdatePro}>
                        Lưu Lại
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default ModalUpdatePro;
