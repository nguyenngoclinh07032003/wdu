import classNames from 'classnames/bind';
import styles from '../../Styles/ModalDetailProduct.module.scss';
import Modal from 'react-bootstrap/Modal';
import addToCartProduct from '../HandleCart/AddToCart';

import { useState, useEffect } from 'react';

import { toast, ToastContainer } from 'react-toastify';
import { useStore } from '../../hooks/useStore';

const cx = classNames.bind(styles);

function ModalDetailProduct({ item, show, handleClose }) {
    const handleCloseModal = () => handleClose();

    const [quantity, setQuantity] = useState(1);
    const [dataProduct, setDataProduct] = useState([]);
    const [selectSize, setSelectSize] = useState('');
    const [checkType, setCheckType] = useState(0);
    const [selectedMedia, setSelectedMedia] = useState(null);

    const { dataUser, getCart } = useStore();

    useEffect(() => {
        dataProduct.forEach((item) => {
            item.type === 1 ? setCheckType(1) : item.type === 2 ? setCheckType(2) : setCheckType(3);
        });
    }, [dataProduct]);

    useEffect(() => {
        if (!item) return;

        setDataProduct([item]);
        setSelectedMedia({
            type: 'image',
            src: item?.img?.[0] || '',
        });

        document.title = `${item.name} - HealthCare Device`;
    }, [item]);

    const handleAddToCart = async (props) => {
        if (!dataUser?._id) {
            return toast.error('Vui lòng đăng nhập');
        }

        try {
            await addToCartProduct(props, quantity, selectSize);
            await getCart();
            toast.success('Thêm vào giỏ hàng thành công');
        } catch (error) {
            toast.error('Vui lòng đăng nhập');
        }
    };

    useEffect(() => {
        if (quantity < 1) {
            setQuantity(1);
        }
    }, [quantity]);

    const getFileUrl = (fileName) => {
        if (!fileName) return '';

        return `${process.env.REACT_APP_IMG}/${fileName}`;
    };

    return (
        <div className={cx('wrapper')}>
            <ToastContainer />

            <Modal
                show={show}
                size="lg"
                aria-labelledby="contained-modal-title-vcenter"
                centered
                onHide={handleCloseModal}
            >
                {dataProduct.map((item) => {
                    const images = item?.img || [];
                    const videos = item?.videos || [];

                    return (
                        <Modal.Body key={item._id || item.id} className={cx('modal-body')}>
                            <div className={cx('mediaBox')}>
                                <div className={cx('mainMedia')}>
                                    {selectedMedia?.type === 'video' ? (
                                        <video
                                            src={getFileUrl(selectedMedia.src)}
                                            controls
                                            autoPlay
                                            muted
                                            className={cx('productVideo')}
                                        />
                                    ) : (
                                        <img
                                            src={getFileUrl(selectedMedia?.src || images[0])}
                                            alt={item.name}
                                            className={cx('productImage')}
                                        />
                                    )}
                                </div>

                                {(images.length > 0 || videos.length > 0) && (
                                    <div className={cx('mediaThumbs')}>
                                        {images.map((img, index) => (
                                            <button
                                                type="button"
                                                key={`img-${index}`}
                                                className={cx('thumbItem', {
                                                    active:
                                                        selectedMedia?.type === 'image' && selectedMedia?.src === img,
                                                })}
                                                onClick={() =>
                                                    setSelectedMedia({
                                                        type: 'image',
                                                        src: img,
                                                    })
                                                }
                                            >
                                                <img src={getFileUrl(img)} alt={`${item.name}-${index}`} />
                                            </button>
                                        ))}

                                        {videos.map((video, index) => (
                                            <button
                                                type="button"
                                                key={`video-${index}`}
                                                className={cx('thumbItem', 'videoThumb', {
                                                    active:
                                                        selectedMedia?.type === 'video' && selectedMedia?.src === video,
                                                })}
                                                onClick={() =>
                                                    setSelectedMedia({
                                                        type: 'video',
                                                        src: video,
                                                    })
                                                }
                                            >
                                                <video src={getFileUrl(video)} muted />
                                                <span>▶</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className={cx('content')}>
                                <h2>{item.name}</h2>

                                <span id={cx('price')}>{Number(item.price || 0).toLocaleString()} đ</span>

                                <div dangerouslySetInnerHTML={{ __html: item?.description }} />

                                <div className={cx('btn-add-to-cart')}>
                                    <div className={cx('form-quantity')}>
                                        <button type="button" onClick={() => setQuantity(Number(quantity) - 1)}>
                                            -
                                        </button>

                                        <input
                                            id={cx('quantity')}
                                            value={quantity}
                                            onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                                        />

                                        <button type="button" onClick={() => setQuantity(Number(quantity) + 1)}>
                                            +
                                        </button>
                                    </div>

                                    <div className={cx('btn-add-cart')}>
                                        <button type="button" onClick={() => handleAddToCart(item)}>
                                            Thêm Vào Giỏ Hàng
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Modal.Body>
                    );
                })}
            </Modal>
        </div>
    );
}

export default ModalDetailProduct;
