import classNames from 'classnames/bind';
import styles from '../Styles/InfoUser.module.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import request from '../Config/api';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import AccountSidebar from '../Pages/ProfileUser/AccountSidebar';
import ProfileCard from '../Pages/ProfileUser/ProfileCard';
import PersonalInfoForm from '../Pages/ProfileUser/PersonalInfoForm';
import OrderActivity from '../Pages/ProfileUser/OrderActivity';
import OrderDetailModal from '../utils/Modal/ModalDetailOder';
import AddressBook from './AddressBook/AddressBook';
import ReviewProduct from '../Pages/ProfileUser/ReviewPro';
import ReminderPage from '../Pages/ProfileUser/ReminderPage';
import CustomerNotifications from '../Pages/ProfileUser/CustomerNotifications';
import MySupportRequests from '../Pages/ProfileUser/MySupportRequests';
import { fetchCustomerNotifications } from '../services/customerSupportService';

const cx = classNames.bind(styles);
const PROFILE_TABS = ['profile', 'orders', 'address', 'reminder', 'review', 'notifications', 'support'];

function InfoUser() {
    const location = useLocation();
    const getInitialTab = () => {
        const tab = new URLSearchParams(location.search).get('tab');
        return PROFILE_TABS.includes(tab) ? tab : 'profile';
    };
    const [activeTab, setActiveTab] = useState(getInitialTab);

    const [dataUser, setDataUser] = useState({});
    const [dataPayments, setDataPayments] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loadingSave, setLoadingSave] = useState(false);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const [selectedSupportRequestId, setSelectedSupportRequestId] = useState(null);

    const [formData, setFormData] = useState({
        fullname: '',
        phone: '',
        email: '',
        surplus: 0,
        avatar: '',
    });

    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');

    const fileInputRef = useRef(null);
    const prevAvatarPreviewRef = useRef('');

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    useEffect(() => {
        const tab = new URLSearchParams(location.search).get('tab');
        if (PROFILE_TABS.includes(tab)) {
            setActiveTab(tab);
        }
    }, [location.search]);

    const fetchUserInfo = useCallback(async () => {
        try {
            if (!document.cookie) return;

            const res = await request.get('/api/auth', {
                withCredentials: true,
            });

            const user = res.data || {};

            setDataUser(user);
            setFormData({
                fullname: user.fullname || '',
                phone: user.phone ? String(user.phone) : '',
                email: user.email || '',
                surplus: user.surplus || 0,
                avatar: user.avatar || '',
            });
            setAvatarPreview(user.avatar || '');
        } catch (err) {
            console.log('Lỗi lấy thông tin user:', err);
        }
    }, []);

    const fetchPayments = useCallback(async () => {
        try {
            if (!document.cookie) return;

            setLoadingOrders(true);

            const res = await request.get('/api/payments', {
                withCredentials: true,
            });

            const orders = Array.isArray(res.data) ? res.data : [];
            setDataPayments([...orders]);
        } catch (err) {
            console.log('Lỗi lấy đơn hàng:', err);
            setDataPayments([]);
        } finally {
            setLoadingOrders(false);
        }
    }, []);

    useEffect(() => {
        fetchUserInfo();
    }, [fetchUserInfo]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const loadUnreadNotifications = useCallback(async () => {
        try {
            const res = await fetchCustomerNotifications();
            setUnreadNotificationCount(res?.unreadCount || 0);
        } catch (error) {
            console.log(error);
        }
    }, []);

    useEffect(() => {
        loadUnreadNotifications();
    }, [loadUnreadNotifications, activeTab]);

    useEffect(() => {
        if (activeTab === 'orders') {
            fetchPayments();
        }
    }, [activeTab, fetchPayments]);

    useEffect(() => {
        if (prevAvatarPreviewRef.current && prevAvatarPreviewRef.current.startsWith('blob:')) {
            URL.revokeObjectURL(prevAvatarPreviewRef.current);
        }

        prevAvatarPreviewRef.current = avatarPreview;

        return () => {
            if (prevAvatarPreviewRef.current && prevAvatarPreviewRef.current.startsWith('blob:')) {
                URL.revokeObjectURL(prevAvatarPreviewRef.current);
            }
        };
    }, [avatarPreview]);

    const avatarSrc = useMemo(() => {
        return (
            avatarPreview ||
            'https://media.istockphoto.com/id/1300845620/vector/user-icon-flat-isolated-on-white-background-user-symbol-vector-illustration.jpg?s=612x612&w=0&k=20&c=yBeyba0hUkh14_jgv1OKqIH0CCSWU_4ckRkAoy2p73o='
        );
    }, [avatarPreview]);

    const formatMemberSince = (date) => {
        if (!date) return 'Chưa cập nhật';

        const d = new Date(date);
        if (Number.isNaN(d.getTime())) return 'Chưa cập nhật';

        return `Tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
    };

    const handleLogOut = () => {
        request
            .post('/api/logout')
            .then(() => {
                setTimeout(() => {
                    window.location.href = '/';
                }, 800);
            })
            .catch((err) => console.log(err));
    };

    const handleChangeValue = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleChooseAvatar = () => {
        fileInputRef.current?.click();
    };

    const handleChangeAvatar = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chọn file ảnh hợp lệ');
            return;
        }

        setAvatarFile(file);

        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
    };

    const handleCancel = () => {
        setFormData({
            fullname: dataUser.fullname || '',
            phone: dataUser.phone ? String(dataUser.phone) : '',
            email: dataUser.email || '',
            surplus: dataUser.surplus || 0,
            avatar: dataUser.avatar || '',
        });

        setAvatarFile(null);
        setAvatarPreview(dataUser.avatar || '');
    };

    const handleSaveUser = async () => {
        try {
            setLoadingSave(true);

            const payload = new FormData();
            payload.append('fullname', formData.fullname);
            payload.append('phone', formData.phone);
            payload.append('email', formData.email);

            if (avatarFile) {
                payload.append('avatar', avatarFile);
            }

            const res = await request.put('/api/auth/update-profile', payload, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                withCredentials: true,
            });

            const updatedUser = res.data?.user || res.data || {};

            setDataUser(updatedUser);
            setFormData({
                fullname: updatedUser.fullname || '',
                phone: updatedUser.phone ? String(updatedUser.phone) : '',
                email: updatedUser.email || '',
                surplus: updatedUser.surplus || 0,
                avatar: updatedUser.avatar || '',
            });

            if (avatarPreview && avatarPreview.startsWith('blob:')) {
                URL.revokeObjectURL(avatarPreview);
            }

            setAvatarPreview(updatedUser.avatar || '');
            setAvatarFile(null);

            alert('Cập nhật thông tin thành công');
        } catch (error) {
            console.error('save user error', error);
            const message = error?.response?.data?.message || 'Cập nhật thông tin thất bại';
            alert(message);
        } finally {
            setLoadingSave(false);
        }
    };

    const handleCancelOrderSuccess = async () => {
        await fetchPayments();
    };

    const renderRightContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <>
                        <ProfileCard
                            fullName={formData.fullname || 'Người dùng'}
                            avatarSrc={avatarSrc}
                            onChooseAvatar={handleChooseAvatar}
                            fileInputRef={fileInputRef}
                            onChangeAvatar={handleChangeAvatar}
                            memberSince={formatMemberSince(dataUser.createdAt)}
                            memberRank="Thành viên Bạc"
                        />

                        <PersonalInfoForm
                            formData={formData}
                            onChangeValue={handleChangeValue}
                            onSave={handleSaveUser}
                            onCancel={handleCancel}
                            loadingSave={loadingSave}
                        />
                    </>
                );

            case 'orders':
                return loadingOrders ? (
                    <div className={cx('emptyContent')}>Đang tải đơn hàng...</div>
                ) : (
                    <OrderActivity
                        dataPayments={dataPayments}
                        onViewDetail={setSelectedOrder}
                        onCancelSuccess={handleCancelOrderSuccess}
                    />
                );

            case 'address':
                return <AddressBook />;

            case 'reminder':
                return <ReminderPage />;

            case 'review':
                return <ReviewProduct dataPayments={dataPayments} />;

            case 'notifications':
                return (
                    <CustomerNotifications
                        onUnreadCountChange={setUnreadNotificationCount}
                        onOpenSupportRequest={(supportRequestId) => {
                            setSelectedSupportRequestId(supportRequestId);
                            setActiveTab('support');
                        }}
                    />
                );

            case 'support':
                return (
                    <MySupportRequests
                        initialRequestId={selectedSupportRequestId}
                        onSelectRequest={setSelectedSupportRequestId}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className={cx('wrapper')}>
            <Header />

            <main className={cx('main')}>
                <div className={cx('breadcrumb')}>
                    <span>Trang chủ</span>
                    <span className={cx('slash')}>/</span>
                    <span className={cx('active')}>Thông tin tài khoản</span>
                </div>

                <div className={cx('content')}>
                    <AccountSidebar
                        onLogout={handleLogOut}
                        activeKey={activeTab}
                        onChangeTab={setActiveTab}
                        unreadNotificationCount={unreadNotificationCount}
                    />
                    <section className={cx('mainContent')}>{renderRightContent()}</section>
                </div>
            </main>

            <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
            <ToastContainer position="top-right" autoClose={3000} />
            <Footer />
        </div>
    );
}

export default InfoUser;
