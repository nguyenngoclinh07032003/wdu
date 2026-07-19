import classNames from 'classnames/bind';
import styles from '../Styles/FeatureGrid.module.scss';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import request from '../Config/api';
import fallbackBlogImage from '../assests/banner/banner5.png';
import { getUploadUrl } from '../utils/imageUrl';

const cx = classNames.bind(styles);

function FeatureGrid() {
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const res = await request.get('/api/blogs/featured');
                setPosts(Array.isArray(res.data) ? res.data : []);
            } catch (error) {
                console.log(error);
            }
        };

        fetchBlogs();
    }, []);

    if (!posts.length) return null;

    return (
        <section className={cx('wrapper')}>
            <div className={cx('inner')}>
                <h2 className={cx('titleSection')}>Cẩm nang sức khỏe</h2>

                <div className={cx('grid')}>
                    {posts.map((item) => (
                        <Link key={item._id} to={`/blog/${item.slug}`} className={cx('card')}>
                            <div className={cx('image')}>
                                <img
                                    src={getUploadUrl(item.thumbnail) || fallbackBlogImage}
                                    alt={item.title}
                                    onError={(event) => {
                                        event.currentTarget.onerror = null;
                                        event.currentTarget.src = fallbackBlogImage;
                                    }}
                                />
                            </div>

                            <div className={cx('content')}>
                                <span className={cx('category')}>{item.category}</span>
                                <h3>{item.title}</h3>
                                <p>{item.excerpt}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default FeatureGrid;
