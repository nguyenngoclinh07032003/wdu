import classNames from 'classnames/bind';
import styles from '../Styles/DetailProducts.module.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import request from '../Config/api';

import { useEffect, useMemo, useState } from 'react';
import addToCartProduct from '../utils/HandleCart/AddToCart';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from '../Components/Navbar';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

import shipIcon from '../assests/icons/ship.png';
import qualityIcon from '../assests/icons/quality.png';

import CardBody from '../Components/CardBody';
import Slider from 'react-slick';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft, faAngleRight, faStar, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';

const cx = classNames.bind(styles);

const SERVER_URL = process.env.REACT_APP_SERVER || 'http://localhost:5001';
const IMAGE_URL = process.env.REACT_APP_IMG || 'http://localhost:5001/uploads';

const normalizePath = (path) => {
    if (!path) return '';
    return String(path).trim();
};

const getMediaUrl = (path) => {
    const value = normalizePath(path);

    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('blob:')) return value;

    if (value.startsWith('/uploads/')) return `${SERVER_URL}${value}`;
    if (value.startsWith('uploads/')) return `${SERVER_URL}/${value}`;

    return `${IMAGE_URL}/${value.replace(/^\/+/, '')}`;
};

const handleImageError = (e, fallback = '') => {
    if (e.currentTarget.dataset.errorHandled === 'true') return;

    e.currentTarget.dataset.errorHandled = 'true';

    if (fallback) {
        e.currentTarget.src = fallback;
    } else {
        e.currentTarget.style.display = 'none';
    }
};

const formatSold = (value) => {
    const number = Number(value || 0);

    if (number >= 1000) {
        return `${(number / 1000).toFixed(1)}k+`;
    }

    return number;
};

