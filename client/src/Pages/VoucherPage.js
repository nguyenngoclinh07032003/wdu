import { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../Styles/VoucherPage.module.scss';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import request from '../Config/api';
import Chatbot from '../utils/Chatbot/Chatbot';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const cx = classNames.bind(styles);

function VoucherPage() {
    const [vouchers, setVouchers] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVouchers = async () => {
            try {
                setLoading(true);

                const res = await request.get('/api/vouchers');

                setVouchers(Array.isArray(res.data) ? res.data : []);
            } catch (error) {
                console.log(error);
                toast.error('Không thể tải danh sách voucher');
            } finally {
                setLoading(false);
            }
        };

        fetchVouchers();
    }, []);

    const filteredVouchers = useMemo(() => {
        if (activeTab === 'all') return vouchers;

        return vouchers.filter((item) => item.category === activeTab);
    }, [vouchers, activeTab]);

    const formatDate = (date) => {
        if (!date) return '--';

        return new Date(date).toLocaleDateString('vi-VN');
    };

    const getVoucherLabel = (voucher) => {
        if (voucher.discountType === 'percent') {
            return `${voucher.discountValue}%`;
        }

        if (voucher.discountValue >= 1000000) {
            return `${voucher.discountValue / 1000000}M`;
        }

        if (voucher.discountValue >= 1000) {
            return `${voucher.discountValue / 1000}K`;
        }

        return `${voucher.discountValue}`;
    };

    const getVoucherUsed = (voucher) => {
        return Number(voucher.used || 0);
    };

    const getVoucherQuantity = (voucher) => {
        return Number(voucher.quantity || 0);
    };

    const getUsagePercent = (voucher) => {
        const used = getVoucherUsed(voucher);
        const quantity = getVoucherQuantity(voucher);

        if (!quantity) return 0;

        return Math.min((used / quantity) * 100, 100);
    };

    const handleCopyVoucher = async (code) => {
        try {
            await navigator.clipboard.writeText(code);

            toast.success(`Đã copy mã ${code}`, {
                position: 'top-right',
                autoClose: 1800,
            });
        } catch (error) {
            toast.error('Không thể copy mã voucher');
        }
    };

    return (
        <div className={cx('page')}>
            <ToastContainer />

            <Header />

            <main className={cx('wrapper')}>
                <section className={cx('hero')}>
                    <div className={cx('heroContent')}>
                        <span>ƯU ĐÃI ĐẶC QUYỀN</span>

                        <h1>
                            Chăm Sóc Sức Khỏe
                            <br />
                            Với Chi Phí Tối Ưu
                        </h1>

                        <p>
                            Khám phá các mã ưu đãi độc quyền dành cho sản phẩm và dịch vụ chăm sóc sức khỏe. Tiết kiệm
                            ngay hôm nay!
                        </p>

                        <div className={cx('heroActions')}>
                            <button>Ưu Đãi Của Tôi</button>
                            <button>Hướng Dẫn Sử Dụng</button>
                        </div>
                    </div>
                </section>

                <div className={cx('tabs')}>
                    <button
                        className={cx({
                            active: activeTab === 'all',
                        })}
                        onClick={() => setActiveTab('all')}
                    >
                        Tất Cả
                    </button>

                    <button
                        className={cx({
                            active: activeTab === 'shipping',
                        })}
                        onClick={() => setActiveTab('shipping')}
                    >
                        Vận Chuyển
                    </button>

                    <button
                        className={cx({
                            active: activeTab === 'device',
                        })}
                        onClick={() => setActiveTab('device')}
                    >
                        Sản Phẩm
                    </button>
                </div>

                {loading ? (
                    <p className={cx('loading')}>Đang tải voucher...</p>
                ) : (
                    <div className={cx('voucherGrid')}>
                        {filteredVouchers.length === 0 ? (
                            <p className={cx('empty')}>Không có voucher khả dụng</p>
                        ) : (
                            filteredVouchers.map((voucher) => (
                                <div key={voucher._id} className={cx('voucherCard')}>
                                    <div className={cx('voucherLeft')}>
                                        <strong>{getVoucherLabel(voucher)}</strong>

                                        <span>{voucher.discountType === 'percent' ? 'GIẢM GIÁ' : 'GIẢM TIỀN'}</span>
                                    </div>

                                    <div className={cx('voucherInfo')}>
                                        <h3>{voucher.title}</h3>

                                        <p>
                                            Mã: <strong>{voucher.code}</strong>
                                        </p>

                                        <p>Hết hạn: {formatDate(voucher.expiredAt)}</p>

                                        <div className={cx('usedText')}>
                                            Đã sử dụng {getVoucherUsed(voucher)}/{getVoucherQuantity(voucher)} (
                                            {Math.round(getUsagePercent(voucher))}
                                            %)
                                        </div>

                                        <div className={cx('progress')}>
                                            <span
                                                style={{
                                                    width: `${getUsagePercent(voucher)}%`,
                                                }}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            className={cx('saveBtn')}
                                            onClick={() => handleCopyVoucher(voucher.code)}
                                        >
                                            Lưu Voucher
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>

            <Footer />
            <Chatbot />
        </div>
    );
}

export default VoucherPage;
