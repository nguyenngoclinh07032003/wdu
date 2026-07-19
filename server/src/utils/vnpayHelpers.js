const crypto = require('crypto');
const qs = require('qs');

/**
 * Official VNPay Node.js sort/encode helper (sandbox demo).
 * Encode key/value first, then stringify with encode:false when signing.
 */
function sortObject(obj) {
    const sorted = {};
    const keys = [];

    Object.keys(obj || {}).forEach((key) => {
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
            keys.push(encodeURIComponent(key));
        }
    });

    keys.sort();

    keys.forEach((encodedKey) => {
        const originalKey = decodeURIComponent(encodedKey);
        sorted[encodedKey] = encodeURIComponent(String(obj[originalKey])).replace(/%20/g, '+');
    });

    return sorted;
}

function getVnPayConfig() {
    const tmnCode = String(process.env.VNPAY_TMN_CODE || '').trim();
    const hashSecret = String(process.env.VNPAY_HASH_SECRET || '').trim();
    const returnUrl = String(process.env.VNPAY_RETURN_URL || '').trim();

    let paymentUrl = String(
        process.env.VNPAY_URL ||
            process.env.VNPAY_HOST ||
            'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    ).trim();

    // Accept either domain-only or full payment URL
    if (paymentUrl && !/vpcpay\.html/i.test(paymentUrl)) {
        paymentUrl = paymentUrl.replace(/\/+$/, '') + '/paymentv2/vpcpay.html';
    }

    if (!tmnCode || !hashSecret) {
        const err = new Error('Thiếu cấu hình VNPAY_TMN_CODE / VNPAY_HASH_SECRET trong .env');
        err.statusCode = 500;
        throw err;
    }

    if (!returnUrl) {
        const err = new Error('Thiếu cấu hình VNPAY_RETURN_URL trong .env');
        err.statusCode = 500;
        throw err;
    }

    return { tmnCode, hashSecret, returnUrl, paymentUrl };
}

function formatVnPayDate(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const get = (type) => parts.find((part) => part.type === type)?.value || '00';
    return `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`;
}

function createHmacSha512(secret, signData) {
    return crypto.createHmac('sha512', secret).update(Buffer.from(signData, 'utf-8')).digest('hex');
}

/**
 * Build payment URL exactly like VNPay official Node.js demo.
 */
function buildPaymentUrl({ amount, orderInfo, txnRef, ipAddr, locale = 'vn', orderType = 'other' }) {
    const { tmnCode, hashSecret, returnUrl, paymentUrl } = getVnPayConfig();

    const amountVnd = Math.round(Number(amount) || 0);
    if (!Number.isFinite(amountVnd) || amountVnd < 1000) {
        const err = new Error('Số tiền thanh toán không hợp lệ');
        err.statusCode = 400;
        throw err;
    }

    let vnpParams = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: tmnCode,
        vnp_Locale: locale || 'vn',
        vnp_CurrCode: 'VND',
        vnp_TxnRef: String(txnRef),
        vnp_OrderInfo: String(orderInfo || `Thanh toan don hang ${txnRef}`),
        vnp_OrderType: orderType || 'other',
        vnp_Amount: amountVnd * 100,
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr: String(ipAddr || '127.0.0.1'),
        vnp_CreateDate: formatVnPayDate(new Date()),
    };

    vnpParams = sortObject(vnpParams);

    const signData = qs.stringify(vnpParams, { encode: false });
    const signed = createHmacSha512(hashSecret, signData);
    vnpParams.vnp_SecureHash = signed;

    return `${paymentUrl}?${qs.stringify(vnpParams, { encode: false })}`;
}

/**
 * Verify return/IPN callback signature (official demo method).
 */
function verifyReturnUrl(query = {}) {
    const { hashSecret } = getVnPayConfig();
    const receivedHash = String(query.vnp_SecureHash || '');

    const clone = { ...query };
    delete clone.vnp_SecureHash;
    delete clone.vnp_SecureHashType;

    const sorted = sortObject(clone);
    const signData = qs.stringify(sorted, { encode: false });
    const signed = createHmacSha512(hashSecret, signData);

    const isVerified = !!receivedHash && signed.toLowerCase() === receivedHash.toLowerCase();
    const responseCode = String(query.vnp_ResponseCode || '');

    return {
        isVerified,
        isSuccess: isVerified && responseCode === '00',
        responseCode,
        message: isVerified ? 'Checksum ok' : 'Wrong checksum',
        amount: Number(query.vnp_Amount || 0) / 100,
    };
}

module.exports = {
    buildPaymentUrl,
    verifyReturnUrl,
    getVnPayConfig,
    formatVnPayDate,
    sortObject,
};
