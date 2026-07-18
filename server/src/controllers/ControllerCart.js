const modelCart = require('../models/ModelCart');
const modelUser = require('../models/ModelUser');
const ModelVoucher = require('../models/ModelVoucher');
const ModelProducts = require('../models/ModelProducts');
const {
    SHIPPING_FEE,
    getVoucherAvailabilityError,
    calculateVoucherDiscount,
    buildCartVoucherPayload,
    isVoucherExpired,
    isVoucherOutOfStock,
} = require('../utils/voucherHelpers');

async function resolveCatalogProduct({ productId, nameProduct }) {
    let product = null;
    if (productId) {
        product = await ModelProducts.findById(productId).lean();
    }
    if (!product && nameProduct) {
        product = await ModelProducts.findOne({ name: String(nameProduct).trim() }).lean();
    }
    return product;
}

// Hàm để tính toán và áp dụng voucher cho giỏ hàng
const resetCartVoucher = (cart) => {
    cart.voucher = {
        code: '',
        title: '',
        category: 'device',
        discountType: 'money',
        discountValue: 0,
        discountAmount: 0,
    };
};

const validateCartVoucher = async (cart) => {
    if (!cart?.voucher?.code) return;

    const voucher = await ModelVoucher.findOne({
        code: cart.voucher.code,
    });

    const availabilityError = getVoucherAvailabilityError(voucher, { orderTotal: cart.sumprice });

    if (availabilityError) {
        resetCartVoucher(cart);
        return;
    }

    const discountAmount = calculateVoucherDiscount(voucher, { orderTotal: cart.sumprice, shippingFee: SHIPPING_FEE });

    cart.voucher = buildCartVoucherPayload(voucher, discountAmount);
};
class ControllerCart {
    async AddToCart(req, res) {
        try {
            const user = req.user;

            if (!user || !user.email) {
                return res.status(401).json({
                    message: 'Không có token, vui lòng đăng nhập lại!',
                });
            }

            const { nameProduct, quantityProduct, priceProduct, imgProduct, size, type, productId } = req.body;

            if (!nameProduct || !quantityProduct || !imgProduct || type === undefined || type === null) {
                return res.status(400).json({
                    message: 'Dữ liệu không đầy đủ!',
                });
            }

            const catalog = await resolveCatalogProduct({ productId, nameProduct });
            if (!catalog) {
                return res.status(404).json({ message: 'Không tìm thấy sản phẩm trong hệ thống' });
            }

            const unitPrice = Number(catalog.price);
            if (!unitPrice || unitPrice <= 0) {
                return res.status(400).json({ message: 'Giá sản phẩm không hợp lệ' });
            }

            const qty = Math.max(1, Number(quantityProduct) || 1);
            const lineImg = Array.isArray(catalog.img) ? catalog.img[0] : imgProduct;
            const lineName = catalog.name || nameProduct;
            const lineType = catalog.type ?? type;
            const catalogId = String(catalog._id);

            const dataUser = await modelCart.findOne({ user: user.email });
            const dataUser2 = await modelUser.findOne({ email: user.email });

            if (dataUser) {
                const updatedCart = await modelCart.findOneAndUpdate(
                    { user: user.email },
                    {
                        $push: {
                            products: {
                                productId: catalogId,
                                nameProduct: lineName,
                                quantity: qty,
                                price: unitPrice,
                                size,
                                img: lineImg,
                                type: lineType,
                            },
                        },
                        $inc: {
                            sumprice: unitPrice * qty,
                        },
                    },
                    { new: true },
                );

                if (updatedCart) {
                    return res.status(200).json({
                        message: 'Thêm Vào Giỏ Hàng Thành Công !!!',
                    });
                }
            } else {
                const newCart = new modelCart({
                    products: [
                        {
                            productId: catalogId,
                            nameProduct: lineName,
                            quantity: qty,
                            price: unitPrice,
                            size,
                            img: lineImg,
                            type: lineType,
                        },
                    ],
                    sumprice: unitPrice * qty,
                    user: user.email,
                    phone: dataUser2?.phone || 0,
                });

                await newCart.save();

                return res.status(200).json({
                    message: 'Thêm Vào Giỏ Hàng Thành Công !!!',
                });
            }
        } catch (err) {
            return res.status(500).json({
                message: 'Có Lỗi Xảy Ra !!!',
                error: err.message,
            });
        }
    }

    async GetCart(req, res) {
        try {
            const user = req.user;

            if (!user || !user.email) {
                return res.status(401).json({
                    message: 'Không có token, vui lòng đăng nhập lại!',
                });
            }

            const dataCart = await modelCart.find({ user: user.email });

            return res.status(200).json(dataCart);
        } catch (err) {
            return res.status(500).json({
                message: 'Có lỗi xảy ra !!!',
                error: err.message,
            });
        }
    }

    async DeleteCart(req, res) {
        try {
            const user = req.user;

            if (!user || !user.email) {
                return res.status(401).json({
                    message: 'Không có token, vui lòng đăng nhập lại!',
                });
            }

            const { id } = req.body;

            if (!id) {
                return res.status(400).json({
                    message: 'ID sản phẩm không hợp lệ!',
                });
            }

            const cart = await modelCart.findOne({ user: user.email });

            if (!cart) {
                return res.status(404).json({
                    message: 'Không tìm thấy giỏ hàng!',
                });
            }

            const productIndex = cart.products.findIndex((product) => product._id.toString() === id);

            if (productIndex === -1) {
                return res.status(404).json({
                    message: 'Sản phẩm không tồn tại trong giỏ hàng!',
                });
            }

            const removedProduct = cart.products[productIndex];

            cart.sumprice -= removedProduct.price * removedProduct.quantity;
            cart.products.splice(productIndex, 1);

            if (cart.sumprice < 0) {
                cart.sumprice = 0;
            }

            await validateCartVoucher(cart);

            await cart.save();

            return res.status(200).json({
                message: 'Xóa Sản Phẩm Thành Công !!!',
            });
        } catch (err) {
            return res.status(500).json({
                message: 'Có Lỗi Xảy Ra !!!',
                error: err.message,
            });
        }
    }

