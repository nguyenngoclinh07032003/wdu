import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../Styles/Combo.module.scss';
import request from '../Config/api';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHeart, faFaceSmile, faSpa, faCartShopping, faArrowRight } from '@fortawesome/free-solid-svg-icons';

import { useNavigate } from 'react-router-dom';

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import addToCartProduct from '../utils/HandleCart/AddToCart';
import { useStore } from '../hooks/useStore';
import { getFirstUploadUrl } from '../utils/imageUrl';

const cx = classNames.bind(styles);

const icons = [faShieldHeart, faFaceSmile, faSpa];
const themes = ['green', 'blue', 'beige'];

function Combo() {
    const [combos, setCombos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [buyingId, setBuyingId] = useState('');

    const navigate = useNavigate();
    const { getCart } = useStore();

    useEffect(() => {
        const fetchCombos = async () => {
            try {
                setLoading(true);

                const res = await request.get('/api/combos');

                const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data?.data) ? res.data.data : [];

                setCombos(list);
            } catch (error) {
                console.log(error);
                setCombos([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCombos();
    }, []);

    const marqueeCombos = useMemo(() => {
        if (!combos.length) return [];
        return [...combos, ...combos];
    }, [combos]);

    const handleBuyCombo = async (item) => {
        if (!item?._id || buyingId) return;

        try {
            setBuyingId(item._id);

            const data = await addToCartProduct(item, 1, '');

            toast.success(data?.data?.message || 'Đã thêm combo vào giỏ hàng');

            await getCart();

            navigate('/cart');
        } catch (error) {
            console.log(error);
            toast.error('Vui lòng đăng nhập để mua combo');
        } finally {
            setBuyingId('');
        }
    };

    return (
        <section className={cx('wrapper')}>
            <div className={cx('inner')}>
                <div className={cx('top')}>
                    <span className={cx('subTitle')}>Ưu đãi chăm sóc sức khỏe</span>

                    <h2 className={cx('heading')}>Combo tiết kiệm</h2>

                    <p className={cx('text')}>
                        Lựa chọn các combo sản phẩm thảo dược, massage và chăm sóc sức khỏe với mức giá tốt hơn.
                    </p>
                </div>

                {loading ? (
                    <div className={cx('stateBox')}>
                        <span className={cx('loader')}></span>
                        <p>Đang tải combo...</p>
                    </div>
                ) : combos.length === 0 ? (
                    <div className={cx('stateBox')}>
                        <p>Chưa có combo nào.</p>
                    </div>
                ) : (
                    <div className={cx('marquee')}>
                        <div className={cx('track')}>
                            {marqueeCombos.map((item, index) => {
                                const realIndex = index % combos.length;
                                const image = getFirstUploadUrl(item.img);
                                const isBuying = buyingId === item._id;

                                return (
                                    <article
                                        key={`${item._id}-${index}`}
                                        className={cx('card', themes[realIndex % themes.length])}
                                    >
                                        <div className={cx('shine')}></div>

                                        <div className={cx('content')}>
                                            <span className={cx('tag')}>
                                                <FontAwesomeIcon icon={icons[realIndex % icons.length]} />
                                                Combo hot
                                            </span>

                                            <h3 className={cx('title')}>{item.name}</h3>

                                            <div className={cx('priceBox')}>
                                                <span className={cx('price')}>
                                                    {Number(item.price || 0).toLocaleString('vi-VN')} đ
                                                </span>

                                                <span className={cx('oldPrice')}>
                                                    {Number((item.price || 0) * 1.48).toLocaleString('vi-VN')} đ
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                className={cx('btn')}
                                                disabled={isBuying}
                                                onClick={() => handleBuyCombo(item)}
                                            >
                                                <FontAwesomeIcon icon={faCartShopping} />
                                                {isBuying ? 'Đang thêm...' : 'Mua Combo'}
                                                <FontAwesomeIcon icon={faArrowRight} className={cx('arrow')} />
                                            </button>
                                        </div>

                                        <div className={cx('imageWrap')}>
                                            <div className={cx('imageBox')}>
                                                {image ? (
                                                    <img src={image} alt={item.name} className={cx('image')} />
                                                ) : (
                                                    <div className={cx('noImage')}>No image</div>
                                                )}
                                            </div>
                                        </div>

                                        <FontAwesomeIcon
                                            icon={icons[realIndex % icons.length]}
                                            className={cx('bgIcon')}
                                        />
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

export default Combo;
