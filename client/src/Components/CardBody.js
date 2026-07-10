import classNames from 'classnames/bind';
import styles from '../Styles/CardBody.module.scss';
import ModalDetailProduct from '../utils/Modal/ModalDetailProduct';
import addToCartProduct from '../utils/HandleCart/AddToCart';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCartPlus } from '@fortawesome/free-solid-svg-icons';
import { faEye } from '@fortawesome/free-regular-svg-icons';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useStore } from '../hooks/useStore';

const cx = classNames.bind(styles);

function CardBody({ item }) {
    const [show, setShow] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);
    const { getCart } = useStore();

    const handleAddToCart = async () => {
        if (addingToCart) return;
        setAddingToCart(true);
        try {
            const res = await addToCartProduct(item, 1);
            if (res) {
                toast.success('Đã thêm vào giỏ hàng!');
                await getCart();
            }
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Thêm vào giỏ hàng thất bại');
        } finally {
            setAddingToCart(false);
        }
    };
    const handleShowModal = () => setShow(true);
    const handleClose = () => setShow(false);

    // Reset trạng thái khi đổi sản phẩm
    const itemId = item?._id;
    const itemImg0 = item?.img?.[0];

    useEffect(() => {
        setImgLoaded(false);
        setImgError(false);
    }, [itemId, itemImg0]);

    const discount = item?.discount;
    const hasDiscount = Number(discount) > 0 && item?.oldPrice;

    const imgSrc = useMemo(() => {
        const file = item?.img?.[0];
        if (!file) return '';
        return `${process.env.REACT_APP_IMG}/${file}`;
    }, [item?.img]);

    return (
        <>
            <div className={cx('wrapper')}>
                <div className={cx('img')}>
                    {hasDiscount && <div className={cx('badge')}>-{discount}%</div>}

                    {/* KHUNG ẢNH CỐ ĐỊNH (không bị nhảy layout) */}
                    <div className={cx('imgInner')}>
                        {/* Skeleton hiển thị trước khi ảnh load */}
                        {!imgLoaded && !imgError && <div className={cx('skeleton')} />}

                        {/* Nếu lỗi ảnh */}
                        {imgError && <div className={cx('fallback')}>No image</div>}

                        {/* Ảnh thật: chỉ hiện khi load xong */}
                        {!imgError && imgSrc && (
                            <img
                                className={cx('productImg', { showImg: imgLoaded })}
                                src={imgSrc}
                                alt={item?.name || 'product'}
                                loading="lazy"
                                decoding="async"
                                onLoad={() => setImgLoaded(true)}
                                onError={() => setImgError(true)}
                            />
                        )}
                    </div>

                    <div className={cx('container')}>
                        <button onClick={handleAddToCart} disabled={addingToCart} title="Thêm vào giỏ hàng">
                            <FontAwesomeIcon icon={faCartPlus} />
                        </button>
                        <button onClick={handleShowModal}>
                            <FontAwesomeIcon icon={faEye} />
                        </button>
                    </div>
                </div>

                <Link style={{ textDecoration: 'none' }} to={`/product/${item?._id}/${item?.slug}`}>
                    <div className={cx('info')}>
                        <h2 className={cx('name')}>{item?.name}</h2>

                        <div className={cx('priceRow')}>
                            {hasDiscount && (
                                <span className={cx('oldPrice')}>{Number(item?.oldPrice).toLocaleString()}đ</span>
                            )}
                            <span className={cx('newPrice')}>{Number(item?.price).toLocaleString()}đ</span>
                        </div>
                    </div>
                </Link>
            </div>

            {show && <ModalDetailProduct item={item} show={show} handleClose={handleClose} />}
        </>
    );
}

export default CardBody;