    async updateInfoCart(req, res) {
        try {
            const { name, phone, address } = req.body;

            if (!name || !phone || !address) {
                return res.status(400).json({
                    message: 'Dữ liệu không đầy đủ',
                });
            }

            const user = req.user;

            if (!user || !user.email) {
                return res.status(401).json({
                    message: 'Không có token, vui lòng đăng nhập lại!',
                });
            }

            const updatedCart = await modelCart.findOneAndUpdate(
                { user: user.email },
                { name, phone, address },
                { new: true },
            );

            if (!updatedCart) {
                return res.status(404).json({
                    message: 'Không tìm thấy giỏ hàng',
                });
            }

            return res.status(200).json({
                message: 'Cập nhật thông tin giỏ hàng thành công',
                updatedCart,
            });
        } catch (err) {
            return res.status(500).json({
                message: 'Có lỗi xảy ra !!!',
                error: err.message,
            });
        }
    }

    async UpdateQuantityCart(req, res) {
        try {
            const user = req.user;

            if (!user || !user.email) {
                return res.status(401).json({
                    message: 'Không có token, vui lòng đăng nhập lại!',
                });
            }

            const { id, quantity } = req.body;

            if (!id || quantity === undefined) {
                return res.status(400).json({
                    message: 'Thiếu id hoặc số lượng sản phẩm!',
                });
            }

            if (quantity < 1) {
                return res.status(400).json({
                    message: 'Số lượng phải lớn hơn 0!',
                });
            }

            const cart = await modelCart.findOne({ user: user.email });

            if (!cart) {
                return res.status(404).json({
                    message: 'Không tìm thấy giỏ hàng!',
                });
            }

            const product = cart.products.find((item) => item._id.toString() === id);

            if (!product) {
                return res.status(404).json({
                    message: 'Sản phẩm không tồn tại trong giỏ hàng!',
                });
            }

            cart.sumprice -= product.price * product.quantity;
            product.quantity = quantity;
            cart.sumprice += product.price * product.quantity;

            await validateCartVoucher(cart);
            await cart.save();

            return res.status(200).json({
                message: 'Cập nhật số lượng sản phẩm thành công!',
                cart,
            });
        } catch (err) {
            return res.status(500).json({
                message: 'Có lỗi xảy ra !!!',
                error: err.message,
            });
        }
    }

    async ApplyVoucher(req, res) {
        try {
            const user = req.user;

            if (!user || !user.email) {
                return res.status(401).json({
                    message: 'Không có token, vui lòng đăng nhập lại!',
                });
            }

            const { code } = req.body;

            if (!code) {
                return res.status(400).json({
                    message: 'Vui lòng nhập mã voucher',
                });
            }

            const cart = await modelCart.findOne({ user: user.email });

            if (!cart || cart.products.length === 0) {
                return res.status(404).json({
                    message: 'Giỏ hàng đang trống',
                });
            }

            const voucher = await ModelVoucher.findOne({
                code: String(code).trim().toUpperCase(),
            });

            const availabilityError = getVoucherAvailabilityError(voucher, { orderTotal: cart.sumprice });

            if (availabilityError) {
                if (voucher) {
                    if (isVoucherExpired(voucher.expiredAt) || isVoucherOutOfStock(voucher)) {
                        voucher.isActive = false;
                        await voucher.save();
                    }
                }

                return res.status(400).json({
                    message: availabilityError,
                });
            }

            const discountAmount = calculateVoucherDiscount(voucher, {
                orderTotal: cart.sumprice,
                shippingFee: SHIPPING_FEE,
            });

            cart.voucher = buildCartVoucherPayload(voucher, discountAmount);

            await validateCartVoucher(cart);
            await cart.save();

            return res.status(200).json({
                message: 'Áp dụng voucher thành công',
                voucher: cart.voucher,
            });
        } catch (err) {
            return res.status(500).json({
                message: 'Có lỗi xảy ra !!!',
                error: err.message,
            });
        }
    }

    async RemoveVoucher(req, res) {
        try {
            const user = req.user;

            if (!user || !user.email) {
                return res.status(401).json({
                    message: 'Không có token, vui lòng đăng nhập lại!',
                });
            }

            const cart = await modelCart.findOne({ user: user.email });

            if (!cart) {
                return res.status(404).json({
                    message: 'Không tìm thấy giỏ hàng',
                });
            }

            cart.voucher = {
                code: '',
                title: '',
                category: 'device',
                discountType: 'money',
                discountValue: 0,
                discountAmount: 0,
            };

            await validateCartVoucher(cart);
            await cart.save();

            return res.status(200).json({
                message: 'Đã xóa voucher',
            });
        } catch (err) {
            return res.status(500).json({
                message: 'Có lỗi xảy ra !!!',
                error: err.message,
            });
        }
    }
}

module.exports = new ControllerCart();
