import classNames from 'classnames/bind';
import styles from '../../Styles/ProductsTab.module.scss';
import CardBody from '../CardBody';
import { useMemo, useState } from 'react';
import icon from '../../assests/icons/icon.png';

const cx = classNames.bind(styles);

const TABS = [
    // { id: '0', label: 'Tất cả sản phẩm' }, // đổi thành '0' để khỏi trùng type
    { id: '1', label: 'Dụng cụ massage' },
    { id: '2', label: 'Dưỡng sinh ngải cứu' },
    { id: '3', label: 'Tinh dầu & thảo dược' },
    { id: '4', label: 'Chăm sóc tóc & da đầu' },
];

function ProductList({ dataProducts = [], limit = 8 }) {
    const [checkList, setCheckList] = useState('1');

    const filteredProducts = useMemo(() => {
        if (checkList === '0') return dataProducts; // tất cả
        return dataProducts.filter((item) => String(item?.type) === checkList);
    }, [dataProducts, checkList]);

    const displayProducts = useMemo(() => {
        return filteredProducts.slice(0, limit);
    }, [filteredProducts, limit]);

    return (
        <section>
            {/* header Danh sách sản phẩm */}
            <header>
                <h1>DANH SÁCH SẢN PHẨM</h1>
                <div className={cx('leaf')}>
                    <img src={icon} alt="leaf" />
                </div>

                <div className={cx('list-select')}>
                    <ul style={{ padding: 0 }}>
                        {TABS.map((tab) => (
                            <li
                                key={tab.id}
                                onClick={() => setCheckList(tab.id)}
                                className={checkList === tab.id ? cx('active-list') : undefined}
                            >
                                {tab.label}
                            </li>
                        ))}
                    </ul>
                </div>
            </header>

            <main className={cx('main')}>
                {displayProducts.map((item) => (
                    <CardBody key={item._id} item={item} />
                ))}
            </main>
        </section>
    );
}

export default ProductList;