function DetailProducts() {
    const location = useLocation();
    const navigate = useNavigate();

    const id = location.pathname.split('/')[2];

    const [dataProduct, setDataProduct] = useState([]);
    const [quantity, setQuantity] = useState(1);
    const [selectedMedia, setSelectedMedia] = useState({
        type: 'image',
        index: 0,
    });
    const [lengthCart, setLengthCart] = useState(0);
    const [similarProduct, setSimilarProduct] = useState([]);
    const [activeTab, setActiveTab] = useState('description');
    const [reviews, setReviews] = useState([]);
    const [filterRating, setFilterRating] = useState('all');

    const [editingReview, setEditingReview] = useState(null);
    const [editRating, setEditRating] = useState(5);
    const [editContent, setEditContent] = useState('');
    const [editTags, setEditTags] = useState('');

    const { getCart, dataUser } = useStore();

    const reviewCount = reviews.length;

    const averageRating = useMemo(() => {
        if (!reviewCount) return 0;

        return reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviewCount;
    }, [reviews, reviewCount]);

    const averageRatingText = reviewCount > 0 ? averageRating.toFixed(1) : '0.0';

    const filteredReviews = useMemo(() => {
        if (filterRating === 'all') return reviews;

        return reviews.filter((review) => Number(review.rating || 0) === Number(filterRating));
    }, [reviews, filterRating]);

    const ratingStats = useMemo(() => {
        return [5, 4, 3, 2, 1].reduce((result, star) => {
            result[star] = reviews.filter((review) => Number(review.rating || 0) === star).length;
            return result;
        }, {});
    }, [reviews]);

    const fetchReviews = async (product) => {
        if (!product?._id) return;

        try {
            const res = await request.get(`/api/reviews/product/${product._id}`, {
                params: {
                    nameProduct: product.name,
                },
            });

            setReviews(res.data || []);
        } catch (error) {
            setReviews([]);
        }
    };

    useEffect(() => {
        const fetchCart = async () => {
            if (!dataUser?._id && !dataUser?.id) return;

            try {
                const res = await request.get('/api/cart');
                const totalCart = res.data.reduce((total, item) => total + (item.products?.length || 0), 0);
                setLengthCart(totalCart);
            } catch (error) {
                setLengthCart(0);
            }
        };

        fetchCart();
    }, [dataUser]);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await request.get('/api/product', {
                    params: { id },
                });

                setDataProduct(res.data || []);
                setSelectedMedia({
                    type: 'image',
                    index: 0,
                });
                setQuantity(1);
                setFilterRating('all');
            } catch (error) {
                setDataProduct([]);
            }
        };

        fetchProduct();
    }, [id]);

    useEffect(() => {
        const fetchSimilarProduct = async () => {
            const currentProduct = dataProduct?.[0];
            if (!currentProduct) return;

            try {
                const res = await request.get('/api/similarproduct', {
                    params: {
                        type: currentProduct.type,
                        productId: currentProduct._id,
                    },
                });

                setSimilarProduct(res.data || []);
            } catch (error) {
                setSimilarProduct([]);
            }
        };

        fetchSimilarProduct();
    }, [dataProduct]);

    useEffect(() => {
        const currentProduct = dataProduct?.[0];
        fetchReviews(currentProduct);
    }, [dataProduct]);

    useEffect(() => {
        if (quantity < 1) setQuantity(1);
    }, [quantity]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    const canModifyReview = (review) => {
        const currentUserId = dataUser?._id || dataUser?.id;
        const reviewUserId = review?.userId?._id || review?.userId;

        return String(currentUserId) === String(reviewUserId) || dataUser?.isAdmin === true;
    };

    const handleOpenEditReview = (review) => {
        setEditingReview(review);
        setEditRating(Number(review.rating || 5));
        setEditContent(review.content || '');
        setEditTags(Array.isArray(review.tags) ? review.tags.join(', ') : '');
    };

    const handleCloseEditReview = () => {
        setEditingReview(null);
        setEditRating(5);
        setEditContent('');
        setEditTags('');
    };

    const handleUpdateReview = async () => {
        if (!editingReview?._id) return;

        if (!editContent.trim()) {
            toast.error('Vui lòng nhập nội dung đánh giá');
            return;
        }

        try {
            const tagsArray = editTags
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);

            const res = await request.put(`/api/reviews/${editingReview._id}`, {
                rating: editRating,
                content: editContent,
                tags: tagsArray,
            });

            toast.success(res.data?.message || 'Cập nhật đánh giá thành công');

            setReviews((prev) =>
                prev.map((item) =>
                    item._id === editingReview._id
                        ? {
                              ...item,
                              rating: editRating,
                              content: editContent,
                              tags: tagsArray,
                              updatedAt: new Date().toISOString(),
                          }
                        : item,
                ),
            );

            handleCloseEditReview();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể cập nhật đánh giá');
        }
    };

    const handleDeleteReview = async (reviewId) => {
        const confirmDelete = window.confirm('Bạn có chắc muốn xóa đánh giá này?');
        if (!confirmDelete) return;

        try {
            const res = await request.delete(`/api/reviews/${reviewId}`);

            toast.success(res.data?.message || 'Xóa đánh giá thành công');
            setReviews((prev) => prev.filter((item) => item._id !== reviewId));
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể xóa đánh giá');
        }
    };

    const handleAddProduct = async (product) => {
        try {
            const data = await addToCartProduct(product, quantity, '');
            toast.success(data?.data?.message || 'Đã thêm vào giỏ hàng');
            await getCart();
        } catch (error) {
            toast.error('Vui lòng đăng nhập');
        }
    };

    const handleBuyNow = async (product) => {
        try {
            const data = await addToCartProduct(product, quantity, '');

            if (data?.data?.message) {
                toast.success(data?.data?.message || 'Đã thêm vào giỏ hàng');
                await getCart();

                setTimeout(() => {
                    navigate('/cart');
                }, 500);
            }
        } catch (error) {
            toast.error('Vui lòng đăng nhập');
        }
    };

    const onPrevImg = (imagesLength) => {
        if (selectedMedia.type !== 'image') return;

        setSelectedMedia((prev) => ({
            type: 'image',
            index: prev.index > 0 ? prev.index - 1 : imagesLength - 1,
        }));
    };

    const onNextImg = (imagesLength) => {
        if (selectedMedia.type !== 'image') return;

        setSelectedMedia((prev) => ({
            type: 'image',
            index: prev.index < imagesLength - 1 ? prev.index + 1 : 0,
        }));
    };

    const settings = {
        dots: false,
        infinite: similarProduct.length > 4,
        speed: 500,
        slidesToShow: 4,
        slidesToScroll: 1,
        initialSlide: 0,
        responsive: [
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 3,
                    slidesToScroll: 1,
                },
            },
            {
                breakpoint: 700,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 1,
                },
            },
            {
                breakpoint: 500,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                },
            },
        ],
    };

    return (
        <div className={cx('wrapper')}>
            <ToastContainer />

            <header>
                <Header lengthCart={lengthCart} />
            </header>

            <main className={cx('main')}>
                <Navbar props={dataProduct} />

                {dataProduct.map((item) => {
                    const images = item.img || [];
                    const videos = item.videos || [];
                    const oldPrice = Math.round(Number(item.price || 0) * 1.48);
                    const savedPrice = oldPrice - Number(item.price || 0);

                    return (
                        <div key={item._id} className={cx('detail-wrapper')}>
                            <section className={cx('form-product')}>
                                <div className={cx('img-product')}>
                                    <div className={cx('main-image')}>
                                        {selectedMedia.type === 'video' ? (
                                            <video
                                                className={cx('productVideo')}
                                                src={getMediaUrl(videos[selectedMedia.index])}
                                                controls
                                                autoPlay
                                                muted
                                            />
                                        ) : (
                                            <img
                                                className={cx('img')}
                                                src={getMediaUrl(images[selectedMedia.index])}
                                                alt={item.name}
                                                onError={(e) => handleImageError(e)}
                                            />
                                        )}

                                        {images.length > 1 && selectedMedia.type === 'image' && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => onPrevImg(images.length)}
                                                    className={cx('nav-btn', 'btn-left')}
                                                >
                                                    <FontAwesomeIcon icon={faAngleLeft} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => onNextImg(images.length)}
                                                    className={cx('nav-btn', 'btn-right')}
                                                >
                                                    <FontAwesomeIcon icon={faAngleRight} />
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    <div className={cx('img-small')}>
                                        {images.map((image, index) => (
                                            <button
                                                type="button"
                                                key={`img-${index}`}
                                                className={cx('thumb-item', {
                                                    active:
                                                        selectedMedia.type === 'image' && selectedMedia.index === index,
                                                })}
                                                onClick={() =>
                                                    setSelectedMedia({
                                                        type: 'image',
                                                        index,
                                                    })
                                                }
                                            >
                                                <img
                                                    src={getMediaUrl(image)}
                                                    alt={`${item.name}-${index + 1}`}
                                                    onError={(e) => handleImageError(e)}
                                                />
                                            </button>
                                        ))}

                                        {videos.map((video, index) => (
                                            <button
                                                type="button"
                                                key={`video-${index}`}
                                                className={cx('thumb-item', 'video-thumb', {
                                                    active:
                                                        selectedMedia.type === 'video' && selectedMedia.index === index,
                                                })}
                                                onClick={() =>
                                                    setSelectedMedia({
                                                        type: 'video',
                                                        index,
                                                    })
                                                }
                                            >
                                                <video src={getMediaUrl(video)} muted preload="metadata" />
                                                <span>▶</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className={cx('info-product')}>
                                    <span className={cx('tag-hot')}>BÁN CHẠY NHẤT</span>

                                    <div className={cx('title-product')}>
                                        <h2>{item.name}</h2>
                                    </div>

                                    <div className={cx('product-meta')}>
                                        <div className={cx('stars')}>
                                            {[...Array(5)].map((_, index) => (
                                                <FontAwesomeIcon
                                                    key={index}
                                                    icon={faStar}
                                                    className={cx({
                                                        activeStar: index < Math.round(averageRating),
                                                    })}
                                                />
                                            ))}
                                        </div>

                                        <span>{reviewCount} đánh giá</span>
                                        <span className={cx('dot')}>|</span>
                                        <span>Đã bán {formatSold(item.sold)}</span>
                                    </div>

                                    <div className={cx('price-box')}>
                                        <div className={cx('price-row')}>
                                            <span className={cx('current-price')}>
                                                {Number(item.price || 0).toLocaleString('vi-VN')}đ
                                            </span>
                                            <span className={cx('old-price')}>{oldPrice.toLocaleString('vi-VN')}đ</span>
                                            <span className={cx('discount')}>-32%</span>
                                        </div>

                                        <p>Tiết kiệm: {savedPrice.toLocaleString('vi-VN')}đ</p>
                                    </div>

                                    <ul className={cx('benefits')}>
                                        <li>
                                            <FontAwesomeIcon icon={faCircleCheck} />
                                            <span>Giảm căng thẳng, mệt mỏi</span>
                                        </li>

                                        <li>
                                            <FontAwesomeIcon icon={faCircleCheck} />
                                            <span>An toàn dễ sử dụng</span>
                                        </li>
                                    </ul>

                                    <div className={cx('buy-row')}>
                                        <div className={cx('form-quantity')}>
                                            <button type="button" onClick={() => setQuantity((prev) => prev - 1)}>
                                                -
                                            </button>

                                            <input id={cx('quantity')} value={quantity} readOnly />

                                            <button type="button" onClick={() => setQuantity((prev) => prev + 1)}>
                                                +
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            className={cx('btn-buy-now')}
                                            onClick={() => handleBuyNow(item)}
                                        >
                                            MUA NGAY
                                        </button>

                                        <button
                                            type="button"
                                            className={cx('btn-add-cart')}
                                            onClick={() => handleAddProduct(item)}
                                        >
                                            THÊM VÀO GIỎ
                                        </button>
                                    </div>

                                    <div className={cx('container')}>
                                        <div className={cx('box')}>
                                            <img src={shipIcon} alt="Miễn phí vận chuyển" />

                                            <div className={cx('info')}>
                                                <span className={cx('title')}>Miễn phí vận chuyển</span>
                                                <span className={cx('desc')}>Cho đơn hàng từ 300k</span>
                                            </div>
                                        </div>

                                        <div className={cx('box')}>
                                            <img src={qualityIcon} alt="Bảo hành" />

                                            <div className={cx('info')}>
                                                <span className={cx('title')}>Bảo hành 6 tháng</span>
                                                <span className={cx('desc')}>15 ngày đổi trả</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className={cx('detail-tabs')}>
                                <div className={cx('tab-header')}>
                                    <button
                                        type="button"
                                        className={cx({
                                            activeTab: activeTab === 'description',
                                        })}
                                        onClick={() => setActiveTab('description')}
                                    >
                                        MÔ TẢ CHI TIẾT
                                    </button>

                                    <button
                                        type="button"
                                        className={cx({
                                            activeTab: activeTab === 'specs',
                                        })}
                                        onClick={() => setActiveTab('specs')}
                                    >
                                        THÔNG SỐ KỸ THUẬT
                                    </button>
                                </div>

                                <div className={cx('tab-body')}>
                                    {activeTab === 'description' ? (
                                        <div
                                            dangerouslySetInnerHTML={{
                                                __html: item?.description || '',
                                            }}
                                        />
                                    ) : (
                                        <div className={cx('description-placeholder')}>
                                            Thông số kỹ thuật đang được cập nhật.
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    );
                })}

                <section className={cx('reviews-section')}>
                    <h2>Đánh giá từ khách hàng</h2>

                    <div className={cx('reviews-wrapper')}>
                        <div className={cx('reviews-score')}>
                            <div className={cx('score-number')}>{averageRatingText}</div>

                            <div className={cx('score-stars')}>
                                {[...Array(5)].map((_, index) => (
                                    <FontAwesomeIcon
                                        key={index}
                                        icon={faStar}
                                        className={cx({
                                            activeStar: index < Math.round(averageRating),
                                        })}
                                    />
                                ))}
                            </div>

                            <p>Dựa trên {reviewCount} đánh giá</p>
                        </div>

                        <div className={cx('reviews-list')}>
                            <div className={cx('reviewFilter')}>
                                <button
                                    type="button"
                                    className={cx({ activeFilter: filterRating === 'all' })}
                                    onClick={() => setFilterRating('all')}
                                >
                                    Tất cả ({reviews.length})
                                </button>

                                {[5, 4, 3, 2, 1].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className={cx({ activeFilter: Number(filterRating) === star })}
                                        onClick={() => setFilterRating(star)}
                                    >
                                        {star} sao ({ratingStats[star] || 0})
                                    </button>
                                ))}
                            </div>

                            {filteredReviews.length > 0 ? (
                                filteredReviews.map((review) => {
                                    const avatarName = review.username || review.email || 'Người dùng';
                                    const avatarImage = review.avatar ? getMediaUrl(review.avatar) : '';

                                    return (
                                        <div key={review._id} className={cx('review-item')}>
                                            <div className={cx('avatar')}>
                                                {avatarImage ? (
                                                    <img
                                                        src={avatarImage}
                                                        alt={avatarName}
                                                        onError={(e) => handleImageError(e)}
                                                    />
                                                ) : (
                                                    <span>{avatarName.charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>

                                            <div className={cx('review-content')}>
                                                <div className={cx('review-top')}>
                                                    <strong>{review.username || review.email || 'Khách hàng'}</strong>

                                                    <span>
                                                        {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                                                    </span>
                                                </div>

                                                <div className={cx('review-stars')}>
                                                    {[...Array(5)].map((_, index) => (
                                                        <FontAwesomeIcon
                                                            key={index}
                                                            icon={faStar}
                                                            className={cx({
                                                                activeStar: index < Number(review.rating || 0),
                                                            })}
                                                        />
                                                    ))}
                                                </div>

                                                {review.tags?.length > 0 && (
                                                    <div className={cx('reviewTags')}>
                                                        {review.tags.map((tag) => (
                                                            <span key={tag}>{tag}</span>
                                                        ))}
                                                    </div>
                                                )}

                                                <p>{review.content}</p>

                                                {review.images?.length > 0 && (
                                                    <div className={cx('reviewImages')}>
                                                        {review.images.map((image, index) => (
                                                            <img
                                                                key={index}
                                                                src={getMediaUrl(image)}
                                                                alt={`review-${index + 1}`}
                                                                onError={(e) => handleImageError(e)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                {canModifyReview(review) && (
                                                    <div className={cx('reviewActions')}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditReview(review)}
                                                        >
                                                            Sửa
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteReview(review._id)}
                                                        >
                                                            Xóa
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className={cx('emptyReview')}>
                                    {filterRating === 'all'
                                        ? 'Chưa có đánh giá nào cho sản phẩm này.'
                                        : `Chưa có đánh giá ${filterRating} sao cho sản phẩm này.`}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {editingReview && (
                    <div className={cx('editReviewOverlay')} onClick={handleCloseEditReview}>
                        <div className={cx('editReviewModal')} onClick={(e) => e.stopPropagation()}>
                            <h3>Sửa đánh giá</h3>

                            <label>Số sao</label>
                            <select value={editRating} onChange={(e) => setEditRating(Number(e.target.value))}>
                                <option value={5}>5 sao</option>
                                <option value={4}>4 sao</option>
                                <option value={3}>3 sao</option>
                                <option value={2}>2 sao</option>
                                <option value={1}>1 sao</option>
                            </select>

                            <label>Nội dung đánh giá</label>
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                placeholder="Nhập nội dung đánh giá..."
                            />

                            <label>Thẻ đánh giá</label>
                            <input
                                value={editTags}
                                onChange={(e) => setEditTags(e.target.value)}
                                placeholder="Ví dụ: Đóng gói đẹp, Sản phẩm tốt"
                            />

                            <div className={cx('editReviewButtons')}>
                                <button type="button" onClick={handleCloseEditReview}>
                                    Hủy
                                </button>

                                <button type="button" onClick={handleUpdateReview}>
                                    Lưu thay đổi
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <section className={cx('similar-products')}>
                    <h2>Sản phẩm cùng loại</h2>

                    <Slider {...settings}>
                        {similarProduct.slice(0, 8).map((item) => (
                            <div key={item?._id} className={cx('slider-item')}>
                                <CardBody item={item} />
                            </div>
                        ))}
                    </Slider>
                </section>
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default DetailProducts;
