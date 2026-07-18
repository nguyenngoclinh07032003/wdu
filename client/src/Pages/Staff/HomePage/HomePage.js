import { useState } from 'react';
import ManagerProduct from '../../../Components/ManageProducts';
import AddProducts from '../../Admin/ComponentsAdmin/AddProducts/AddProducts';
import ManageOrder from '../../../Components/ManageOrder';
import ManageShipper from '../../../Components/ManageShipper';
import StaffInbox from '../Components/StaffInbox';
import StaffSupportRequests from '../Components/StaffSupportRequests';
import StaffDashboard from '../Components/StaffDashboard';
import classNames from 'classnames/bind';
import panelStyles from '../../../Styles/DoctorPanel.module.scss';

const cx = classNames.bind(panelStyles);

function HomePage({
    checkTypeSlideBar,
    onSupportPendingCountChange,
    onInboxUnreadChange,
    onNavigate,
    refreshKey,
    inboxInitialFilter,
    notifCount = 0,
}) {
    const [checkOpenAddProduct, setCheckOpenAddProduct] = useState(false);

    return (
        <div>
            {checkTypeSlideBar === 1 ? (
                <StaffDashboard
                    onNavigate={onNavigate}
                    refreshKey={refreshKey}
                    notifCount={notifCount}
                />
            ) : null}

            {checkTypeSlideBar === 2 ? (
                <div className={cx('doctorPage')}>
                    <ManageOrder allowCancelOrder={false} />
                </div>
            ) : null}

            {checkTypeSlideBar === 3 ? (
                <div className={cx('doctorPage')}>
                    {checkOpenAddProduct ? (
                        <AddProducts setCheckOpenAddProduct={setCheckOpenAddProduct} />
                    ) : (
                        <ManagerProduct setCheckOpenAddProduct={setCheckOpenAddProduct} />
                    )}
                </div>
            ) : null}

            {checkTypeSlideBar === 4 ? (
                <div className={cx('doctorPage')}>
                    <ManageShipper />
                </div>
            ) : null}

            {checkTypeSlideBar === 5 ? (
                <StaffInbox
                    onUnreadChange={onInboxUnreadChange}
                    initialFilter={inboxInitialFilter}
                    refreshKey={refreshKey}
                />
            ) : null}

            {checkTypeSlideBar === 6 ? (
                <div className={cx('doctorPage')}>
                    <StaffSupportRequests onPendingCountChange={onSupportPendingCountChange} />
                </div>
            ) : null}
        </div>
    );
}

export default HomePage;
