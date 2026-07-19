const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'unit-test-secret';
process.env.EXPIRES_IN = process.env.EXPIRES_IN || '15m';

const ControllerUser = require('../src/controllers/ControllerUsers');
const ControllerProduct = require('../src/controllers/ControllerProduct');
const ControllerPayments = require('../src/controllers/ControllerPayments');
const ControllerAddress = require('../src/controllers/Controlleraddress');
const ControllerReminder = require('../src/controllers/ControllerReminder');
const ControllerBlog = require('../src/controllers/ControllerBlog');

const Blog = require('../src/models/ModelBlog');

const { sanitizeProductHtml } = require('../src/utils/sanitizeHtml');
const {
    calculateVoucherDiscount,
    getVoucherAvailabilityError,
    isVoucherOutOfStock,
    SHIPPING_FEE,
} = require('../src/utils/voucherHelpers');
const {
    DELIVERY_STATUS,
    validateTransition,
    validateFailurePayload,
    applyDeliveryFields,
    toPublicDeliveryView,
} = require('../src/utils/deliveryStatus');
const { buildOwnedOrderFilter, isOrderOwnedByUser } = require('../src/utils/orderOwnership');
const { matchesDoctorFilter, enrichConversation, matchesStaffPending } = require('../src/utils/doctorInboxWorkflow');
const { isValidPhone, appendStatusHistory } = require('../src/utils/supportRequestHelpers');
const { containsBadWords } = require('../src/utils/badWords');
const { ACTIVE_DELIVERY_STATUSES, ACTIVE_SHIPPER_ORDER_STATUSES } = require('../src/utils/shipperDelivery');

function mockRes() {
    return {
        statusCode: null,
        body: undefined,
        cookies: [],
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        },
        cookie(name, value, options) {
            this.cookies.push({ name, value, options });
            return this;
        },
    };
}

test('AUTH_REGISTER - rejects registration when required fields are missing', async () => {
    const res = mockRes();

    await ControllerUser.Register({ body: { email: 'customer@example.com' } }, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /th/i);
});

test('AUTH_LOGIN - rejects login when email or password is missing', async () => {
    const res = mockRes();

    await ControllerUser.Login({ body: { email: 'customer@example.com' } }, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /email/i);
});

test('USER_PROFILE_UPDATE - requires authenticated user token data', async () => {
    const res = mockRes();

    await ControllerUser.UpdateProfile({ user: null, body: { fullname: 'New Name' } }, res);

    assert.equal(res.statusCode, 401);
});

test('PRODUCT_SEARCH - empty product search returns an empty result without database lookup', async () => {
    const res = mockRes();

    await ControllerProduct.SearchProduct({ query: { nameProduct: '   ' } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, []);
});

test('PRODUCT_ADMIN - product description sanitizer removes unsafe HTML but keeps safe content', () => {
    const html = '<h1>Blood Pressure Monitor</h1><script>alert(1)</script><p>Safe description</p>';

    const cleaned = sanitizeProductHtml(html);

    assert.match(cleaned, /Blood Pressure Monitor/);
    assert.match(cleaned, /Safe description/);
    assert.doesNotMatch(cleaned, /<script/i);
    assert.doesNotMatch(cleaned, /alert\(1\)/i);
});

test('CART_MANAGEMENT - cart totals include product discount and shipping fee', () => {
    const cart = {
        products: [
            { price: 100000, quantity: 2 },
            { price: 50000, quantity: 1 },
        ],
        voucher: {
            code: 'SAVE30',
            category: 'device',
            discountAmount: 30000,
        },
    };

    const amounts = ControllerPayments.calculateCartAmounts(cart);

    assert.equal(amounts.subtotal, 250000);
    assert.equal(amounts.productDiscount, 30000);
    assert.equal(amounts.shippingFee, Number(process.env.ORDER_SHIPPING_FEE || 30000));
    assert.equal(amounts.total, 250000 - 30000 + amounts.shippingFee);
});

test('PAYMENT_CHECKOUT - checkout validation requires complete shipping information', () => {
    const missingAddress = ControllerPayments.validateShippingInfo({
        name: 'Customer A',
        phone: '0912345678',
        address: '',
    });
    const valid = ControllerPayments.validateShippingInfo({
        name: 'Customer A',
        phone: '0912345678',
        address: 'FPT University',
    });

    assert.equal(typeof missingAddress, 'string');
    assert.equal(valid, null);
});

test('ADDRESS_BOOK - create address rejects invalid phone before persistence', async () => {
    const res = mockRes();

    await ControllerAddress.createAddress(
        {
            user: { id: 'user-1' },
            body: {
                fullName: 'Customer A',
                phone: '12345',
                province: 'Ha Noi',
                ward: 'Hoa Lac',
                detail: 'FPT University',
            },
        },
        res,
    );

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /tho/i);
});

