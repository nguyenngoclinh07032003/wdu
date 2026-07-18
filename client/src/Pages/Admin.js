import React, { useCallback, useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from '../Styles/Admin.module.scss';
import 'react-toastify/dist/ReactToastify.css';

import SlideBar from './Admin/SlideBar/SlideBar';
import HomePage from './Admin/HomePage/HomePage';
import { requestAdmin } from '../Config/api';
import { fetchSupportRequestPendingCount } from '../services/supportRequestService';
import { useNavigate } from 'react-router-dom';

const cx = classNames.bind(styles);

const Admin = () => {
    const navigate = useNavigate();
    const [checkTypeSlideBar, setCheckTypeSlideBar] = useState(1);
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);
    const [supportPendingCount, setSupportPendingCount] = useState(0);

    useEffect(() => {
        document.title = 'Quản Trị Admin';
    }, []);

    useEffect(() => {
        let isMounted = true;

        const fetchAdmin = async () => {
            try {
                await requestAdmin();

                if (!isMounted) return;
                setAllowed(true);
            } catch (error) {
                if (!isMounted) return;
                setAllowed(false);
                navigate('/', { replace: true });
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchAdmin();

        return () => {
            isMounted = false;
        };
    }, [navigate]);

    const loadSupportPendingCount = useCallback(async () => {
        try {
            const res = await fetchSupportRequestPendingCount();
            setSupportPendingCount(res?.pendingCount || 0);
        } catch (error) {
            console.log(error);
        }
    }, []);

    useEffect(() => {
        if (!allowed) return;
        loadSupportPendingCount();
        const timer = setInterval(loadSupportPendingCount, 30000);
        return () => clearInterval(timer);
    }, [allowed, loadSupportPendingCount]);

    if (loading) {
        return <div style={{ padding: '20px' }}>Đang tải trang quản trị...</div>;
    }

    if (!allowed) {
        return null;
    }

    return (
        <div className={cx('wrapper')}>
            <div className={cx('slidebar')}>
                <SlideBar
                    setCheckTypeSlideBar={setCheckTypeSlideBar}
                    checkTypeSlideBar={checkTypeSlideBar}
                    supportPendingCount={supportPendingCount}
                />
            </div>

            <div className={cx('home-page')}>
                <HomePage checkTypeSlideBar={checkTypeSlideBar} />
            </div>
        </div>
    );
};

export default Admin;
