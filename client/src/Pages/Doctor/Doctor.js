import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../Styles/DoctorPortal.module.scss';
import 'react-toastify/dist/ReactToastify.css';
import { io } from 'socket.io-client';

import SlideBar from './SlideBar/SlideBar';
import DoctorTopBar from './Components/DoctorTopBar';
import HomePage from './HomePage/HomePage';
import request, { requestDoctor } from '../../Config/api';
import { useNavigate } from 'react-router-dom';

const cx = classNames.bind(styles);

const Doctor = () => {
    const navigate = useNavigate();
    const [checkTypeSlideBar, setCheckTypeSlideBar] = useState(0);
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);
    const [inboxUnreadTotal, setInboxUnreadTotal] = useState(0);
    const [inboxRefreshKey, setInboxRefreshKey] = useState(0);
    const [doctorName, setDoctorName] = useState('');
    const [inboxInitialFilter, setInboxInitialFilter] = useState('pending');

    useEffect(() => {
        document.title = 'Healthcare Doctor Portal';
    }, []);

    useEffect(() => {
        let isMounted = true;

        const fetchDoctor = async () => {
            try {
                await requestDoctor();
                if (!isMounted) return;
                setAllowed(true);
                try {
                    const authRes = await request.get('/api/auth');
                    const user = authRes?.data?.user || authRes?.data || {};
                    setDoctorName(user?.fullname || user?.email || '');
                } catch (e) {
                    // ignore
                }
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

    const fetchUnreadSummary = useCallback(async () => {
        try {
            const res = await request.get('/api/doctor-inbox/inbox/unread-summary');
            setInboxUnreadTotal(res?.data?.totalUnread || 0);
        } catch (error) {
            console.log('fetchUnreadSummary error:', error);
        }
    }, []);

    const handleUnreadChange = useCallback((total) => {
        setInboxUnreadTotal(total || 0);
    }, []);

    useEffect(() => {
        if (!allowed) return;

        fetchUnreadSummary();

        const socket = io(process.env.REACT_APP_SERVER, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
        });

        socket.emit('join', 'doctor-inbox');

        const onInboxUpdate = () => {
            fetchUnreadSummary();
            setInboxRefreshKey((key) => key + 1);
        };

        socket.on('doctor-inbox:update', onInboxUpdate);
        const pollTimer = setInterval(fetchUnreadSummary, 12000);

        return () => {
            socket.off('doctor-inbox:update', onInboxUpdate);
            socket.emit('leave', 'doctor-inbox');
            socket.disconnect();
            clearInterval(pollTimer);
        };
    }, [allowed, fetchUnreadSummary]);

    const openInbox = (filter = 'pending') => {
        setInboxInitialFilter(filter == null ? 'pending' : filter);
        setCheckTypeSlideBar(3);
    };

    if (loading) {
        return <div style={{ padding: '20px' }}>Đang tải trang Bác sĩ...</div>;
    }

    if (!allowed) {
        return null;
    }

    return (
        <div className={cx('portal')}>
            <SlideBar
                setCheckTypeSlideBar={setCheckTypeSlideBar}
                checkTypeSlideBar={checkTypeSlideBar}
                inboxUnreadTotal={inboxUnreadTotal}
            />

            <div className={cx('mainColumn')}>
                <DoctorTopBar
                    doctorName={doctorName}
                    inboxUnreadTotal={inboxUnreadTotal}
                    onOpenInbox={() => openInbox('unread')}
                    onSearch={(q) => {
                        if (q) openInbox('');
                    }}
                />

                <div className={cx('content')}>
                    <HomePage
                        checkTypeSlideBar={checkTypeSlideBar}
                        setCheckTypeSlideBar={setCheckTypeSlideBar}
                        onInboxUnreadChange={handleUnreadChange}
                        inboxRefreshKey={inboxRefreshKey}
                        inboxInitialFilter={inboxInitialFilter}
                        onOpenInbox={openInbox}
                    />
                </div>
            </div>
        </div>
    );
};

export default Doctor;