test('DOCTOR_INBOX - doctor and staff filters route pending conversations correctly', () => {
    const doctorQuestion = {
        targetRole: 'doctor',
        escalatedToDoctor: true,
        needsReply: true,
        status: 'pending',
    };
    const answeredQuestion = {
        targetRole: 'doctor',
        escalatedToDoctor: true,
        needsReply: false,
        status: 'answered',
    };
    const staffQuestion = {
        targetRole: 'staff',
        needsReply: true,
        status: 'pending',
    };

    assert.equal(matchesDoctorFilter(doctorQuestion, 'pending'), true);
    assert.equal(matchesDoctorFilter(answeredQuestion, 'pending'), false);
    assert.equal(matchesStaffPending(staffQuestion), true);
    assert.equal(enrichConversation(doctorQuestion).isEscalated, true);
});

test('SUPPORT_REQUEST - validates phone and appends status history for staff workflow', () => {
    const record = { status: 'pending', statusHistory: [] };

    assert.equal(isValidPhone('0912345678'), true);
    assert.equal(isValidPhone('123456'), false);

    appendStatusHistory(
        record,
        'processing',
        'Staff accepted request',
        { id: 'staff-1', fullname: 'Staff One' },
        'staff_receive',
    );

    assert.equal(record.status, 'processing');
    assert.equal(record.statusHistory.length, 1);
    assert.equal(record.statusHistory[0].previousStatus, 'pending');
});

test('REMINDER - create reminder requires title and at least one reminder time', async () => {
    const res = mockRes();

    await ControllerReminder.createReminder(
        {
            user: { id: 'user-1', email: 'customer@example.com' },
            body: { title: '', times: [] },
        },
        res,
    );

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
});

test('VOUCHER - availability and discount rules match voucher worksheet cases', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const voucher = {
        code: 'SAVE20',
        title: 'Save 20 percent',
        isActive: true,
        expiredAt: tomorrow,
        quantity: 10,
        used: 2,
        minOrderValue: 100000,
        category: 'device',
        discountType: 'percent',
        discountValue: 20,
        maxDiscount: 50000,
    };

    assert.equal(getVoucherAvailabilityError(voucher, { orderTotal: 200000 }), null);
    assert.equal(calculateVoucherDiscount(voucher, { orderTotal: 400000, shippingFee: SHIPPING_FEE }), 50000);
    assert.equal(isVoucherOutOfStock({ quantity: 2, used: 2 }), true);
});

test('BLOG_MANAGEMENT - public blog list queries only published and non-deleted posts', async (t) => {
    const originalFind = Blog.find;
    let capturedFilter = null;

    Blog.find = (filter) => {
        capturedFilter = filter;
        return {
            sort() {
                return {
                    select() {
                        return [{ title: 'Healthcare tips', slug: 'healthcare-tips' }];
                    },
                };
            },
        };
    };
    t.after(() => {
        Blog.find = originalFind;
    });

    const res = mockRes();
    await ControllerBlog.getBlogs({}, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(capturedFilter, { status: 'published', deleted: false });
    assert.equal(res.body.blogs[0].slug, 'healthcare-tips');
});

test('REVIEW - review content policy blocks unsafe links and bad words', () => {
    assert.equal(containsBadWords('Good product and fast delivery'), false);
    assert.equal(containsBadWords('Visit https://spam.example for deal'), true);
});

test('SHIPPER - delivery workflow validates transitions, failure payload, and public view', () => {
    assert.equal(
        validateTransition(DELIVERY_STATUS.ASSIGNED, DELIVERY_STATUS.DELIVERING, 'shipper').ok,
        true,
    );
    assert.equal(
        validateTransition(DELIVERY_STATUS.RETURNING, DELIVERY_STATUS.RETURNED, 'shipper').ok,
        false,
    );
    assert.equal(validateFailurePayload(DELIVERY_STATUS.FIRST_DELIVERY_FAILED, {}).ok, false);

    const order = {
        _id: 'order-1',
        shipperId: 'shipper-1',
        deliveryStatus: DELIVERY_STATUS.DELIVERING,
        status: 'shipping',
    };
    applyDeliveryFields(order, DELIVERY_STATUS.DELIVERED, {}, { userId: 'shipper-1' });

    assert.equal(order.status, 'completed');
    assert.equal(order.deliverySuccessAttempt, 1);
    assert.equal(toPublicDeliveryView(order, 'user').firstFailureNote, undefined);
    assert.ok(ACTIVE_DELIVERY_STATUSES.includes(DELIVERY_STATUS.REDELIVERING));
    assert.ok(ACTIVE_SHIPPER_ORDER_STATUSES.includes('shipping'));
});

test('ADMIN_USER_ORDER - order ownership ignores shipping contact email to prevent IDOR', () => {
    const user = { id: 'user-1', email: 'owner@example.com' };
    const otherUserOrder = {
        userId: 'user-2',
        user: 'other@example.com',
        email: 'owner@example.com',
    };
    const ownedByAccountEmail = {
        userId: 'user-2',
        user: 'OWNER@example.com',
        email: 'receiver@example.com',
    };

    assert.deepEqual(buildOwnedOrderFilter(user), {
        $or: [{ userId: 'user-1' }, { user: 'owner@example.com' }],
    });
    assert.equal(isOrderOwnedByUser(otherUserOrder, user), false);
    assert.equal(isOrderOwnedByUser(ownedByAccountEmail, user), true);
});
