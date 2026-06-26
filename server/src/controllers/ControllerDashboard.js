const ModelPayment = require('../models/ModelPayment');
const ModelUser = require('../models/ModelUser');

class ControllerDashboard {
    async getDashboard(req, res) {
        try {
            const range = Number(req.query.range) || 7;
            const safeRange = [7, 15, 30].includes(range) ? range : 7;

            const paidMatch = {
                paymentStatus: 'paid',
                status: { $ne: 'cancelled' },
            };

            const now = new Date();

            const startOfToday = new Date(now);
            startOfToday.setHours(0, 0, 0, 0);

            const endOfToday = new Date(now);
            endOfToday.setHours(23, 59, 59, 999);

            const currentStart = new Date(now);
            currentStart.setDate(now.getDate() - (safeRange - 1));
            currentStart.setHours(0, 0, 0, 0);

            const previousStart = new Date(currentStart);
            previousStart.setDate(previousStart.getDate() - safeRange);

            const previousEnd = new Date(currentStart);
            previousEnd.setMilliseconds(-1);

            const startOfThisWeek = new Date(now);
            startOfThisWeek.setDate(now.getDate() - 6);
            startOfThisWeek.setHours(0, 0, 0, 0);

            const formatDay = (date) => {
                return `${date.getDate()}/${date.getMonth() + 1}`;
            };

            const [
                overview,
                totalProductsAgg,
                todayRevenueAgg,
                currentRevenueAgg,
                previousRevenueAgg,
                currentRevenueByDayAgg,
                previousRevenueByDayAgg,
                revenueByHourAgg,
                topProducts,
                topCustomers,
                recentOrders,
                newUsers,
            ] = await Promise.all([
                ModelPayment.aggregate([
                    { $match: paidMatch },
                    {
                        $group: {
                            _id: null,
                            totalRevenue: { $sum: '$sumprice' },
                            totalOrders: { $sum: 1 },
                        },
                    },
                ]),

                ModelPayment.aggregate([
                    { $match: paidMatch },
                    { $unwind: '$products' },
                    {
                        $group: {
                            _id: null,
                            totalProducts: { $sum: '$products.quantity' },
                        },
                    },
                ]),

                ModelPayment.aggregate([
                    {
                        $match: {
                            ...paidMatch,
                            createdAt: {
                                $gte: startOfToday,
                                $lte: endOfToday,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$sumprice' },
                        },
                    },
                ]),

                ModelPayment.aggregate([
                    {
                        $match: {
                            ...paidMatch,
                            createdAt: { $gte: currentStart, $lte: now },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$sumprice' },
                        },
                    },
                ]),

                ModelPayment.aggregate([
                    {
                        $match: {
                            ...paidMatch,
                            createdAt: {
                                $gte: previousStart,
                                $lte: previousEnd,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$sumprice' },
                        },
                    },
                ]),

                ModelPayment.aggregate([
                    {
                        $match: {
                            ...paidMatch,
                            createdAt: {
                                $gte: currentStart,
                                $lte: now,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                                day: { $dayOfMonth: '$createdAt' },
                            },
                            total: { $sum: '$sumprice' },
                            orders: { $sum: 1 },
                        },
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
                ]),

                ModelPayment.aggregate([
                    {
                        $match: {
                            ...paidMatch,
                            createdAt: {
                                $gte: previousStart,
                                $lte: previousEnd,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$createdAt' },
                                month: { $month: '$createdAt' },
                                day: { $dayOfMonth: '$createdAt' },
                            },
                            total: { $sum: '$sumprice' },
                            orders: { $sum: 1 },
                        },
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
                ]),

                ModelPayment.aggregate([
                    {
                        $match: {
                            ...paidMatch,
                            createdAt: {
                                $gte: startOfToday,
                                $lte: endOfToday,
                            },
                        },
                    },
                    {
                        $group: {
                            _id: { $hour: '$createdAt' },
                            total: { $sum: '$sumprice' },
                            orders: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ]),

                ModelPayment.aggregate([
                    { $match: paidMatch },
                    { $unwind: '$products' },
                    {
                        $group: {
                            _id: '$products.nameProduct',
                            totalSold: { $sum: '$products.quantity' },
                            totalRevenue: {
                                $sum: {
                                    $multiply: ['$products.price', '$products.quantity'],
                                },
                            },
                        },
                    },
                    { $sort: { totalSold: -1 } },
                    { $limit: 5 },
                ]),

                ModelPayment.aggregate([
                    { $match: paidMatch },
                    {
                        $group: {
                            _id: '$user',
                            totalSpent: { $sum: '$sumprice' },
                            totalOrders: { $sum: 1 },
                        },
                    },
                    { $sort: { totalSpent: -1 } },
                    { $limit: 5 },
                ]),

                ModelPayment.find(paidMatch)
                    .sort({ createdAt: -1 })
                    .limit(6)
                    .select(
                        '_id user email phone address sumprice paymentMethod paymentStatus status createdAt products',
                    )
                    .lean(),

                ModelUser.countDocuments({
                    createdAt: { $gte: startOfThisWeek },
                }),
            ]);

            const totalRevenue = overview[0]?.totalRevenue || 0;
            const totalOrders = overview[0]?.totalOrders || 0;
            const totalProducts = totalProductsAgg[0]?.totalProducts || 0;
            const todayRevenue = todayRevenueAgg[0]?.total || 0;

            const currentRevenue = currentRevenueAgg[0]?.total || 0;
            const previousRevenue = previousRevenueAgg[0]?.total || 0;

            const growth =
                previousRevenue === 0
                    ? currentRevenue > 0
                        ? 100
                        : 0
                    : ((currentRevenue - previousRevenue) / previousRevenue) * 100;

            const currentMap = new Map();
            const previousMap = new Map();

            currentRevenueByDayAgg.forEach((item) => {
                const key = `${item._id.year}-${item._id.month}-${item._id.day}`;
                currentMap.set(key, {
                    total: item.total || 0,
                    orders: item.orders || 0,
                });
            });

            previousRevenueByDayAgg.forEach((item) => {
                const key = `${item._id.year}-${item._id.month}-${item._id.day}`;
                previousMap.set(key, {
                    total: item.total || 0,
                    orders: item.orders || 0,
                });
            });

            const revenueByDay = [];
            const revenueCompare = [];

            for (let i = safeRange - 1; i >= 0; i--) {
                const currentDate = new Date(now);
                currentDate.setDate(now.getDate() - i);
                currentDate.setHours(0, 0, 0, 0);

                const previousDate = new Date(currentDate);
                previousDate.setDate(previousDate.getDate() - safeRange);

                const currentKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
                const previousKey = `${previousDate.getFullYear()}-${previousDate.getMonth() + 1}-${previousDate.getDate()}`;

                const currentItem = currentMap.get(currentKey) || { total: 0, orders: 0 };
                const previousItem = previousMap.get(previousKey) || { total: 0, orders: 0 };

                revenueByDay.push({
                    date: formatDay(currentDate),
                    total: currentItem.total,
                    orders: currentItem.orders,
                });

                revenueCompare.push({
                    date: formatDay(currentDate),
                    current: currentItem.total,
                    previous: previousItem.total,
                });
            }

            const hourMap = new Map();

            revenueByHourAgg.forEach((item) => {
                hourMap.set(item._id, {
                    total: item.total || 0,
                    orders: item.orders || 0,
                });
            });

            const revenueByHour = [];

            for (let hour = 0; hour < 24; hour++) {
                const item = hourMap.get(hour) || { total: 0, orders: 0 };

                revenueByHour.push({
                    hour: `${String(hour).padStart(2, '0')}:00`,
                    total: item.total,
                    orders: item.orders,
                });
            }

            return res.status(200).json({
                totalRevenue,
                todayRevenue,
                totalOrders,
                totalProducts,
                newUsers,
                growth: Number(growth.toFixed(1)),

                revenueByDay,
                revenueCompare,
                revenueByHour,

                topProducts,
                topCustomers,
                recentOrders,
            });
        } catch (error) {
            console.error('Dashboard error:', error);

            return res.status(500).json({
                message: 'Lỗi server dashboard',
            });
        }
    }
}

module.exports = new ControllerDashboard();
