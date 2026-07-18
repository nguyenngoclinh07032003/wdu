const ModelPayment = require('../models/ModelPayment');
const ModelVoucher = require('../models/ModelVoucher');
const ModelCart = require('../models/ModelCart');
const modelProduct = require('../models/ModelProducts');

async function getMyOrders(userId) {
    if (!userId) {
        return {
            success: false,
            message: 'Anh/chị cần đăng nhập để xem đơn hàng.',
        };
    }

    const orders = await ModelPayment.find({ userId }).sort({ createdAt: -1 }).limit(5).lean();

    return {
        success: true,
        type: 'orders',
        data: orders,
    };
}

async function getMyVouchers(userId) {
    if (!userId) {
        return {
            success: false,
            message: 'Anh/chị cần đăng nhập để xem voucher.',
        };
    }

    // Chỉ trả thông tin công khai an toàn — không dump toàn bộ mã voucher nội bộ
    const vouchers = await ModelVoucher.find({
        isActive: true,
    })
        .select('title category discountType discountValue maxDiscount minOrderValue expiredAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

    return {
        success: true,
        type: 'vouchers',
        data: vouchers.map((v) => ({
            title: v.title,
            category: v.category,
            discountType: v.discountType,
            discountValue: v.discountValue,
            maxDiscount: v.maxDiscount,
            minOrderValue: v.minOrderValue,
            expiredAt: v.expiredAt,
            // Không trả code đầy đủ cho chatbot
            hint: 'Vào trang Voucher trên website để áp mã cụ thể.',
        })),
    };
}

async function getMyCart(userId, email = '') {
    if (!userId && !email) {
        return {
            success: false,
            message: 'Anh/chị cần đăng nhập để xem giỏ hàng.',
        };
    }

    const cart = await ModelCart.findOne({
        $or: [{ user: String(userId) }, { user: String(email) }],
    }).lean();

    return {
        success: true,
        type: 'cart',
        data: cart,
    };
}

async function addToCart(userId, productId, quantity = 1) {
    if (!userId) {
        return {
            success: false,
            message: 'Anh/chị cần đăng nhập để thêm sản phẩm vào giỏ hàng.',
        };
    }

    const product = await modelProduct.findById(productId).lean();

    if (!product) {
        return {
            success: false,
            message: 'Không tìm thấy sản phẩm.',
        };
    }

    let cart = await ModelCart.findOne({
        user: String(userId),
    });
    if (!cart) {
        cart = await ModelCart.create({
            user: String(userId),
            products: [],
        });
    }

    const existed = cart.products.find((item) => String(item.productId) === String(productId));

    if (existed) {
        existed.quantity += Number(quantity || 1);
    } else {
        cart.products.push({
            productId: product._id,
            nameProduct: product.name,
            price: product.price,
            quantity: Number(quantity || 1),
            img: Array.isArray(product.img) ? product.img[0] : product.img,
        });
    }

    await cart.save();

    return {
        success: true,
        type: 'add_to_cart',
        message: `Đã thêm ${product.name} vào giỏ hàng.`,
        data: cart,
    };
}

async function runChatbotTool(action = {}) {
    const { name, userId, email, productId, quantity } = action;

    switch (name) {
        case 'GET_MY_ORDERS':
            return getMyOrders(userId);

        case 'GET_MY_VOUCHERS':
            return getMyVouchers(userId);

        case 'GET_MY_CART':
            return getMyCart(userId, email);

        case 'ADD_TO_CART':
            return addToCart(userId, productId, quantity);

        default:
            return {
                success: false,
                message: 'Hành động không hợp lệ.',
            };
    }
}

module.exports = {
    runChatbotTool,
};
