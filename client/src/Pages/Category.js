import classNames from 'classnames/bind';
import styles from '../Styles/Category.module.scss';

import Header from '../Components/Header';
import Footer from '../Components/Footer';
import CardBody from '../Components/CardBody';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import request from '../Config/api';
import Pagination from '../Components/Pagination';
import Chatbot from '../utils/Chatbot/Chatbot';

const cx = classNames.bind(styles);

function Category() {
    const [dataProducts, setDataProducts] = useState([]);
    const [sortOrder, setSortOrder] = useState('1');
    const [page, setPage] = useState(1);
    const [lengthCart, setLengthCart] = useState(0);
    const [loading, setLoading] = useState(true);

    const location = useLocation();
    const navigate = useNavigate();

    const pathName = location.pathname.replace('/category/', '');

    const categoryMap = {
        'dung-cu-massage': 1,
        'duong-sinh-ngai-cuu': 2,
        'tinh-dau-thao-duoc': 3,
        'cham-soc-toc-va-da-dau': 4,
    };

    const reverseCategoryMap = {
        1: 'dung-cu-massage',
        2: 'duong-sinh-ngai-cuu',
        3: 'tinh-dau-thao-duoc',
        4: 'cham-soc-toc-va-da-dau',
    };

    const categoryTitleMap = {
        '': 'Tất cả danh mục',
        1: 'Dụng cụ massage',
        2: 'Dưỡng sinh ngải cứu',
        3: 'Tinh dầu & thảo dược',
        4: 'Chăm sóc tóc & da đầu',
    };

    const checkList = categoryMap[pathName] ?? '';

    useEffect(() => {
        let isMounted = true;

        const fetchProducts = async () => {
            try {
                setLoading(true);
                const res = await request.get('/api/products');
                if (isMounted) {
                    setDataProducts(res.data || []);
                }
            } catch (error) {
                console.log(error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchProducts();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        setPage(1);
        window.scrollTo(0, 0);
    }, [location.pathname]);

    const filteredProducts = useMemo(() => {
        return dataProducts.filter((item) => checkList === '' || item.type === Number(checkList));
    }, [dataProducts, checkList]);

    const sortedProducts = useMemo(() => {
        return [...filteredProducts].sort((a, b) => {
            return sortOrder === '1' ? a.price - b.price : b.price - a.price;
        });
    }, [filteredProducts, sortOrder]);

    const productsPerPage = 8;
    const startIndex = (page - 1) * productsPerPage;
    const currentProducts = sortedProducts.slice(startIndex, startIndex + productsPerPage);
    const totalPages = Math.ceil(sortedProducts.length / productsPerPage);

    const handlePageChange = (event, value) => {
        setPage(value);
        window.scrollTo({
            top: 300,
            behavior: 'smooth',
        });
    };

    const handleChangeCategory = (e) => {
        const value = e.target.value;

        setPage(1);

        if (value === '') {
            navigate('/category');
            return;
        }

        navigate(`/category/${reverseCategoryMap[value]}`);
    };

    return (
        <div className={cx('wrapper')}>
            <ToastContainer />

            <header>
                <Header lengthCart={lengthCart} />
            </header>

            <main className={cx('main')}>
                <section className={cx('hero')}>
                    <div className={cx('heroContent')}>
                        <span className={cx('heroTag')}>HealthCare</span>
                        <h1>Danh mục sản phẩm</h1>
                        <p>
                            “Danh mục sản phẩm chăm sóc sức khỏe từ thảo dược và dụng cụ massage, mang đến sự thư giãn
                            và cân bằng cho cơ thể.”
                        </p>

                        <button
                            className={cx('heroBtn')}
                            // onClick={() => {
                            //     document.querySelector(`.${styles.content}`)?.scrollIntoView({
                            //         behavior: 'smooth',
                            //         block: 'start',
                            //     });
                            // }}
                        >
                            Khám phá ngay →
                        </button>
                    </div>

                    <div className={cx('heroVisual')}>
                        <div className={cx('visualBox', 'visualBoxLarge')}></div>
                        <div className={cx('visualBox', 'visualBoxSmall')}></div>
                        <div className={cx('visualDecor')}></div>
                    </div>
                </section>

                <section className={cx('content')}>
                    <aside className={cx('sidebar')}>
                        <div className={cx('filterCard')}>
                            <h3>Bộ lọc sản phẩm</h3>

                            <div className={cx('filterGroup')}>
                                <label>Loại sản phẩm</label>
                                <select value={checkList} onChange={handleChangeCategory}>
                                    <option value="">Tất cả danh mục</option>
                                    <option value="1">Dụng cụ massage</option>
                                    <option value="2">Dưỡng sinh ngải cứu</option>
                                    <option value="3">Tinh dầu & thảo dược</option>
                                    <option value="4">Chăm sóc tóc & da đầu</option>
                                </select>
                            </div>

                            <div className={cx('filterGroup')}>
                                <label>Sắp xếp giá</label>
                                <select
                                    value={sortOrder}
                                    onChange={(e) => {
                                        setSortOrder(e.target.value);
                                        setPage(1);
                                    }}
                                >
                                    <option value="1">Từ thấp đến cao</option>
                                    <option value="2">Từ cao đến thấp</option>
                                </select>
                            </div>

                            <div className={cx('filterNote')}>
                                <span>{sortedProducts.length}</span> sản phẩm phù hợp
                            </div>
                        </div>
                    </aside>

                    <div className={cx('productsSection')}>
                        <div className={cx('sectionHead')}>
                            <div>
                                <h2>{categoryTitleMap[checkList]}</h2>
                                <p>Hiển thị {sortedProducts.length} sản phẩm</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className={cx('loadingBox')}>Đang tải sản phẩm...</div>
                        ) : currentProducts.length > 0 ? (
                            <div className={cx('card')}>
                                {currentProducts.map((item) => (
                                    <CardBody key={item._id} item={item} />
                                ))}
                            </div>
                        ) : (
                            <div className={cx('emptyState')}>
                                <h4>Chưa có sản phẩm phù hợp</h4>
                                <p>Vui lòng thử lại với danh mục khác.</p>
                            </div>
                        )}

                        {totalPages > 1 && !loading && (
                            <div className={cx('pagination')}>
                                <Pagination totalPages={totalPages} page={page} handlePageChange={handlePageChange} />
                            </div>
                        )}
                    </div>
                </section>
            </main>

            <footer>
                <Footer />
            </footer>

            <Chatbot />
        </div>
    );
}

export default Category;
