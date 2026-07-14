const ProductsRoutes = require('./ProductsRoutes');
const UserRoute = require('./RoutesUser');
const ProductRoute = require('./ProductsRoutes');
const CartRoute = require('./RoutesCart');
const PaymentsRoutes = require('./RoutesPayments');
const RegisterRoutes = require('./Routesregister');
const RouteBlog = require('./RouteBlog');
const AddressRoute = require('./RouteAddress');
const ControllerJWT = require('../jwt/ControllerJWT');
const ModelUser = require('../models/ModelUser');
const DashboardRoute = require('./RouteDashboard');
const VoucherRoute = require('./RouteVoucher');
const BlogCommentRoute = require('./RouteBlogComment');
const RouteShipper = require('./RouterShipper');
const ReviewRoute = require('./RouteReview');
const reminderRouter = require('./RouteReminder');
const ChatbotRoute = require('./RouterChatbot');
const { jwtDecode } = require('jwt-decode');

function route(app) {
    // Register
    app.use('/api', RegisterRoutes);

    // Chatbot
    app.use('/', require('./RouterChatbot'));

    // Products
    app.get('/api/products', ProductsRoutes);
    app.post('/api/addproduct', ProductsRoutes);
    app.get('/api/product', ProductsRoutes);
    app.get('/api/search', ProductsRoutes);
    app.post('/api/editpro', ProductsRoutes);
    app.delete('/api/deleteproduct', ProductsRoutes);
    app.post('/api/editorder', ProductRoute);
    app.get('/api/similarproduct', ProductRoute);
    app.get('/api/combos', ProductRoute);

    // User
    app.post('/api/login', UserRoute);
    app.get('/api/auth', UserRoute);
    app.put('/api/auth/update-profile', UserRoute);
    app.post('/api/logout', UserRoute);
    app.post('/api/forgotpassword', UserRoute);
    app.post('/api/resetpassword', UserRoute);
    app.get('/api/refresh-token', UserRoute);
    app.post('/api/google-login', UserRoute);
    app.post('/api/facebook-login', UserRoute);
    app.get('/api/get-all-shipper', UserRoute);
    app.put('/api/assign-order-shipper/:orderId', UserRoute);
    // Payment
    // app.post('/api/payment', PaymentsRoutes);
    // app.get('/api/payments', PaymentsRoutes);
    // app.get('/api/checkdata', PaymentsRoutes);
    // app.get('/api/payment', PaymentsRoutes);
    // app.post('/api/paymentcod', PaymentsRoutes);
    // app.get('/api/dataorderuser', PaymentsRoutes);
    // app.post('/api/cancelorder', PaymentsRoutes);
    // app.post('/api/paymentvnpay', PaymentsRoutes);
    // app.get('/api/check-payment-vnpay', PaymentsRoutes);
    // app.post('/api/editorder', PaymentsRoutes);
    // app.post('/api/admin/cancelorder', PaymentsRoutes);
    app.use('/api', PaymentsRoutes);

    // Cart
    app.post('/api/addtocart', CartRoute);
    app.get('/api/cart', CartRoute);
    app.post('/api/deletecart', CartRoute);
    app.post('/api/update-info-cart', CartRoute);
    app.put('/api/update-quantity-cart', CartRoute);
    app.post('/api/apply-voucher', CartRoute);
    app.delete('/api/remove-voucher', CartRoute);

    // Blog public
    app.get('/api/blogs', RouteBlog);
    app.get('/api/blogs/featured', RouteBlog);
    app.get('/api/blogs/popular', RouteBlog);
    app.get('/api/blogs/:slug', RouteBlog);

    // Admin user/order
    app.get('/api/getallorder', UserRoute);
    app.get('/api/getalluser', UserRoute);
    app.delete('/api/deleteuser', UserRoute);
    app.put('/api/update-status-user/:id', UserRoute);
    app.put('/api/update-user/:id', UserRoute);
    app.get('/api/user/:id', UserRoute);
    app.get('/api/me', UserRoute);

    // Admin blog
    app.get('/api/admin/blogs', RouteBlog);
    app.get('/api/admin/blogs/:id', RouteBlog);
    app.post('/api/admin/blogs', RouteBlog);
    app.patch('/api/admin/blogs/:id', RouteBlog);
    app.patch('/api/admin/blogs/:id/soft-delete', RouteBlog);
    app.patch('/api/admin/blogs/:id/restore', RouteBlog);
    app.delete('/api/admin/blogs/:id/force-delete', RouteBlog);

    // Check admin access
    app.get('/api/admin', ControllerJWT.verifyToken, async (req, res) => {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({ message: 'Bạn chưa đăng nhập' });
            }

            const findUser = await ModelUser.findOne({ email: user.email });

            if (!findUser) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            if (findUser.isAdmin === true) {
                return res.status(200).json({ message: 'Bạn có quyền truy cập' });
            }

            return res.status(403).json({ message: 'Bạn không có quyền truy cập' });
        } catch (error) {
            console.error('Admin access error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    });

    // Check staff access
    app.get('/api/staff', ControllerJWT.verifyTokenStaff, async (req, res) => {
        try {
            return res.status(200).json({ message: 'Bạn có quyền truy cập khu vực Staff' });
        } catch (error) {
            console.error('Staff access error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    });

    // Check doctor access
    app.get('/api/doctor', ControllerJWT.verifyTokenDoctor, async (req, res) => {
        try {
            return res.status(200).json({ message: 'Bạn có quyền truy cập khu vực Bác sĩ' });
        } catch (error) {
            console.error('Doctor access error:', error);
            return res.status(500).json({ message: 'Lỗi server' });
        }
    });

    // Doctor module
    app.use('/api/doctor', require('./RouteDoctor'));
    app.use('/api/doctor-inbox', require('./RouteDoctorInbox'));
    app.use('/api/staff-inbox', require('./RouteStaffInbox'));

    // Address
    app.use('/api/addresses', AddressRoute);
    app.get('/api/addresses', AddressRoute);
    app.post('/api/addresses', AddressRoute);
    app.put('/api/addresses/:id', AddressRoute);
    app.delete('/api/addresses/:id', AddressRoute);
    app.patch('/api/addresses/:id/default', AddressRoute);

    // Client network info
    app.use('/api', require('./RouteNetwork'));

    // Contact form
    app.use('/api', require('./RouteContact'));

    // Support requests & notifications (customer) — before staff /:id routes
    app.use('/api', require('./RouteCustomerSupport'));

    // Support requests (staff)
    app.use('/api', require('./RouteSupportRequest'));

    // Dashboard
    app.use('/api/admin', DashboardRoute);

    // Voucher & Notification
    app.use('/', require('./RouteVoucher'));

    // Blog Comment
    app.use('/api', BlogCommentRoute);

    // Review
    app.use('/', require('./RouteReview'));

    // Shipper
    app.use('/', require('./RouterShipper'));

    // Reminder
    app.use('/', require('./RouteReminder'));
}

module.exports = route;
