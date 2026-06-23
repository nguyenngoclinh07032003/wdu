import classNames from 'classnames/bind';
import styles from '../Styles/FeatureGrid.module.scss';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import request from '../Config/api';

const cx = classNames.bind(styles);

const SERVER_URL = process.env.REACT_APP_SERVER || 'http://localhost:5001';
const IMAGE_URL = process.env.REACT_APP_IMG || 'http://localhost:5001/uploads';

const getImageUrl = (path) => {
    if (!path) return '';

    const value = String(path).trim();

    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('/uploads/')) return `${SERVER_URL}${value}`;
    if (value.startsWith('uploads/')) return `${SERVER_URL}/${value}`;

    return `${IMAGE_URL}/${value}`;
};

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
                        <Link key={item._id} to={`/blogs/${item.slug}`} className={cx('card')}>
                            <div className={cx('image')}>
                                <img src={getImageUrl(item.thumbnail)} alt={item.title} />
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
