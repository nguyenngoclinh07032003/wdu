import React, { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../Styles/Admin.module.scss';
import 'react-toastify/dist/ReactToastify.css';

import SlideBar from './SlideBar/SlideBar';
import HomePage from './HomePage/HomePage';
import { requestDoctor } from '../../Config/api';
import { useNavigate } from 'react-router-dom';

const cx = classNames.bind(styles);

const Doctor = () => {
    const navigate = useNavigate();
    const [checkTypeSlideBar, setCheckTypeSlideBar] = useState(1);
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        document.title = 'Khu vực Bác sĩ';
    }, []);

    useEffect(() => {
        let isMounted = true;

        const fetchDoctor = async () => {
            try {
                await requestDoctor();
                if (!isMounted) return;
                setAllowed(true);
            } catch (error) {
                if (!isMounted) return;
                setAllowed(false);
                navigate('/', { replace: true });
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchDoctor();

        return () => {
            isMounted = false;
        };
    }, [navigate]);

    if (loading) {
        return <div style={{ padding: '20px' }}>Đang tải trang Bác sĩ...</div>;
    }

    if (!allowed) {
        return null;
    }

    return (
        <div className={cx('wrapper')}>
            <div className={cx('slidebar')}>
                <SlideBar setCheckTypeSlideBar={setCheckTypeSlideBar} checkTypeSlideBar={checkTypeSlideBar} />
            </div>

            <div className={cx('home-page')}>
                <HomePage checkTypeSlideBar={checkTypeSlideBar} />
            </div>
        </div>
    );
};

export default Doctor;
