import classNames from 'classnames/bind';
import styles from '../Styles/Blog.module.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import request from '../Config/api';
import Chatbot from '../utils/Chatbot/Chatbot';

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const cx = classNames.bind(styles);

const SERVER_URL = process.env.REACT_APP_SERVER;
const IMAGE_URL = process.env.REACT_APP_IMG;

const normalizePath = (path) => {
    if (!path) return '';
    return String(path).trim();
};

const getImageUrl = (path) => {
    const value = normalizePath(path);

    if (!value) return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('blob:')) return value;

    if (value.startsWith('/uploads/')) {
        return `${SERVER_URL}${value}`;
    }

    if (value.startsWith('uploads/')) {
        return `${SERVER_URL}/${value}`;
    }

    return `${IMAGE_URL}/${value.replace(/^\/+/, '')}`;
};

const handleImageError = (e, fallback) => {
    if (e.currentTarget.dataset.errorHandled === 'true') return;
    e.currentTarget.dataset.errorHandled = 'true';
    e.currentTarget.src = fallback;
};

function Blog() {
    const [posts, setPosts] = useState([]);
    const [featuredPost, setFeaturedPost] = useState(null);
    const [mostViewedPosts, setMostViewedPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchValue, setSearchValue] = useState('');
    const [activeCategory, setActiveCategory] = useState('Tất cả');
    const [visibleCount, setVisibleCount] = useState(4);

    const categories = useMemo(() => {
        const base = ['Tất cả'];
        const dynamic = [...new Set(posts.map((item) => item.category).filter(Boolean))];
        return [...base, ...dynamic];
    }, [posts]);

    useEffect(() => {
        window.scrollTo(0, 0);
        fetchBlogData();
    }, []);

    const fetchBlogData = async () => {
        try {
            setLoading(true);

            const [postsRes, featuredRes, viewedRes] = await Promise.all([
                request.get('/api/blogs'),
                request.get('/api/blogs/featured'),
                request.get('/api/blogs/popular'),
            ]);

            setPosts(Array.isArray(postsRes.data?.blogs) ? postsRes.data.blogs : []);
            setFeaturedPost(Array.isArray(featuredRes.data) ? featuredRes.data[0] || null : featuredRes.data || null);
            setMostViewedPosts(Array.isArray(viewedRes.data) ? viewedRes.data : []);
        } catch (error) {
            console.log('Lỗi lấy dữ liệu bài viết:', error);
            setPosts([]);
            setFeaturedPost(null);
            setMostViewedPosts([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredPosts = useMemo(() => {
        let result = [...posts];

        if (activeCategory !== 'Tất cả') {
            result = result.filter((item) => item.category === activeCategory);
        }

        if (searchValue.trim()) {
            const keyword = searchValue.toLowerCase();
            result = result.filter(
                (item) =>
                    item.title?.toLowerCase().includes(keyword) ||
                    item.excerpt?.toLowerCase().includes(keyword) ||
                    item.category?.toLowerCase().includes(keyword) ||
                    item.author?.toLowerCase().includes(keyword),
            );
        }

        return result;
    }, [posts, activeCategory, searchValue]);

    const visiblePosts = filteredPosts.slice(0, visibleCount);

    return (
        <>
            <Header />

            <main className={cx('wrapper')}>
                <section className={cx('hero')}>
                    <div className={cx('heroContent')}>
                        <span className={cx('heroTag')}>DANH MỤC KIẾN THỨC</span>
                        <h1>Cẩm Nang Chăm Sóc Sức Khỏe Gia Đình</h1>
                        <p>
                            Nơi chia sẻ kiến thức hữu ích về chăm sóc sức khỏe và lối sống lành mạnh, giúp bạn nâng cao
                            chất lượng cuộc sống mỗi ngày.
                        </p>

                        <button
                            className={cx('heroBtn')}
                            onClick={() => {
                                const section = document.getElementById('knowledge-posts');
                                if (section) {
                                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }}
                        >
                            Xem mới nhất
                        </button>
                    </div>

                    <div className={cx('heroImage')}>
                        <img
                            src={
                                featuredPost?.thumbnail && !featuredPost.thumbnail.startsWith('blob:')
                                    ? getImageUrl(featuredPost.thumbnail)
                                    : 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1200&auto=format&fit=crop'
                            }
                            alt={featuredPost?.title || 'Kiến thức sức khỏe'}
                            onError={(e) =>
                                handleImageError(
                                    e,
                                    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1200&auto=format&fit=crop',
                                )
                            }
                        />
                    </div>
                </section>

                <section className={cx('topSection')}>
                    <div className={cx('featuredBox')}>
                        {featuredPost ? (
                            <>
                                <div className={cx('featuredThumb')}>
                                    <img
                                        src={
                                            featuredPost.thumbnail && !featuredPost.thumbnail.startsWith('blob:')
                                                ? getImageUrl(featuredPost.thumbnail)
                                                : 'https://via.placeholder.com/600x400?text=Blog+Featured'
                                        }
                                        alt={featuredPost.title}
                                        onError={(e) =>
                                            handleImageError(
                                                e,
                                                'https://via.placeholder.com/600x400?text=Blog+Featured',
                                            )
                                        }
                                    />
                                </div>

                                <div className={cx('featuredContent')}>
                                    <span className={cx('featuredLabel')}>TIN TỨC NỔI BẬT</span>
                                    <h2>{featuredPost.title}</h2>
                                    <p>{featuredPost.excerpt || 'Chưa có mô tả ngắn cho bài viết này.'}</p>

                                    <div className={cx('featuredMeta')}>
                                        <div className={cx('author')}>
                                            <div className={cx('avatar')}>{featuredPost.author?.charAt(0) || 'A'}</div>
                                            <span>{featuredPost.author || 'Admin'}</span>
                                        </div>

                                        <Link to={`/blog/${featuredPost.slug}`} className={cx('detailLink')}>
                                            Xem chi tiết
                                        </Link>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className={cx('empty')}>Chưa có bài viết nổi bật.</div>
                        )}
                    </div>

                    <aside className={cx('sidebar')}>
                        <div className={cx('searchBox')}>
                            <h3>Tìm kiếm bài viết</h3>
                            <input
                                type="text"
                                placeholder="Nhập từ khóa..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </div>

                        <div className={cx('mostViewedBox')}>
                            <h3>Bài viết xem nhiều nhất</h3>
                            <div className={cx('mostViewedList')}>
                                {mostViewedPosts.length > 0 ? (
                                    mostViewedPosts.map((item) => (
                                        <Link to={`/blog/${item.slug}`} key={item._id} className={cx('miniPost')}>
                                            <img
                                                src={
                                                    item.thumbnail && !item.thumbnail.startsWith('blob:')
                                                        ? getImageUrl(item.thumbnail)
                                                        : 'https://via.placeholder.com/120x90?text=Blog'
                                                }
                                                alt={item.title}
                                                onError={(e) =>
                                                    handleImageError(e, 'https://via.placeholder.com/120x90?text=Blog')
                                                }
                                            />
                                            <div>
                                                <h4>{item.title}</h4>
                                                <span>{item.views || 0} lượt xem</span>
                                            </div>
                                        </Link>
                                    ))
                                ) : (
                                    <p>Chưa có dữ liệu bài viết xem nhiều.</p>
                                )}
                            </div>
                        </div>

                        {/* <div className={cx('newsletterBox')}>
                            <h3>Đăng ký nhận bản tin</h3>
                            <p>Nhận ngay mẹo sống khỏe và ưu đãi sản phẩm từ chúng tôi.</p>
                            <input type="email" placeholder="Email của bạn..." />
                            <button>Đăng ký ngay</button>
                        </div> */}

                        {/* <div className={cx('tagBox')}>
                            <h3>Chủ đề hot</h3>
                            <div className={cx('tags')}>
                                <span>#huyetap</span>
                                <span>#tieuduong</span>
                                <span>#meohay</span>
                                <span>#suckhoe</span>
                                <span>#dinhduong</span>
                                <span>#thucpham</span>
                            </div>
                        </div> */}
                    </aside>
                </section>

                <section className={cx('categorySection')} id="knowledge-posts">
                    <div className={cx('categoryList')}>
                        {categories.map((item) => (
                            <button
                                key={item}
                                className={cx('categoryBtn', { active: activeCategory === item })}
                                onClick={() => {
                                    setActiveCategory(item);
                                    setVisibleCount(4);
                                }}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </section>

                <section className={cx('postsSection')}>
                    {loading ? (
                        <div className={cx('loading')}>Đang tải bài viết...</div>
                    ) : visiblePosts.length === 0 ? (
                        <div className={cx('empty')}>Không tìm thấy bài viết phù hợp.</div>
                    ) : (
                        <div className={cx('postsGrid')}>
                            {visiblePosts.map((item) => (
                                <article key={item._id} className={cx('postCard')}>
                                    <Link to={`/blog/${item.slug}`} className={cx('thumb')}>
                                        <img
                                            src={
                                                item.thumbnail && !item.thumbnail.startsWith('blob:')
                                                    ? getImageUrl(item.thumbnail)
                                                    : 'https://via.placeholder.com/400x260?text=Blog'
                                            }
                                            alt={item.title}
                                            onError={(e) =>
                                                handleImageError(e, 'https://via.placeholder.com/400x260?text=Blog')
                                            }
                                        />
                                        <span className={cx('badge')}>{item.category}</span>
                                    </Link>

                                    <div className={cx('cardBody')}>
                                        <Link to={`/blog/${item.slug}`} className={cx('title')}>
                                            {item.title}
                                        </Link>

                                        <p className={cx('excerpt')}>
                                            {item.excerpt || 'Chưa có mô tả ngắn cho bài viết này.'}
                                        </p>

                                        <div className={cx('cardMeta')}>
                                            <span>{item.author || 'Admin'}</span>
                                            <span>{item.readTime || '5 phút đọc'}</span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {visibleCount < filteredPosts.length && (
                        <div className={cx('loadMoreWrap')}>
                            <button className={cx('loadMoreBtn')} onClick={() => setVisibleCount((prev) => prev + 4)}>
                                Xem thêm bài viết
                            </button>
                        </div>
                    )}
                </section>
            </main>

            <Footer />
            <Chatbot />
        </>
    );
}

export default Blog;
