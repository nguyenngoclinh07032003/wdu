import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../Styles/StaffPortal.module.scss';
import 'react-toastify/dist/ReactToastify.css';
import { io } from 'socket.io-client';

import SlideBar from './SlideBar/SlideBar';
import StaffTopBar from './Components/StaffTopBar';
import HomePage from './HomePage/HomePage';
import request, { requestStaff } from '../../Config/api';
import { fetchSupportRequestPendingCount } from '../../services/supportRequestService';
import { useNavigate } from 'react-router-dom';

const cx = classNames.bind(styles);

const Staff = () => {
    const navigate = useNavigate();
    const [checkTypeSlideBar, setCheckTypeSlideBar] = useState(1);
    const [supportPendingCount, setSupportPendingCount] = useState(0);
    const [inboxUnreadTotal, setInboxUnreadTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);
    const [staffName, setStaffName] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [inboxInitialFilter, setInboxInitialFilter] = useState('pending');

    useEffect(() => {
        document.title = 'Healthcare Staff Panel';
    }, []);

    useEffect(() => {
        let isMounted = true;

        const fetchStaff = async () => {
            try {
                await requestStaff();
                if (!isMounted) return;
                setAllowed(true);
                try {
                    const authRes = await request.get('/api/auth');
                    const user = authRes?.data?.user || authRes?.data || {};
                    setStaffName(user?.fullname || user?.email || '');
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

        fetchStaff();
        return () => {
            isMounted = false;
        };
    }, [navigate]);

    const fetchUnreadSummary = useCallback(async () => {
        try {
            const res = await request.get('/api/staff-inbox/inbox/unread-summary');
            setInboxUnreadTotal(res?.data?.totalUnread || 0);
        } catch (error) {
            console.log(error);
        }
    }, []);

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
        fetchUnreadSummary();
        loadSupportPendingCount();

        const socket = io(process.env.REACT_APP_SERVER, {
            withCredentials: true,
            transports: ['websocket', 'polling'],
        });
        socket.emit('join', 'staff-inbox');
        const onUpdate = () => {
            fetchUnreadSummary();
            setRefreshKey((k) => k + 1);
        };
        socket.on('staff-inbox:update', onUpdate);
        const timer = setInterval(() => {
            fetchUnreadSummary();
            loadSupportPendingCount();
        }, 12000);

        return () => {
            socket.off('staff-inbox:update', onUpdate);
            socket.emit('leave', 'staff-inbox');
            socket.disconnect();
            clearInterval(timer);
        };
    }, [allowed, fetchUnreadSummary, loadSupportPendingCount]);

    const handleNavigate = (tab, filter) => {
        if (filter) setInboxInitialFilter(filter);
        setCheckTypeSlideBar(tab);
    };

    if (loading) {
        return <div style={{ padding: '20px' }}>Đang tải trang Staff...</div>;
    }

    if (!allowed) {
        return null;
    }

    return (
        <div className={cx('portal')}>
            <SlideBar
                setCheckTypeSlideBar={setCheckTypeSlideBar}
                checkTypeSlideBar={checkTypeSlideBar}
                supportPendingCount={supportPendingCount}
                inboxUnreadTotal={inboxUnreadTotal}
            />

            <div className={cx('mainColumn')}>
                {checkTypeSlideBar !== 1 ? (
                    <StaffTopBar
                        staffName={staffName}
                        inboxUnreadTotal={inboxUnreadTotal}
                        supportPendingCount={supportPendingCount}
                        onOpenInbox={() => handleNavigate(5, 'pending')}
                    />
                ) : null}

                <div className={cx('content')}>
                    <HomePage
                        checkTypeSlideBar={checkTypeSlideBar}
                        setCheckTypeSlideBar={setCheckTypeSlideBar}
                        onSupportPendingCountChange={setSupportPendingCount}
                        onInboxUnreadChange={setInboxUnreadTotal}
                        onNavigate={handleNavigate}
                        refreshKey={refreshKey}
                        inboxInitialFilter={inboxInitialFilter}
                        notifCount={(inboxUnreadTotal || 0) + (supportPendingCount || 0)}
                    />
                </div>
            </div>
        </div>
    );
};

export default Staff;
