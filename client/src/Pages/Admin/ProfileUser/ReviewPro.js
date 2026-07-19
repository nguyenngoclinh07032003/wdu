import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../../Styles/ReviewProduct.module.scss';
import { normalizeOrderStatus, getOrderStatusInfo } from '../../../utils/orderStatus';
import request from '../../../Config/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faCamera, faXmark, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { getUploadUrl } from '../../../utils/imageUrl';

const cx = classNames.bind(styles);

const tags = [
    'Dễ sử dụng', 'Tiện lợi', 'Thiết kế đẹp', 'Giá cả hợp lý',
    'Chất lượng tốt', 'Đóng gói kỹ', 'Giao hàng nhanh',
];

function ReviewPro({ dataPayments = [] }) {
    const [rating, setRating] = useState(5);
    const [hoverStar, setHoverStar] = useState(0);
    const [content, setContent] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [images, setImages] = useState([]);
    const [selectedKey, setSelectedKey] = useState('');
    const [reviewedKeys, setReviewedKeys] = useState([]);

    const formatMoney = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

    const reviewItems = useMemo(() => {
        return dataPayments
            .filter((order) => normalizeOrderStatus(order) === 'completed')
            .flatMap((order) => {
                const products = Array.isArray(order?.products) ? order.products : [];
                return products.map((product, index) => ({ key: `${order._id}-${index}`, order, product, productIndex: index }));
            })
            .filter((item) => !reviewedKeys.includes(item.key));
    }, [dataPayments, reviewedKeys]);

    useEffect(() => {
        if (!selectedKey && reviewItems.length > 0) setSelectedKey(reviewItems[0].key);
        if (selectedKey && !reviewItems.some((item) => item.key === selectedKey)) setSelectedKey(reviewItems[0]?.key || '');
    }, [reviewItems, selectedKey]);

    useEffect(() => {
        const fetchMyReviews = async () => {
            try {
                const res = await request.get('/api/my-reviews');
                setReviewedKeys((res.data || []).map((review) => `${review.orderId}-${review.productIndex}`));
            } catch (error) { setReviewedKeys([]); }
        };
        fetchMyReviews();
    }, []);

    const selectedItem = reviewItems.find((item) => item.key === selectedKey) || reviewItems[0];
    const order = selectedItem?.order;
    const product = selectedItem?.product;
    const status = normalizeOrderStatus(order);
    const statusInfo = getOrderStatusInfo(status);

    const handleToggleTag = (tag) => {
        setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
    };

    const resetForm = () => {
        setRating(5); setHoverStar(0); setContent(''); setSelectedTags([]);
        setImages((prev) => { prev.forEach((item) => URL.revokeObjectURL(item.preview)); return []; });
    };

    const handleUploadImage = (e) => {
        const files = Array.from(e.target.files || []);
        const previewImages = files.map((file) => ({ file, preview: URL.createObjectURL(file) }));
        setImages((prev) => [...prev, ...previewImages].slice(0, 5));
        e.target.value = '';
    };

    const handleRemoveImage = (index) => {
        setImages((prev) => {
            const removed = prev[index];
            if (removed?.preview) URL.revokeObjectURL(removed.preview);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleSubmitReview = async () => {
        if (!order || !product) { toast.error('Không có dữ liệu đánh giá'); return; }
        if (!content.trim()) { toast.warning('Vui lòng nhập nội dung đánh giá'); return; }
        try {
            const formData = new FormData();
            formData.append('orderId', order._id);
            formData.append('productIndex', selectedItem.productIndex);
            formData.append('productId', product.productId || product._id || '');
            formData.append('nameProduct', product.nameProduct || '');
            formData.append('img', product.img || '');
            formData.append('rating', rating);
            formData.append('content', content.trim());
            formData.append('tags', JSON.stringify(selectedTags));
            images.forEach((item) => formData.append('images', item.file));
            const res = await request.post('/api/reviews', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(res.data.message || 'Gửi đánh giá thành công');
            setReviewedKeys((prev) => [...prev, selectedItem.key]);
            resetForm();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Gửi đánh giá thất bại');
        }
    };

    if (!selectedItem) {
        return (
            <div className={cx('reviewWrapper')}>
                <div className={cx('reviewMain')}>
                    <div className={cx('reviewHeader')}>
                        <h2>Đánh giá sản phẩm</h2>
                        <p>Bạn chưa có sản phẩm hoàn tất nào cần đánh giá.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cx('reviewWrapper')}>
            <ToastContainer />
            <div className={cx('reviewGrid')}>
                <div className={cx('reviewSidebar')}>
                    <div className={cx('reviewCard')}>
                        <div className={cx('reviewCardHeader')}><h3>Sản phẩm chờ đánh giá</h3></div>
                        <div className={cx('reviewProductList')}>
                            {reviewItems.map((item) => (
                                <button key={item.key} type="button" className={cx('reviewProductItem', { active: selectedKey === item.key })}
                                    onClick={() => { setSelectedKey(item.key); resetForm(); }}>
                                    <img src={getUploadUrl(item.product?.img)} alt={item.product?.nameProduct} />
                                    <div>
                                        <strong>{item.product?.nameProduct || 'Không có tên'}</strong>
                                        <span>Đơn #{item.order?._id?.slice(0, 8)}</span>
                                        <small>Số lượng: {item.product?.quantity || 0}</small>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className={cx('reviewCard')}>
                        <div className={cx('reviewCardHeader')}><h3>Đơn hàng của bạn</h3></div>
                        <div className={cx('reviewInfo')}><span>Mã đơn hàng</span><strong>#{order?._id?.slice(0, 12)}</strong></div>
                        <div className={cx('reviewInfo')}><span>Ngày mua</span><strong>{order?.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'Không có'}</strong></div>
                        <div className={cx('reviewInfo')}><span>Trạng thái</span><div className={cx('successBadge', statusInfo.className)}>{statusInfo.text}</div></div>
                        <div className={cx('reviewInfo')}><span>Tổng tiền</span><strong>{formatMoney(order?.sumprice)}</strong></div>
                    </div>
                    <div className={cx('reviewCard')}>
                        <div className={cx('reviewCardHeader')}><h3>Sản phẩm đang đánh giá</h3></div>
                        <div className={cx('reviewProduct')}>
                            <img src={getUploadUrl(product?.img)} alt={product?.nameProduct} />
                            <div>
                                <h4>{product?.nameProduct}</h4>
                                <p>Số lượng: {product?.quantity}</p>
                                <p>Đơn giá: {formatMoney(product?.price)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={cx('reviewMain')}>
                    <div className={cx('reviewHeader')}>
                        <h2>Viết đánh giá sản phẩm</h2>
                        <p>Chia sẻ trải nghiệm của bạn về sản phẩm này</p>
                    </div>
                    <div className={cx('reviewSection')}>
                        <h4>1. Đánh giá mức độ hài lòng</h4>
                        <div className={cx('ratingRow')}>
                            <div className={cx('starRow')}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button key={star} type="button" className={cx('starBtn', { active: star <= (hoverStar || rating) })}
                                        onMouseEnter={() => setHoverStar(star)} onMouseLeave={() => setHoverStar(0)} onClick={() => setRating(star)}>
                                        <FontAwesomeIcon icon={faStar} />
                                    </button>
                                ))}
                            </div>
                            <div className={cx('ratingBadge')}>{({ 1: 'Rất không hài lòng', 2: 'Không hài lòng', 3: 'Bình thường', 4: 'Hài lòng', 5: 'Rất hài lòng' })[hoverStar || rating]}</div>
                        </div>
                    </div>
                    <div className={cx('reviewSection')}>
                        <h4>2. Đặc điểm nổi bật</h4>
                        <div className={cx('tagList')}>
                            {tags.map((tag) => (
                                <button key={tag} type="button" className={cx('tagBtn', { active: selectedTags.includes(tag) })} onClick={() => handleToggleTag(tag)}>{tag}</button>
                            ))}
                        </div>
                    </div>
                    <div className={cx('reviewSection')}>
                        <h4>3. Chi tiết đánh giá</h4>
                        <textarea className={cx('reviewTextarea')} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Hãy chia sẻ trải nghiệm của bạn..." maxLength={1000} />
                        <div className={cx('textCount')}>{content.length}/1000</div>
                    </div>
                    <div className={cx('reviewSection')}>
                        <h4>4. Thêm hình ảnh</h4>
                        <div className={cx('uploadList')}>
                            <label className={cx('uploadBox')}>
                                <FontAwesomeIcon icon={faCamera} /><span>Tải ảnh</span>
                                <input type="file" hidden multiple accept="image/*" onChange={handleUploadImage} />
                            </label>
                            {images.map((item, index) => (
                                <div key={index} className={cx('previewImage')}>
                                    <img src={item.preview} alt="" />
                                    <button type="button" onClick={() => handleRemoveImage(index)}><FontAwesomeIcon icon={faXmark} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={cx('reviewActions')}>
                        <button type="button" className={cx('submitReviewBtn')} onClick={handleSubmitReview}>
                            <FontAwesomeIcon icon={faPaperPlane} /><span>Gửi đánh giá</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReviewPro;
