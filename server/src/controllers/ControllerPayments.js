const axios = require('axios');
const crypto = require('crypto');
const ModelCart = require('../models/ModelCart');
const ModelPayment = require('../models/ModelPayment');
const ModelUser = require('../models/ModelUser');
const ModelProducts = require('../models/ModelProducts');
const ModelVoucher = require('../models/ModelVoucher');
const sendMailOrder = require('../SendMail/SendMailOrder');
const { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } = require('vnpay');
const { getVoucherAvailabilityError, consumeVoucher, releaseVoucher } = require('../utils/voucherHelpers');
const { applyOrderStatusSideEffects } = require('../utils/orderStatusEffects');

require('dotenv').config();

class ControllerPayments {
    getUserFromReq = (req) => req.user || null;

    ensureAdmin = (req, res) => {
        const user = this.getUserFromReq(req);

        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return null;
        }

        if (!user.isAdmin) {
            res.status(403).json({ message: 'Bạn không có quyền truy cập' });
            return null;
        }

        return user;
    };

    ensureStaffOrAdmin = (req, res) => {
        const user = this.getUserFromReq(req);

        if (!user) {
            res.status(401).json({ message: 'Unauthorized' });
            return null;
        }

        if (user.role !== 'staff' && user.isAdmin !== true) {
            res.status(403).json({ message: 'Bạn không có quyền truy cập' });
            return null;
        }

        return user;
    };

    // Tính toán các khoản tiền dựa trên giỏ hàng và voucher
    calculateCartAmounts = (cart) => {
        const products = Array.isArray(cart?.products) ? cart.products : [];

        const subtotal = products.reduce((total, product) => {
            return total + Number(product?.price || 0) * Number(product?.quantity || 0);
        }, 0);

        const shippingBaseFee = Number(process.env.ORDER_SHIPPING_FEE || 30000);

        const voucher = cart?.voucher || null;
        const hasVoucher = !!voucher?.code;

        const productDiscount = hasVoucher && voucher.category !== 'shipping' ? Number(voucher.discountAmount || 0) : 0;

        const shippingDiscount =
            hasVoucher && voucher.category === 'shipping' ? Number(voucher.discountAmount || 0) : 0;

        const shippingFee = Math.max(shippingBaseFee - shippingDiscount, 0);

        const total = Math.max(subtotal - productDiscount + shippingFee, 0);

        return {
            subtotal,
            tax: 0,
            shippingFee,
            total,
            voucher,
            productDiscount,
            shippingDiscount,
        };
    };

    normalizeShippingInfo = ({ body = {}, cart = {}, user = {} }) => {
        const name = String(body.name || cart.name || cart.username || '').trim();
        const phone = String(body.phone || cart.phone || '').trim();
        const address = String(body.address || cart.address || '').trim();
        const email = String(body.email || user.email || '').trim();
        const note = String(body.note || '').trim();

        return {
            name,
            phone,
            address,
            email,
            note,
        };
    };

    validateShippingInfo = ({ name, phone, address }) => {
        if (!name || !phone || !address) {
            return 'Bạn đang thiếu thông tin giao hàng';
        }
        return null;
    };

    getCartByUserEmail = async (email) => {
        return ModelCart.findOne({ user: email });
    };

    updateCartShippingInfo = async (cart, { name, phone, address }) => {
        let changed = false;

        if (cart.name !== name) {
            cart.name = name;
            changed = true;
        }

        if (String(cart.phone || '') !== String(phone || '')) {
            cart.phone = phone;
            changed = true;
        }

        if (cart.address !== address) {
            cart.address = address;
            changed = true;
        }

        if (changed) {
            await cart.save();
        }

        return cart;
    };

    buildPaymentFromCart = ({
        cart,
        userId,
        email,
        fullname,
        paymentMethod,
        address,
        phone,
        contactEmail,
        note,
        status = 'pending',
        paymentStatus = 'unpaid',
        gatewayOrderId = '',
        gatewayTxnRef = '',
    }) => {
        const amounts = this.calculateCartAmounts(cart);

        return new ModelPayment({
            products: (cart.products || []).map((product) => ({
                productId: product.productId || product._id || null,
                nameProduct: product.nameProduct || product.name || '',
                quantity: Number(product.quantity) || 0,
                price: Number(product.price) || 0,
                size: Number(product.size) || 0,
                img: product.img || '',
                type: Number(product.type) || 0,
            })),
            sumprice: amounts.total,
            subtotal: amounts.subtotal,
            tax: 0,
            shippingFee: amounts.shippingFee,

            voucher: amounts.voucher,
            productDiscount: amounts.productDiscount,
            shippingDiscount: amounts.shippingDiscount,

            paymentMethod,
            paymentStatus,
            status,

            userId,
            user: email,
            address: address || cart.address || '',
            phone: phone || cart.phone || '',
            username: fullname || cart.name || cart.username || '',
            email: contactEmail || '',
            note: note || '',

            gatewayOrderId,
            gatewayTxnRef,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    };

    hasProcessedPayment = async ({ paymentMethod, gatewayOrderId, gatewayTxnRef }) => {
        const query = { paymentMethod };

        if (gatewayOrderId) query.gatewayOrderId = gatewayOrderId;
        if (gatewayTxnRef) query.gatewayTxnRef = gatewayTxnRef;

        return ModelPayment.findOne(query).lean();
    };

    sendOrderMailAsync = (email) => {
        Promise.resolve()
            .then(() => sendMailOrder(email))
            .catch((error) => {
                console.error('sendMailOrder error:', error);
            });
    };

    validateCartVoucherBeforeCheckout = async (cart) => {
        const code = cart?.voucher?.code;
        if (!code) return null;

        const voucher = await ModelVoucher.findOne({ code: String(code).trim().toUpperCase() });
        return getVoucherAvailabilityError(voucher, { orderTotal: cart.sumprice });
    };

    finalizeOrderVoucher = async (cart, payment) => {
        const code = cart?.voucher?.code;
        if (!code) return { ok: true };

        try {
            await consumeVoucher(code);
            payment.voucherConsumed = true;
            return { ok: true };
        } catch (error) {
            return {
                ok: false,
                message: error.message || 'Voucher không còn khả dụng',
            };
        }
    };

    releaseOrderVoucher = async (order) => {
        if (!order?.voucherConsumed || !order?.voucher?.code) return;

        await releaseVoucher(order.voucher.code);
        order.voucherConsumed = false;
    };
    //------------------------------MOMO------------------------------

    PaymentsMomo = async (req, res) => {
        try {
            const user = this.getUserFromReq(req);
            if (!user?.email) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const cart = await this.getCartByUserEmail(user.email);
            if (!cart || !cart.products?.length) {
                return res.status(404).json({ message: 'Giỏ hàng trống' });
            }

            const shippingInfo = this.normalizeShippingInfo({
                body: req.body,
                cart,
                user,
            });

            const validateMessage = this.validateShippingInfo(shippingInfo);
            if (validateMessage) {
                return res.status(400).json({ message: validateMessage });
            }

            await this.updateCartShippingInfo(cart, shippingInfo);

            const voucherError = await this.validateCartVoucherBeforeCheckout(cart);
            if (voucherError) {
                return res.status(400).json({ message: voucherError });
            }

            const amounts = this.calculateCartAmounts(cart);

            const partnerCode = process.env.MOMO_PARTNER_CODE;
            const accessKey = process.env.MOMO_ACCESS_KEY;
            const secretKey = process.env.MOMO_SECRET_KEY;
            const redirectUrl = process.env.MOMO_REDIRECT_URL;
            const ipnUrl = process.env.MOMO_IPN_URL;

            if (!partnerCode || !accessKey || !secretKey || !redirectUrl || !ipnUrl) {
                return res.status(500).json({ message: 'Thiếu cấu hình MOMO trong .env' });
            }

            const requestId = `${partnerCode}_${Date.now()}`;
            const orderId = requestId;
            const orderInfo = user.email;
            const requestType = 'captureWallet';

            const extraDataPayload = {
                address: shippingInfo.address,
                name: shippingInfo.name,
                phone: shippingInfo.phone,
                email: shippingInfo.email,
                note: shippingInfo.note,
            };

            const extraData = Buffer.from(JSON.stringify(extraDataPayload)).toString('base64');
            const amount = String(amounts.total);

            const rawSignature =
                `accessKey=${accessKey}` +
                `&amount=${amount}` +
                `&extraData=${extraData}` +
                `&ipnUrl=${ipnUrl}` +
                `&orderId=${orderId}` +
                `&orderInfo=${orderInfo}` +
                `&partnerCode=${partnerCode}` +
                `&redirectUrl=${redirectUrl}` +
                `&requestId=${requestId}` +
                `&requestType=${requestType}`;

            const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

            const requestBody = {
                partnerCode,
                accessKey,
                requestId,
                amount,
                orderId,
                orderInfo,
                redirectUrl,
                ipnUrl,
                extraData,
                requestType,
                signature,
                lang: 'vi',
            };

            const response = await axios.post('https://payment.momo.vn/v2/gateway/api/create', requestBody, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000,
            });

            return res.status(200).json(response.data);
        } catch (error) {
            console.error('PaymentsMomo error:', error?.response?.data || error.message);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    //------------------------------VNPAY------------------------------
    paymentVnpay = async (req, res) => {
        try {
            const user = this.getUserFromReq(req);
            if (!user?.email) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const cart = await this.getCartByUserEmail(user.email);
            if (!cart || !cart.products?.length) {
                return res.status(404).json({ message: 'Giỏ hàng trống' });
            }

            const shippingInfo = this.normalizeShippingInfo({
                body: req.body,
                cart,
                user,
            });

            const validateMessage = this.validateShippingInfo(shippingInfo);
            if (validateMessage) {
                return res.status(400).json({ message: validateMessage });
            }

            await this.updateCartShippingInfo(cart, shippingInfo);

            const voucherError = await this.validateCartVoucherBeforeCheckout(cart);
            if (voucherError) {
                return res.status(400).json({ message: voucherError });
            }

            const amounts = this.calculateCartAmounts(cart);

            const vnpay = new VNPay({
                tmnCode: process.env.VNPAY_TMN_CODE,
                secureSecret: process.env.VNPAY_HASH_SECRET,
                vnpayHost: process.env.VNPAY_HOST || 'https://sandbox.vnpayment.vn',
                testMode: true,
                hashAlgorithm: 'SHA512',
                loggerFn: ignoreLogger,
            });

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const txnRef = `${cart._id}_${Date.now()}`;

            const vnpayResponse = await vnpay.buildPaymentUrl({
                vnp_Amount: amounts.total,
                vnp_IpAddr: req.ip || '127.0.0.1',
                vnp_TxnRef: txnRef,
                vnp_OrderInfo: String(cart._id),
                vnp_OrderType: ProductCode.Other,
                vnp_ReturnUrl: process.env.VNPAY_RETURN_URL,
                vnp_Locale: VnpLocale.VN,
                vnp_CreateDate: dateFormat(new Date()),
                vnp_ExpireDate: dateFormat(tomorrow),
            });

            return res.status(201).json({ vnpayResponse });
        } catch (error) {
            console.error('paymentVnpay error:', error.message);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    checkPaymentVnpay = async (req, res) => {
        try {
            const { vnp_ResponseCode, vnp_OrderInfo, vnp_TxnRef } = req.query;

            if (vnp_ResponseCode !== '00') {
                return res.redirect(`${process.env.REACT_APP_URL_DOMAIN}/payments`);
            }

            const cartId = vnp_OrderInfo;

            const existingPayment = await this.hasProcessedPayment({
                paymentMethod: 'VNPAY',
                gatewayTxnRef: vnp_TxnRef,
            });

            if (existingPayment) {
                return res.redirect(`${process.env.REACT_APP_URL_DOMAIN}/paymentsuccess`);
            }

            const cart = await ModelCart.findOne({ _id: cartId });
            if (!cart || !cart.products?.length) {
                return res.redirect(`${process.env.REACT_APP_URL_DOMAIN}/payments`);
            }

            const voucherError = await this.validateCartVoucherBeforeCheckout(cart);
            if (voucherError) {
                return res.redirect(`${process.env.REACT_APP_URL_DOMAIN}/payments?error=${encodeURIComponent(voucherError)}`);
            }

            const userData = await ModelUser.findOne({ email: cart.user }).lean();

            const newPayment = this.buildPaymentFromCart({
                cart,
                userId: userData?._id,
                email: cart.user,
                fullname: userData?.fullname,
                paymentMethod: 'VNPAY',
                paymentStatus: 'paid',
                address: cart.address,
                phone: cart.phone,
                contactEmail: cart.user,
                note: '',
                status: 'pending',
                gatewayTxnRef: vnp_TxnRef,
                gatewayOrderId: String(cartId),
            });

            const voucherResult = await this.finalizeOrderVoucher(cart, newPayment);
            if (!voucherResult.ok) {
                return res.redirect(`${process.env.REACT_APP_URL_DOMAIN}/payments?error=${encodeURIComponent(voucherResult.message)}`);
            }

            await newPayment.save();
            await cart.deleteOne();

            this.sendOrderMailAsync(cart.user);

            return res.redirect(`${process.env.REACT_APP_URL_DOMAIN}/paymentsuccess`);
        } catch (error) {
            console.error('checkPaymentVnpay error:', error.message);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    //------------------------------MOMO------------------------------
    checkData = async (req, res) => {
        try {
            const { orderInfo, amount, extraData, resultCode, orderId, requestId, signature } = req.query;

            if (resultCode !== '0') {
                return res.redirect(`${process.env.REACT_APP_URL_DOMAIN}/payments`);
            }

            if (!orderInfo || !orderId || !requestId || !amount || !signature) {
                return res.status(400).json({ message: 'Thiếu dữ liệu callback MOMO' });
            }

            const partnerCode = process.env.MOMO_PARTNER_CODE;
            const accessKey = process.env.MOMO_ACCESS_KEY;
            const secretKey = process.env.MOMO_SECRET_KEY;

            const rawSignature =
                `accessKey=${accessKey}` +
                `&amount=${amount}` +
                `&extraData=${extraData || ''}` +
                `&message=${req.query.message || ''}` +
                `&orderId=${orderId}` +
                `&orderInfo=${orderInfo}` +
                `&orderType=${req.query.orderType || ''}` +
                `&partnerCode=${partnerCode}` +
                `&payType=${req.query.payType || ''}` +
                `&requestId=${requestId}` +
                `&responseTime=${req.query.responseTime || ''}` +
                `&resultCode=${resultCode}` +
                `&transId=${req.query.transId || ''}`;

            const expectedSignature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

            if (expectedSignature !== signature) {
                return res.status(400).json({ message: 'Sai chữ ký callback MOMO' });
            }

            const existed = await this.hasProcessedPayment({
                paymentMethod: 'MOMO',
                gatewayOrderId: orderId,
            });

            if (existed) {
                return res.redirect(`${process.env.REACT_APP_URL_DOMAIN}/paymentsuccess`);
            }

            const email = orderInfo;
            const cart = await this.getCartByUserEmail(email);
            const userData = await ModelUser.findOne({ email }).lean();

            if (!cart || !cart.products?.length) {
                return res.status(404).json({ message: 'Cart is empty or not found' });
            }

            const voucherError = await this.validateCartVoucherBeforeCheckout(cart);
            if (voucherError) {
                return res.redirect(`${process.env.REACT_APP_URL_DOMAIN}/payments?error=${encodeURIComponent(voucherError)}`);
            }

            let parsedExtraData = {};
            if (extraData) {
                try {
                    parsedExtraData = JSON.parse(Buffer.from(extraData, 'base64').toString('utf8'));
                } catch (error) {
                    parsedExtraData = {};
                }
            }

            const newPayment = this.buildPaymentFromCart({
                cart,
                userId: userData?._id,
                email,
                fullname: userData?.fullname || parsedExtraData.name,
                paymentMethod: 'MOMO',
                paymentStatus: 'paid',
                address: parsedExtraData.address || cart.address,
                phone: parsedExtraData.phone || cart.phone,
                contactEmail: parsedExtraData.email || email,
                note: parsedExtraData.note || '',
                status: 'pending',
                gatewayOrderId: orderId,
                gatewayTxnRef: requestId,
            });

            const voucherResult = await this.finalizeOrderVoucher(cart, newPayment);
            if (!voucherResult.ok) {
                return res.redirect(`${process.env.REACT_APP_URL_DOMAIN}/payments?error=${encodeURIComponent(voucherResult.message)}`);
            }

            await newPayment.save();
            await ModelCart.deleteOne({ user: email });

            this.sendOrderMailAsync(email);

            return res.redirect(`${process.env.REACT_APP_URL_DOMAIN}/paymentsuccess`);
        } catch (error) {
            console.error('checkData error:', error.message);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    getPayment = async (req, res) => {
        try {
            const user = this.getUserFromReq(req);

            if (!user?.email) {
                return res.status(401).json({
                    message: 'Unauthorized',
                });
            }

            const data = await ModelPayment.find({
                $or: [{ userId: user.id || user._id }, { user: user.email }, { email: user.email }],
            })
                .sort({ createdAt: -1 })
                .lean();

            return res.status(200).json(data || []);
        } catch (error) {
            console.error('getPayment error:', error.message);

            return res.status(500).json({
                message: 'Internal Server Error',
            });
        }
    };

    PaymentCod = async (req, res) => {
        try {
            const user = this.getUserFromReq(req);
            if (!user?.email) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const cart = await this.getCartByUserEmail(user.email);
            if (!cart || !cart.products?.length) {
                return res.status(404).json({ message: 'Cart is empty' });
            }

            const shippingInfo = this.normalizeShippingInfo({
                body: req.body,
                cart,
                user,
            });

            const validateMessage = this.validateShippingInfo(shippingInfo);
            if (validateMessage) {
                return res.status(400).json({ message: validateMessage });
            }

            await this.updateCartShippingInfo(cart, shippingInfo);

            const voucherError = await this.validateCartVoucherBeforeCheckout(cart);
            if (voucherError) {
                return res.status(400).json({ message: voucherError });
            }

            const userData = await ModelUser.findOne({ email: user.email }).lean();

            const newPayment = this.buildPaymentFromCart({
                cart,
                userId: user.id || user._id,
                email: user.email,
                fullname: userData?.fullname || shippingInfo.name,
                paymentMethod: 'COD',
                paymentStatus: 'unpaid',
                address: shippingInfo.address,
                phone: shippingInfo.phone,
                contactEmail: shippingInfo.email,
                note: shippingInfo.note,
                status: 'pending',
                gatewayOrderId: `COD_${Date.now()}`,
            });

            const voucherResult = await this.finalizeOrderVoucher(cart, newPayment);
            if (!voucherResult.ok) {
                return res.status(400).json({ message: voucherResult.message });
            }

            await newPayment.save();
            await ModelCart.deleteOne({ user: user.email });

            this.sendOrderMailAsync(user.email);

            return res.status(200).json({
                message: 'Đặt hàng thành công',
                success: true,
                order: newPayment,
            });
        } catch (error) {
            console.error('PaymentCod error:', error);
            return res.status(500).json({
                message: 'Internal Server Error',
                error: error.message,
            });
        }
    };

    getPayments = async (req, res) => {
        try {
            const user = this.getUserFromReq(req);
            if (!user?.email) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const data = await ModelPayment.find({
                $or: [{ userId: user.id || user._id }, { user: user.email }, { email: user.email }],
            })
                .sort({ createdAt: -1 })
                .lean();

            return res.status(200).json(data);
        } catch (error) {
            console.error('getPayments error:', error.message);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    GetOrderUser = async (req, res) => {
        try {
            const admin = this.ensureAdmin(req, res);
            if (!admin) return;

            const data = await ModelPayment.find({}).populate('user').sort({ createdAt: -1 }).lean();

            return res.status(200).json(data);
        } catch (error) {
            console.error('GetOrderUser error:', error.message);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    //------------------------------USER cancel order------------------------------

    CancelOrder = async (req, res) => {
        try {
            const user = this.getUserFromReq(req);

            if (!user?.email) {
                return res.status(401).json({
                    message: 'Unauthorized',
                });
            }

            const { id, reason, cancelledBy = 'user' } = req.body;

            if (!id) {
                return res.status(400).json({
                    message: 'Thiếu mã đơn hàng',
                });
            }

            if (!reason || !String(reason).trim()) {
                return res.status(400).json({
                    message: 'Vui lòng nhập lý do hủy đơn',
                });
            }

            const order = await ModelPayment.findOne({
                _id: id,
                $or: [{ userId: user.id || user._id }, { user: user.email }, { email: user.email }],
            });

            if (!order) {
                return res.status(404).json({
                    message: 'Không tìm thấy đơn hàng',
                });
            }

            const currentStatus = String(order.status || 'pending')
                .trim()
                .toLowerCase();

            // Chỉ cho phép hủy khi chờ xác nhận
            if (currentStatus !== 'pending') {
                return res.status(400).json({
                    message: 'Đơn hàng này không thể hủy',
                });
            }

            order.status = 'cancelled';

            order.cancelInfo = {
                reason: String(reason).trim(),
                cancelledBy,
                cancelledAt: new Date(),
            };

            order.cancelledAt = new Date();
            order.updatedAt = new Date();

            await this.releaseOrderVoucher(order);
            await order.save();

            return res.status(200).json({
                success: true,
                message: 'Hủy đơn hàng thành công',
                order,
            });
        } catch (error) {
            console.error('CancelOrder error:', error);

            return res.status(500).json({
                success: false,
                message: 'Internal Server Error',
            });
        }
    };
    //------------------------------ADMIN cancel order------------------------------
    AdminCancelOrder = async (req, res) => {
        try {
            const admin = this.ensureAdmin(req, res);
            if (!admin) return;

            const { id } = req.body;
            if (!id) {
                return res.status(400).json({ message: 'Thiếu mã đơn hàng' });
            }

            const order = await ModelPayment.findById(id);
            if (!order) {
                return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
            }

            const currentStatus = String(order.status || 'pending')
                .trim()
                .toLowerCase();

            if (currentStatus === 'completed') {
                return res.status(400).json({ message: 'Đơn đã hoàn tất, không thể hủy' });
            }

            if (currentStatus === 'cancelled') {
                return res.status(400).json({ message: 'Đơn hàng đã bị hủy trước đó' });
            }

            order.status = 'cancelled';
            order.updatedAt = new Date();

            await this.releaseOrderVoucher(order);
            await order.save();

            return res.status(200).json({
                message: 'Hủy đơn hàng thành công',
                order,
            });
        } catch (error) {
            console.error('AdminCancelOrder error:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    EditOrder = async (req, res) => {
        try {
            const operator = this.ensureStaffOrAdmin(req, res);
            if (!operator) return;

            const id = String(req.body?.id || '').trim();
            const nextStatus = String(req.body?.status || '')
                .trim()
                .toLowerCase();

            if (!id || !nextStatus) {
                return res.status(400).json({
                    message: 'Thiếu id hoặc status',
                    order: null,
                });
            }

            const allowedStatuses = [
                'pending',
                'confirmed',
                'shipping',
                'completed',
                'failed',
                'returning',
                'returned',
                'cancelled',
            ];

            if (!allowedStatuses.includes(nextStatus)) {
                return res.status(400).json({
                    message: 'Trạng thái không hợp lệ',
                    order: null,
                });
            }

            const validTransitions = {
                pending: ['confirmed', 'cancelled'],
                confirmed: ['shipping', 'cancelled'],
                shipping: ['completed', 'failed'],
                failed: ['returning'],
                returning: ['returned'],
                completed: [],
                returned: [],
                cancelled: [],
            };

            const order = await ModelPayment.findById(id);

            if (!order) {
                return res.status(404).json({
                    message: 'Không tìm thấy đơn hàng',
                    order: null,
                });
            }

            const currentStatus = String(order.status || 'pending')
                .trim()
                .toLowerCase();

            if (currentStatus === nextStatus) {
                return res.status(400).json({
                    message: 'Đơn hàng đã ở trạng thái này rồi',
                    order: null,
                });
            }

            const allowedNextStatuses = validTransitions[currentStatus] || [];

            if (!allowedNextStatuses.includes(nextStatus)) {
                return res.status(400).json({
                    message: `Không thể chuyển từ ${currentStatus} sang ${nextStatus}`,
                    order: null,
                });
            }

            await applyOrderStatusSideEffects(order, currentStatus, nextStatus);

            return res.status(200).json({
                message: 'Cập nhật trạng thái thành công',
                status: order.status,
                order,
            });
        } catch (error) {
            console.error('EditOrder error:', error.message);
            return res.status(500).json({
                message: 'Lỗi server',
                order: null,
            });
        }
    };
}

module.exports = new ControllerPayments();
