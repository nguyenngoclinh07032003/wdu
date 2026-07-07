import classNames from 'classnames/bind';
import styles from '../../Admin/HomePage/HomePage.module.scss';

import ManagerProduct from '../../../Components/ManageProducts';
import AddProducts from '../../Admin/ComponentsAdmin/AddProducts/AddProducts';
import ManageOrder from '../../../Components/ManageOrder';
import Dashboard from '../../../Components/Dashboard';
import ManageShipper from '../../../Components/ManageShipper';
import StaffInbox from '../Components/StaffInbox';
import { useState } from 'react';

const cx = classNames.bind(styles);

function HomePage({ checkTypeSlideBar }) {
    const [checkOpenAddProduct, setCheckOpenAddProduct] = useState(false);

    return (
        <div className={cx('wrapper')}>
            {checkTypeSlideBar === 1 ? <Dashboard /> : null}
            {checkTypeSlideBar === 2 ? <ManageOrder allowCancelOrder={false} /> : null}
            {checkTypeSlideBar === 3 ? (
                checkOpenAddProduct ? (
                    <AddProducts setCheckOpenAddProduct={setCheckOpenAddProduct} />
                ) : (
                    <ManagerProduct setCheckOpenAddProduct={setCheckOpenAddProduct} />
                )
            ) : null}
            {checkTypeSlideBar === 4 ? <ManageShipper /> : null}
            {checkTypeSlideBar === 5 ? <StaffInbox /> : null}
        </div>
    );
}

export default HomePage;
