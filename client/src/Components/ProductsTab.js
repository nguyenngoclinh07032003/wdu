import classNames from 'classnames/bind';
import styles from '../Styles/ProductsTab.module.scss';

import HotProducts from './ProductsTab/HotProducts.js';
import ProductList from './ProductsTab/ProductList.js';

const cx = classNames.bind(styles);

function ProductsTab({ dataProducts = [] }) {
    return (
        <div className={cx('wrapper')}>
            <HotProducts dataProducts={dataProducts} />
            <ProductList dataProducts={dataProducts} limit={8} />
        </div>
    );
}

export default ProductsTab;
