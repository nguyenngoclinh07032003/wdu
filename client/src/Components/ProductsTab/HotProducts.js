import classNames from 'classnames/bind';
import styles from '../../Styles/ProductsTab.module.scss';
import CardBody from '../CardBody';
import { useMemo } from 'react';

import icon from '../../assests/icons/icon.png';
import banner4 from '../../assests/banner/banner4.png';
import banner5 from '../../assests/banner/banner5.png';

const cx = classNames.bind(styles);

function ProductsTab({ dataProducts = [] }) {
    const hotProducts = useMemo(() => {
        const arr = Array.isArray(dataProducts) ? dataProducts : [];
        return [...arr].sort((a, b) => (b?.sold ?? 0) - (a?.sold ?? 0)).slice(0, 4);
    }, [dataProducts]);

    return (
        <div className={cx('container')}>
            {/* ROW 1: HOT PRODUCTS */}
            {!!hotProducts.length && (
                <section className={cx('hotSection')}>
                    <header className={cx('hotHeader')}>
                        <h1>SẢN PHẨM HOT</h1>
                        <div className={cx('leaf')}>
                            <img src={icon} alt="leaf" />
                        </div>
                    </header>

                    <div className={cx('productsGrid')}>
                        {hotProducts.map((item) => (
                            <div key={item?._id || item?.slug} className={cx('col3')}>
                                <CardBody item={item} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ROW 2: BANNERS */}
            <section className={cx('bannerRow')}>
                <a className={cx('bannerCol')} href="/shop">
                    <img className={cx('bannerImg')} src={banner4} alt="Banner Logo" loading="lazy" />
                </a>

                <a className={cx('bannerCol')} href="/shop">
                    <img className={cx('bannerImg')} src={banner5} alt="" loading="lazy" />
                </a>
            </section>
        </div>
    );
}

export default ProductsTab;
