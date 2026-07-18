const axios = require('axios');
const crypto = require('crypto');
const ModelCart = require('../models/ModelCart');
const ModelPayment = require('../models/ModelPayment');
const ModelUser = require('../models/ModelUser');
const ModelProducts = require('../models/ModelProducts');
const ModelVoucher = require('../models/ModelVoucher');
const sendMailOrder = require('../SendMail/SendMailOrder');
const { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } = require('vnpay');
const { getVoucherAvailabilityError, consumeVoucher, releaseVoucher, calculateVoucherDiscount, buildCartVoucherPayload, SHIPPING_FEE } = require('../utils/voucherHelpers');
const { applyOrderStatusSideEffects } = require('../utils/orderStatusEffects');
const { reserveStockForProducts, releaseStockForOrder } = require('../utils/inventory');
const { buildOwnedOrderFilter } = require('../utils/orderOwnership');

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

    /** Đồng bộ giá dòng giỏ từ catalog — không tin giá client */
    repriceCartFromCatalog = async (cart) => {
        if (!cart?.products?.length) {
            const err = new Error('Cart is empty');
            err.statusCode = 404;
            throw err;
        }

        let sum = 0;
        for (const line of cart.products) {
            let catalog = null;
            if (line.productId) {
                catalog = await ModelProducts.findById(line.productId).lean();
            }
            if (!catalog && line.nameProduct) {
                catalog = await ModelProducts.findOne({ name: String(line.nameProduct).trim() }).lean();
            }
            if (!catalog) {
                const err = new Error(`Sản phẩm không còn bán: ${line.nameProduct || 'unknown'}`);
                err.statusCode = 400;
                throw err;
            }
            const unitPrice = Number(catalog.price);
            if (!unitPrice || unitPrice <= 0) {
                const err = new Error(`Giá sản phẩm không hợp lệ: ${catalog.name}`);
                err.statusCode = 400;
                throw err;
            }
            line.productId = String(catalog._id);
            line.nameProduct = catalog.name;
            line.price = unitPrice;
            if (Array.isArray(catalog.img) && catalog.img[0]) {
                line.img = catalog.img[0];
            }
            line.type = catalog.type ?? line.type;
            sum += unitPrice * (Number(line.quantity) || 0);
        }

        cart.sumprice = sum;
        cart.markModified('products');

        // Tính lại discount voucher theo giá catalog mới
        if (cart.voucher?.code) {
            const voucher = await ModelVoucher.findOne({
                code: String(cart.voucher.code).trim().toUpperCase(),
            });
            const shippingFee = Number(process.env.ORDER_SHIPPING_FEE || SHIPPING_FEE);
            const availabilityError = getVoucherAvailabilityError(voucher, { orderTotal: cart.sumprice });
            if (availabilityError || !voucher) {
                cart.voucher = {
                    code: '',
                    title: '',
                    category: 'device',
                    discountType: 'money',
                    discountValue: 0,
                    discountAmount: 0,
                };
            } else {
                const discountAmount = calculateVoucherDiscount(voucher, {
                    orderTotal: cart.sumprice,
                    shippingFee,
                });
                cart.voucher = buildCartVoucherPayload(voucher, discountAmount);
            }
            cart.markModified('voucher');
        }

        await cart.save();
        return cart;
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
        stockReserved = false,
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
            stockReserved: !!stockReserved,

            userId,
            // `user` = account email (ownership). `email` = shipping contact (may differ).
            user: email,
            address: address || cart.address || '',
            phone: phone || cart.phone || '',
            username: fullname || cart.name || cart.username || '',
            email: contactEmail || email || '',
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

    markPaidOrderRefunded = (order) => {
        const method = String(order.paymentMethod || '')
            .trim()
            .toUpperCase();
        if (order.paymentStatus === 'paid' && ['MOMO', 'VNPAY'].includes(method)) {
            order.paymentStatus = 'refunded';
            order.refundedAt = new Date();
        }
    };

    reserveCartStock = async (cart) => {
        await reserveStockForProducts(cart.products || []);
    };

    assertCartStockAvailable = async (cart) => {
        const ModelProducts = require('../models/ModelProducts');
        const { LEGACY_DEFAULT_STOCK } = require('../utils/inventory');
        for (const line of cart.products || []) {
            const qty = Number(line.quantity) || 0;
            if (qty <= 0) continue;
            let product = null;
            if (line.productId) {
                product = await ModelProducts.findById(line.productId);
            } else if (line.nameProduct) {
                product = await ModelProducts.findOne({ name: String(line.nameProduct).trim() });
            }
            if (!product) {
                const err = new Error(`Sản phẩm không tồn tại: ${line.nameProduct || ''}`);
                err.statusCode = 400;
                throw err;
            }
            if (typeof product.stock !== 'number') {
                product.stock = LEGACY_DEFAULT_STOCK;
                await product.save();
            }
            if (product.stock < qty) {
                const err = new Error(`Không đủ tồn kho: ${product.name}`);
                err.statusCode = 400;
                throw err;
            }
        }
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

            try {
                await this.repriceCartFromCatalog(cart);
            } catch (priceErr) {
                return res.status(priceErr.statusCode || 400).json({ message: priceErr.message });
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

            try {
                await this.assertCartStockAvailable(cart);
            } catch (stockErr) {
                return res.status(stockErr.statusCode || 400).json({ message: stockErr.message });
            }

            const amounts = this.calculateCartAmounts(cart);

            const partnerCode = process.env.MOMO_PARTNER_CODE;
            const accessKey = process.env.MOMO_ACCESS_KEY;
            const secretKey = process.env.MOMO_SECRET_KEY;
            const redirectUrl = process.env.MOMO_REDIRECT_URL;
            const ipnUrl = process.env.MOMO_IPN_URL;

            const missingMomoConfig = [
                ['MOMO_PARTNER_CODE', partnerCode],
                ['MOMO_ACCESS_KEY', accessKey],
                ['MOMO_SECRET_KEY', secretKey],
                ['MOMO_REDIRECT_URL', redirectUrl],
                ['MOMO_IPN_URL', ipnUrl],
            ]
                .filter(([, value]) => !String(value || '').trim())
                .map(([key]) => key);

            if (missingMomoConfig.length > 0) {
                return res.status(500).json({
                    message: `Thiếu cấu hình MOMO trong .env: ${missingMomoConfig.join(', ')}`,
                });
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

            const momoEndpoint = process.env.MOMO_ENDPOINT_URL || 'https://test-payment.momo.vn/v2/gateway/api/create';

            const response = await axios.post(momoEndpoint, requestBody, {
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

            try {
                await this.repriceCartFromCatalog(cart);
            } catch (priceErr) {
                return res.status(priceErr.statusCode || 400).json({ message: priceErr.message });
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

            try {
                await this.assertCartStockAvailable(cart);
            } catch (stockErr) {
                return res.status(stockErr.statusCode || 400).json({ message: stockErr.message });
            }

            const amounts = this.calculateCartAmounts(cart);

            const vnpay = new VNPay({
                tmnCode: process.env.VNPAY_TMN_CODE,
                secureSecret: process.env.VNPAY_HASH_SECRET,
                vnpayHost: process.env.VNPAY_HOST || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
                testMode: true,
                hashAlgorithm: 'SHA512',
                loggerFn: ignoreLogger,
            });

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const txnRef = `${cart._id}_${Date.now()}`;

            const vnpayResponse = await vnpay.buildPaymentUrl({
                vnp_Amount: amounts.total,
                vnp_IpAddr: (req.ip || '127.0.0.1').toString(),
                vnp_TxnRef: txnRef,
                vnp_OrderInfo: String(cart._id),
                vnp_OrderType: ProductCode.Other,
                vnp_ReturnUrl: process.env.VNPAY_RETURN_URL,
                vnp_Locale: VnpLocale.VN,
                vnp_CreateDate: dateFormat(new Date()),
                vnp_ExpireDate: dateFormat(tomorrow),
                vnp_SecureHashType: 'SHA512',
            });

            return res.status(201).json({ vnpayResponse });
        } catch (error) {
            console.error('paymentVnpay error:', error.message);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    checkPaymentVnpay = async (req, res) => {
        try {
            const redirectBase = process.env.REACT_APP_URL_DOMAIN || process.env.REACT_APP_URL;

            const vnpay = new VNPay({
                tmnCode: process.env.VNPAY_TMN_CODE,
                secureSecret: process.env.VNPAY_HASH_SECRET,
                vnpayHost: process.env.VNPAY_HOST || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
                testMode: true,
                hashAlgorithm: 'SHA512',
                loggerFn: ignoreLogger,
            });

            let verified;
            try {
                verified = vnpay.verifyReturnUrl({ ...req.query });
            } catch (verifyErr) {
                console.error('VNPay verify error:', verifyErr.message);
                return res.redirect(`${redirectBase}/payments`);
            }

            if (!verified?.isVerified || !verified?.isSuccess) {
                return res.redirect(`${redirectBase}/payments`);
            }

            const cartId = req.query.vnp_OrderInfo;
            const vnp_TxnRef = req.query.vnp_TxnRef;

            const existingPayment = await this.hasProcessedPayment({
                paymentMethod: 'VNPAY',
                gatewayTxnRef: vnp_TxnRef,
            });

            if (existingPayment) {
                return res.redirect(`${redirectBase}/paymentsuccess`);
            }

            const cart = await ModelCart.findOne({ _id: cartId });
            if (!cart || !cart.products?.length) {
                return res.redirect(`${redirectBase}/payments`);
            }

            try {
                await this.repriceCartFromCatalog(cart);
            } catch (priceErr) {
                return res.redirect(
                    `${redirectBase}/payments?error=${encodeURIComponent(priceErr.message)}`,
                );
            }

            const voucherError = await this.validateCartVoucherBeforeCheckout(cart);
            if (voucherError) {
                return res.redirect(
                    `${redirectBase}/payments?error=${encodeURIComponent(voucherError)}`,
                );
            }

            const amounts = this.calculateCartAmounts(cart);
            const paidRaw = Number(req.query.vnp_Amount);
            const expected = Number(amounts.total);
            // VNPay thường gửi amount * 100; thư viện có thể đã chuẩn hóa
            const amountOk =
                paidRaw === expected ||
                paidRaw === Math.round(expected * 100) ||
                Math.round(paidRaw / 100) === expected;
            if (!amountOk) {
                console.error('VNPay amount mismatch', { paidRaw, expected });
                return res.redirect(
                    `${redirectBase}/payments?error=${encodeURIComponent('Số tiền thanh toán không khớp')}`,
                );
            }

            try {
                await this.reserveCartStock(cart);
            } catch (stockErr) {
                return res.redirect(
                    `${redirectBase}/payments?error=${encodeURIComponent(stockErr.message)}`,
                );
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
                stockReserved: true,
            });

            const voucherResult = await this.finalizeOrderVoucher(cart, newPayment);
            if (!voucherResult.ok) {
                return res.redirect(
                    `${redirectBase}/payments?error=${encodeURIComponent(voucherResult.message)}`,
                );
            }

            await newPayment.save();
            await cart.deleteOne();

            this.sendOrderMailAsync(cart.user);

            return res.redirect(`${redirectBase}/paymentsuccess`);
        } catch (error) {
            console.error('checkPaymentVnpay error:', error.message);
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    };

    //------------------------------MOMO------------------------------
    checkData = async (req, res) => {
        try {
            const callbackData = { ...req.query, ...req.body };
            const isBrowserRedirect = req.method === 'GET';
            const redirectBase = process.env.REACT_APP_URL_DOMAIN || process.env.REACT_APP_URL;

            const redirectTo = (path) => {
                if (!redirectBase) {
                    return res.status(500).json({ message: 'Missing frontend URL config' });
                }

                return res.redirect(`${redirectBase}${path}`);
            };

            const finishSuccess = (payload = {}) => {
                if (isBrowserRedirect) {
                    return redirectTo('/paymentsuccess');
                }

                return res.status(200).json({ success: true, ...payload });
            };

            const finishFailure = (message, statusCode = 400) => {
                if (isBrowserRedirect) {
                    return redirectTo(`/payments?error=${encodeURIComponent(message)}`);
                }

                return res.status(statusCode).json({ success: false, message });
            };

            const {
                orderInfo,
                amount,
                extraData = '',
                resultCode,
                orderId,
                requestId,
                signature,
                message = '',
                orderType = '',
                payType = '',
                responseTime = '',
                transId = '',
            } = callbackData;

            if (String(resultCode) !== '0') {
                return finishFailure('MOMO payment failed');
            }

            if (!orderInfo || !orderId || !requestId || !amount || !signature) {
                return res.status(400).json({ message: 'Thiếu dữ liệu callback MOMO' });
            }

            const partnerCode = process.env.MOMO_PARTNER_CODE;
            const accessKey = process.env.MOMO_ACCESS_KEY;
            const secretKey = process.env.MOMO_SECRET_KEY;

            if (!partnerCode || !accessKey || !secretKey) {
                return res.status(500).json({ message: 'Missing MOMO config' });
            }

            const rawSignature =
                `accessKey=${accessKey}` +
                `&amount=${amount}` +
                `&extraData=${extraData}` +
                `&message=${message}` +
                `&orderId=${orderId}` +
                `&orderInfo=${orderInfo}` +
                `&orderType=${orderType}` +
                `&partnerCode=${partnerCode}` +
                `&payType=${payType}` +
                `&requestId=${requestId}` +
                `&responseTime=${responseTime}` +
                `&resultCode=${resultCode}` +
                `&transId=${transId}`;

            const expectedSignature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

            if (expectedSignature !== signature) {
                return res.status(400).json({ message: 'Sai chữ ký callback MOMO' });
            }

            const existed = await this.hasProcessedPayment({
                paymentMethod: 'MOMO',
                gatewayOrderId: orderId,
            });

            if (existed) {
                return finishSuccess({ orderId });
            }

            const email = orderInfo;
            const cart = await this.getCartByUserEmail(email);
            const userData = await ModelUser.findOne({ email }).lean();

            if (!cart || !cart.products?.length) {
                return finishFailure('Cart is empty or not found', 404);
            }

            try {
                await this.repriceCartFromCatalog(cart);
            } catch (priceErr) {
                return finishFailure(priceErr.message, priceErr.statusCode || 400);
            }

            const voucherError = await this.validateCartVoucherBeforeCheckout(cart);
            if (voucherError) {
                return finishFailure(voucherError);
            }

            const amounts = this.calculateCartAmounts(cart);
            const paidAmount = Number(amount);
            const expected = Number(amounts.total);
            if (!Number.isFinite(paidAmount) || paidAmount !== expected) {
                console.error('MoMo amount mismatch', { paidAmount, expected });
                return finishFailure('Số tiền thanh toán không khớp', 400);
            }

            try {
                await this.reserveCartStock(cart);
            } catch (stockErr) {
                return finishFailure(stockErr.message, stockErr.statusCode || 400);
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
                stockReserved: true,
            });

            const voucherResult = await this.finalizeOrderVoucher(cart, newPayment);
            if (!voucherResult.ok) {
                return finishFailure(voucherResult.message);
            }

            await newPayment.save();
            await ModelCart.deleteOne({ user: email });

            this.sendOrderMailAsync(email);

            return finishSuccess({ orderId });
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

            const data = await ModelPayment.find(buildOwnedOrderFilter(user))
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

            try {
                await this.repriceCartFromCatalog(cart);
            } catch (priceErr) {
                return res.status(priceErr.statusCode || 400).json({ message: priceErr.message });
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

            try {
                await this.reserveCartStock(cart);
            } catch (stockErr) {
                return res.status(stockErr.statusCode || 400).json({ message: stockErr.message });
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
                gatewayOrderId: `COD_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                stockReserved: true,
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

            const data = await ModelPayment.find(buildOwnedOrderFilter(user))
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
                ...buildOwnedOrderFilter(user),
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

            this.markPaidOrderRefunded(order);
            await this.releaseOrderVoucher(order);
            if (order.stockReserved && !order.stockReleased) {
                await releaseStockForOrder(order);
            }
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

            const activeDelivery = [
                'ASSIGNED',
                'ACCEPTED',
                'DELIVERING',
                'FIRST_DELIVERY_FAILED',
                'REDELIVERING',
                'RETURNING',
                'DELIVERED',
                'DELIVERED_AFTER_RETRY',
                'RETURNED',
            ];

            if (order.deliveryStatus && activeDelivery.includes(order.deliveryStatus)) {
                if (['DELIVERED', 'DELIVERED_AFTER_RETRY', 'RETURNED'].includes(order.deliveryStatus)) {
                    return res.status(400).json({
                        message: 'Đơn đã hoàn tất giao hàng / hoàn hàng, không thể hủy',
                    });
                }
                return res.status(400).json({
                    message:
                        'Đơn đang trong quy trình giao hàng. Không hủy tùy ý — dùng hoàn hàng hoặc để shipper cập nhật kết quả.',
                });
            }

            if (['shipping', 'failed', 'returning', 'returned'].includes(currentStatus)) {
                return res.status(400).json({
                    message: 'Đơn đang giao / hoàn hàng, không thể hủy. Hãy dùng quy trình giao hàng.',
                });
            }

            order.status = 'cancelled';
            order.updatedAt = new Date();

            this.markPaidOrderRefunded(order);
            await this.releaseOrderVoucher(order);
            if (order.stockReserved && !order.stockReleased) {
                await releaseStockForOrder(order);
            }
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

            // Không cho staff/admin tự chuyển shipping/completed — phải qua shipper/deliveryStatus
            if (['shipping', 'completed', 'failed', 'returning', 'returned'].includes(nextStatus)) {
                return res.status(403).json({
                    message:
                        'Trạng thái giao hàng chỉ cập nhật qua shipper / quy trình deliveryStatus (không sửa tay tại đây).',
                    order: null,
                });
            }

            // Không cho hủy bằng EditOrder khi đơn đã vào luồng giao hàng
            if (order.deliveryStatus && nextStatus === 'cancelled') {
                return res.status(403).json({
                    message:
                        'Không hủy đơn đang trong quy trình giao hàng. Dùng hoàn hàng hoặc để shipper cập nhật kết quả.',
                    order: null,
                });
            }

            // Lock shipper-owned delivery results — only allow confirm return via dedicated API
            if (order.deliveryStatus) {
                const lockedResults = [
                    'DELIVERING',
                    'DELIVERED',
                    'FIRST_DELIVERY_FAILED',
                    'REDELIVERING',
                    'DELIVERED_AFTER_RETRY',
                    'RETURNING',
                    'RETURNED',
                    'ACCEPTED',
                    'ASSIGNED',
                ];

                if (lockedResults.includes(order.deliveryStatus)) {
                    if (order.deliveryStatus === 'RETURNING' && nextStatus === 'returned') {
                        return res.status(400).json({
                            message:
                                'Vui lòng dùng API xác nhận hoàn hàng (confirm-return) để chuyển sang Đã hoàn hàng',
                            order: null,
                        });
                    }

                    return res.status(403).json({
                        message:
                            'Không được sửa kết quả giao hàng của shipper tại đây. Chỉ shipper cập nhật kết quả; Admin/Staff xác nhận hoàn hàng qua chức năng riêng.',
                        order: null,
                    });
                }
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
