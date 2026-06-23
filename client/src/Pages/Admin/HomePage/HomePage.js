import classNames from 'classnames/bind';
import styles from './HomePage.module.scss';

import ManagerProduct from '../../../Components/ManageProducts';

import AddProducts from '../ComponentsAdmin/AddProducts/AddProducts';
import ManageOrder from '../../../Components/ManageOrder';
import { useState } from 'react';
import ManagerUser from '../../../Components/ManagerUser';
import ManageVoucher from '../../../Components/ManageVoucher';
import ManageBlog from '../../../Components/ManageBlog';
import Dashboard from '../../../Components/Dashboard';
import ManageShpper from '../../../Components/ManageShipper';

const cx = classNames.bind(styles);

function HomePage({ checkTypeSlideBar }) {
    const [checkOpenAddProduct, setCheckOpenAddProduct] = useState(false);

    return (
        <div className={cx('wrapper')}>
            {checkTypeSlideBar === 1 ? <Dashboard /> : <></>}
            {checkTypeSlideBar === 2 ? <ManageOrder /> : <></>}
            {checkTypeSlideBar === 3 ? (
                <>
                    {checkOpenAddProduct ? (
                        <AddProducts setCheckOpenAddProduct={setCheckOpenAddProduct} />
                    ) : (
                        <ManagerProduct setCheckOpenAddProduct={setCheckOpenAddProduct} />
                    )}
                </>
            ) : (
                <></>
            )}
            {checkTypeSlideBar === 4 ? <ManagerUser /> : <></>}
            {checkTypeSlideBar === 5 ? <ManageVoucher /> : <></>}
            {checkTypeSlideBar === 6 ? <ManageBlog /> : <></>}
            {checkTypeSlideBar === 7 ? <ManageShpper /> : <></>}
        </div>
    );
}

export default HomePage;
