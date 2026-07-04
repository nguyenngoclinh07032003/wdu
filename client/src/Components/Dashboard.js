import classNames from 'classnames/bind';
import styles from '../Styles/Dashboard.module.scss';

import { useCallback, useEffect, useMemo, useState } from 'react';
import request from '../Config/api';
import { io } from 'socket.io-client';

import * as XLSX from 'xlsx';

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBell,
    faBoxOpen,
    faCartShopping,
    faChartLine,
    faClockRotateLeft,
    faFileExport,
    faMagnifyingGlass,
    faMoneyBillWave,
    faRotate,
    faUsers,
} from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

const socket = io(process.env.REACT_APP_SERVER, {
    withCredentials: true,
    transports: ['websocket'],
});

function Dashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [searchValue, setSearchValue] = useState('');
    const [revenueRange, setRevenueRange] = useState(7);

    const formatMoney = (value) => {
        return Number(value || 0).toLocaleString('vi-VN') + 'đ';
    };

    const formatDateTime = (date) => {
        if (!date) return 'Không rõ';

        return new Date(date).toLocaleString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);

            const res = await request.get(`/api/admin/dashboard?range=${revenueRange}`);

            setDashboard(res.data);
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Fetch dashboard error:', error);
        } finally {
            setLoading(false);
        }
    }, [revenueRange]);

    useEffect(() => {
        fetchDashboard();

        socket.on('dashboard:update', fetchDashboard);

        return () => {
            socket.off('dashboard:update', fetchDashboard);
        };
    }, [fetchDashboard]);

    const handleExportReport = () => {
        if (!dashboard) return;

        const overviewData = [
            {
                'Tổng doanh thu': dashboard.totalRevenue || 0,
                'Doanh thu hôm nay': dashboard.todayRevenue || 0,
                'Đơn hàng đã thanh toán': dashboard.totalOrders || 0,
                'Sản phẩm đã bán': dashboard.totalProducts || 0,
                'Khách hàng mới tuần này': dashboard.newUsers || 0,
                'Tăng trưởng (%)': dashboard.growth || 0,
                'Mốc thống kê': `${revenueRange} ngày gần nhất`,
                'Thời gian xuất': formatDateTime(new Date()),
            },
        ];

        const revenueCompareData = (dashboard.revenueCompare || []).map((item) => ({
            Ngày: item.date,
            'Kỳ hiện tại': item.current || 0,
            'Kỳ trước': item.previous || 0,
        }));

        const revenueByHourData = (dashboard.revenueByHour || []).map((item) => ({
            Giờ: item.hour,
            'Doanh thu': item.total || 0,
        }));

        const topProductsData = (dashboard.topProducts || []).map((product, index) => ({
            STT: index + 1,
            'Tên sản phẩm': product._id || 'Không rõ',
            'Số lượng bán': product.totalSold || 0,
            'Doanh thu': product.totalRevenue || 0,
        }));

        const topCustomersData = (dashboard.topCustomers || []).map((customer, index) => ({
            STT: index + 1,
            'Khách hàng': customer._id || 'Khách hàng',
            'Số đơn hàng': customer.totalOrders || 0,
            'Tổng chi tiêu': customer.totalSpent || 0,
        }));

        const recentOrdersData = (dashboard.recentOrders || []).map((order, index) => ({
            STT: index + 1,
            'Mã đơn': String(order._id || ''),
            'Khách hàng': order.user || order.email || 'Khách hàng',
            Email: order.email || '',
            'Số điện thoại': order.phone || '',
            'Sản phẩm': (order.products || []).map((p) => p.nameProduct).join(', '),
            'Phương thức thanh toán': order.paymentMethod || '',
            'Tổng tiền': order.sumprice || 0,
            'Thời gian': formatDateTime(order.createdAt),
        }));

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overviewData), 'Tong quan');
        XLSX.utils.book_append_sheet(
            workbook,
            XLSX.utils.json_to_sheet(revenueCompareData),
            `So sanh ${revenueRange} ngay`,
        );
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(revenueByHourData), 'Doanh thu theo gio');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(topProductsData), 'San pham ban chay');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(topCustomersData), 'Khach hang cao');
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(recentOrdersData), 'Don hang gan day');

        XLSX.writeFile(
            workbook,
            `bao-cao-dashboard-${revenueRange}-ngay-${new Date().toISOString().slice(0, 10)}.xlsx`,
        );
    };

    const stats = useMemo(() => {
        if (!dashboard) return [];

        return [
            {
                label: 'Tổng doanh thu',
                value: formatMoney(dashboard.totalRevenue),
                icon: faMoneyBillWave,
                tone: 'green',
                sub: `${dashboard.growth >= 0 ? '+' : ''}${dashboard.growth || 0}% so với kỳ trước`,
                trend: dashboard.growth >= 0 ? 'up' : 'down',
            },
            {
                label: 'Doanh thu hôm nay',
                value: formatMoney(dashboard.todayRevenue),
                icon: faChartLine,
                tone: 'blue',
                sub: 'Tính theo đơn đã thanh toán',
                trend: 'neutral',
            },
            {
                label: 'Đơn hàng đã thanh toán',
                value: Number(dashboard.totalOrders || 0).toLocaleString('vi-VN'),
                icon: faCartShopping,
                tone: 'orange',
                sub: 'Không tính đơn đã hủy',
                trend: 'neutral',
            },
            {
                label: 'Sản phẩm đã bán',
                value: Number(dashboard.totalProducts || 0).toLocaleString('vi-VN'),
                icon: faBoxOpen,
                tone: 'purple',
                sub: `${dashboard.newUsers || 0} khách hàng mới tuần này`,
                trend: 'neutral',
            },
        ];
    }, [dashboard]);

    const filteredRecentOrders = useMemo(() => {
        const orders = dashboard?.recentOrders || [];

        if (!searchValue.trim()) return orders;

        const keyword = searchValue.trim().toLowerCase();

        return orders.filter((order) => {
            return (
                String(order._id || '')
                    .toLowerCase()
                    .includes(keyword) ||
                String(order.user || '')
                    .toLowerCase()
                    .includes(keyword) ||
                String(order.email || '')
                    .toLowerCase()
                    .includes(keyword) ||
                String(order.phone || '')
                    .toLowerCase()
                    .includes(keyword)
            );
        });
    }, [dashboard, searchValue]);

    if (loading) {
        return (
            <div className={cx('wrapper')}>
                <div className={cx('loadingBox')}>Đang tải bảng điều khiển...</div>
            </div>
        );
    }

    if (!dashboard) {
        return (
            <div className={cx('wrapper')}>
                <div className={cx('loadingBox')}>Không lấy được dữ liệu dashboard.</div>
            </div>
        );
    }

    return (
        <div className={cx('wrapper')}>
            <div className={cx('topbar')}>
                <div>
                    <p className={cx('eyebrow')}> </p>
                    <h1>Bảng điều khiển</h1>
                    <p className={cx('desc')}>
                        Theo dõi doanh thu, đơn hàng và hoạt động bán hàng theo thời gian thực.
                    </p>
                </div>

                <div className={cx('topbarRight')}>
                    <div className={cx('searchBox')}>
                        <FontAwesomeIcon icon={faMagnifyingGlass} />
                        <input
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            placeholder="Tìm mã đơn, email, SĐT..."
                        />
                    </div>

                    <button className={cx('exportBtn')} onClick={handleExportReport}>
                        <FontAwesomeIcon icon={faFileExport} />
                        Xuất báo cáo
                    </button>

                    <button className={cx('refreshBtn')} onClick={fetchDashboard}>
                        <FontAwesomeIcon icon={faRotate} />
                        Làm mới
                    </button>

                    <button className={cx('bellBtn')}>
                        <FontAwesomeIcon icon={faBell} />
                        <span></span>
                    </button>
                </div>
            </div>

            <div className={cx('updatedLine')}>
                <FontAwesomeIcon icon={faClockRotateLeft} />
                Cập nhật lần cuối: <strong>{lastUpdated ? formatDateTime(lastUpdated) : 'Vừa xong'}</strong>
            </div>

            <div className={cx('statsGrid')}>
                {stats.map((item, index) => (
                    <div key={index} className={cx('statCard')}>
                        <div className={cx('statTop')}>
                            <div className={cx('statIcon', item.tone)}>
                                <FontAwesomeIcon icon={item.icon} />
                            </div>

                            <span className={cx('trendBadge', item.trend)}>{item.sub}</span>
                        </div>

                        <p>{item.label}</p>
                        <h2>{item.value}</h2>
                    </div>
                ))}
            </div>

            <div className={cx('mainGrid')}>
                <div className={cx('chartPanel')}>
                    <div className={cx('panelHeader')}>
                        <div>
                            <h3>So sánh doanh thu {revenueRange} ngày</h3>
                            <p>Kỳ hiện tại so với {revenueRange} ngày trước đó</p>
                        </div>

                        <select
                            className={cx('rangeSelect')}
                            value={revenueRange}
                            onChange={(e) => setRevenueRange(Number(e.target.value))}
                        >
                            <option value={7}>7 ngày</option>
                            <option value={15}>15 ngày</option>
                            <option value={30}>30 ngày</option>
                        </select>
                    </div>

                    <div className={cx('chartBox')}>
                        <ResponsiveContainer width="100%" height={360}>
                            <AreaChart data={dashboard.revenueCompare || []}>
                                <defs>
                                    <linearGradient id="currentRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8fcf5b" stopOpacity={0.45} />
                                        <stop offset="95%" stopColor="#8fcf5b" stopOpacity={0} />
                                    </linearGradient>

                                    <linearGradient id="previousRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" />
                                <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                                <Tooltip formatter={(value) => [formatMoney(value), 'Doanh thu']} />
                                <Legend />

                                <Area
                                    type="monotone"
                                    dataKey="current"
                                    name="Kỳ hiện tại"
                                    stroke="#6aaa3b"
                                    strokeWidth={3}
                                    fill="url(#currentRevenueGradient)"
                                />

                                <Area
                                    type="monotone"
                                    dataKey="previous"
                                    name="Kỳ trước"
                                    stroke="#94a3b8"
                                    strokeWidth={2}
                                    fill="url(#previousRevenueGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={cx('sideColumn')}>
                    <div className={cx('panelCard')}>
                        <div className={cx('panelHeaderSmall')}>
                            <h3>Sản phẩm bán chạy</h3>
                        </div>

                        <div className={cx('rankList')}>
                            {(dashboard.topProducts || []).map((product, index) => (
                                <div key={index} className={cx('rankItem')}>
                                    <div className={cx('rankLeft')}>
                                        <span className={cx('rankNumber')}>{index + 1}</span>

                                        <div>
                                            <strong>{product._id || 'Không rõ'}</strong>
                                            <p>{formatMoney(product.totalRevenue)}</p>
                                        </div>
                                    </div>

                                    <b>{product.totalSold || 0} bán</b>
                                </div>
                            ))}

                            {dashboard.topProducts?.length === 0 && <p className={cx('emptyText')}>Chưa có dữ liệu.</p>}
                        </div>
                    </div>

                    <div className={cx('panelCard')}>
                        <div className={cx('panelHeaderSmall')}>
                            <h3>Khách hàng chi tiêu cao</h3>
                        </div>

                        <div className={cx('rankList')}>
                            {(dashboard.topCustomers || []).map((customer, index) => (
                                <div key={index} className={cx('rankItem')}>
                                    <div className={cx('rankLeft')}>
                                        <span className={cx('avatarMini')}>
                                            <FontAwesomeIcon icon={faUsers} />
                                        </span>

                                        <div>
                                            <strong>{customer._id || 'Khách hàng'}</strong>
                                            <p>{customer.totalOrders || 0} đơn hàng</p>
                                        </div>
                                    </div>

                                    <b>{formatMoney(customer.totalSpent)}</b>
                                </div>
                            ))}

                            {dashboard.topCustomers?.length === 0 && (
                                <p className={cx('emptyText')}>Chưa có dữ liệu.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className={cx('chartPanel', 'hourChartPanel')}>
                <div className={cx('panelHeader')}>
                    <div>
                        <h3>Doanh thu hôm nay theo giờ</h3>
                        <p>Theo dõi khung giờ bán hàng hiệu quả trong ngày</p>
                    </div>
                </div>

                <div className={cx('chartBox')}>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={dashboard.revenueByHour || []}>
                            <defs>
                                <linearGradient id="hourRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="hour" />
                            <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                            <Tooltip formatter={(value) => [formatMoney(value), 'Doanh thu']} />

                            <Area
                                type="monotone"
                                dataKey="total"
                                name="Doanh thu"
                                stroke="#f59e0b"
                                strokeWidth={3}
                                fill="url(#hourRevenueGradient)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className={cx('ordersPanel')}>
                <div className={cx('panelHeader')}>
                    <div>
                        <h3>Đơn hàng thanh toán gần đây</h3>
                        <p>Realtime khi khách hàng thanh toán thành công</p>
                    </div>
                </div>

                <div className={cx('tableWrap')}>
                    <table>
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Khách hàng</th>
                                <th>Sản phẩm</th>
                                <th>Thanh toán</th>
                                <th>Tổng tiền</th>
                                <th>Thời gian</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRecentOrders.map((order) => (
                                <tr key={order._id}>
                                    <td>
                                        <strong>#{String(order._id).slice(-8)}</strong>
                                    </td>

                                    <td>
                                        <div className={cx('customerCell')}>
                                            <strong>{order.user || order.email || 'Khách hàng'}</strong>
                                            <span>{order.phone || 'Không có SĐT'}</span>
                                        </div>
                                    </td>

                                    <td>
                                        {(order.products || [])
                                            .slice(0, 2)
                                            .map((p) => p.nameProduct)
                                            .join(', ') || 'Không rõ'}
                                    </td>

                                    <td>
                                        <span className={cx('paymentBadge')}>{order.paymentMethod || 'Không rõ'}</span>
                                    </td>

                                    <td>
                                        <b>{formatMoney(order.sumprice)}</b>
                                    </td>

                                    <td>{formatDateTime(order.createdAt)}</td>
                                </tr>
                            ))}

                            {filteredRecentOrders.length === 0 && (
                                <tr>
                                    <td colSpan="6" className={cx('emptyTable')}>
                                        Không có đơn hàng phù hợp.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
