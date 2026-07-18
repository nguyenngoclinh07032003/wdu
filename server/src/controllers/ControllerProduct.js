const ModelProducts = require('../models/ModelProducts');
const modelProducts = require('../models/ModelProducts');
const ModelPayment = require('../models/ModelPayment');
const slugify = require('slugify');
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const { sanitizeProductHtml } = require('../utils/sanitizeHtml');

class controllerProducts {
    async AddProducts(req, res) {
        try {
            const { nameProduct, priceProduct, description, checkType, isCombo } = req.body;

            const imgFiles = req.files?.fileImg || [];
            const videoFiles = req.files?.fileVideo || [];

            const imgUrls = imgFiles.map((file) => file.filename);
            const videoUrls = videoFiles.map((file) => file.filename);

            const slug = slugify(nameProduct, {
                replacement: '-',
                lower: false,
                strict: false,
                locale: 'vi',
                trim: true,
            });

            const newProducts = new modelProducts({
                name: nameProduct,
                price: priceProduct,
                description: sanitizeProductHtml(description),
                slug,
                img: imgUrls,
                videos: videoUrls,
                type: checkType,
                isCombo: isCombo === 'true' || isCombo === true,
            });

            await newProducts.save();

            return res.status(200).json({
                message: 'Thêm sản phẩm thành công',
                product: newProducts,
            });
        } catch (error) {
            console.log('AddProducts error:', error);

            return res.status(500).json({
                message: 'Lỗi thêm sản phẩm',
                error: error.message,
            });
        }
    }

    GetProducts(req, res) {
        modelProducts.find({}).then((dataProduct) => {
            return res.status(200).json(dataProduct);
        });
    }

    async GetComboProducts(req, res) {
        try {
            const dataCombo = await modelProducts
                .find({
                    $or: [{ isCombo: true }, { isCombo: 'true' }],
                })
                .sort({ _id: -1 });

            return res.status(200).json(dataCombo);
        } catch (error) {
            console.log(error);

            return res.status(500).json({
                message: 'Lỗi lấy combo sản phẩm',
            });
        }
    }

    async GetOneProducts(req, res) {
        try {
            const id = req.query.id;
            const dataProduct = await modelProducts.findOne({ _id: id });

            if (!dataProduct) {
                return res.status(200).json([]);
            }

            return res.status(200).json([dataProduct]);
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi lấy sản phẩm',
                error: error.message,
            });
        }
    }

    async SearchProduct(req, res) {
        try {
            const { nameProduct } = req.query;

            if (!nameProduct || nameProduct.trim() === '' || nameProduct === 'undefined') {
                return res.status(200).json([]);
            }

            const dataProducts = await modelProducts.find({
                name: { $regex: nameProduct, $options: 'i' },
            });

            const validProducts = dataProducts.filter((product) => mongoose.Types.ObjectId.isValid(product._id));

            return res.status(200).json(validProducts);
        } catch (error) {
            console.error('Lỗi tìm kiếm sản phẩm:', error);

            return res.status(500).json({
                message: 'Lỗi server, vui lòng thử lại sau',
            });
        }
    }

    async EditPro(req, res) {
        try {
            const { id, nameProduct, priceProduct, description } = req.body;

            const data = await ModelProducts.findOne({ _id: id });

            if (!data) {
                return res.status(404).json({
                    message: 'Không tìm thấy sản phẩm',
                });
            }

            await data.updateOne({
                name: nameProduct,
                price: priceProduct,
                description: sanitizeProductHtml(description),
            });

            return res.status(200).json({
                message: 'Cập nhật thành công',
            });
        } catch (error) {
            console.log(error);

            return res.status(500).json({
                message: 'Lỗi cập nhật sản phẩm',
            });
        }
    }

    async deletePro(req, res) {
        try {
            const { id } = req.query;
            const dataPro = await modelProducts.findOne({ _id: id });

            if (!dataPro) {
                return res.status(404).json({
                    message: 'Sản phẩm không tồn tại!',
                });
            }

            const arrayImg = dataPro.img || [];
            const arrayVideo = dataPro.videos || [];

            const filePaths = [...arrayImg, ...arrayVideo].map((item) => path.join(__dirname, '../uploads', item));

            await modelProducts.deleteOne({ _id: id });

            await Promise.all(filePaths.map((file) => fs.unlink(file).catch(() => {})));

            return res.status(200).json({
                message: 'Xóa thành công!',
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi server!',
                error: error.message,
            });
        }
    }

    async EditOrder(req, res) {
        const id = req.body.id;
        const dataOrder = await ModelPayment.findOne({ _id: id });

        if (dataOrder) {
            await dataOrder.updateOne({
                tinhtrang: req.body.valueOption === 0 ? false : true,
            });

            return res.status(200).json({
                message: 'Cập nhật thành công',
            });
        }

        return res.status(404).json({
            message: 'Không tìm thấy đơn hàng',
        });
    }

    async similarProduct(req, res) {
        try {
            const { type, productId } = req.query;

            if (!type) {
                return res.status(400).json({
                    message: 'Thiếu type sản phẩm',
                });
            }

            const products = await modelProducts
                .find({
                    type: parseInt(type),
                    _id: { $ne: productId },
                })
                .limit(8);

            return res.status(200).json(products);
        } catch (error) {
            console.error('Error in similarProduct:', error);

            return res.status(500).json({
                message: 'Lỗi server',
            });
        }
    }

    async UpdateOrderStatus(req, res) {
        try {
            const { id, status } = req.body;

            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    message: 'ID đơn hàng không hợp lệ',
                });
            }

            const allowStatus = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];

            if (!allowStatus.includes(status)) {
                return res.status(400).json({
                    message: 'Trạng thái đơn hàng không hợp lệ',
                });
            }

            const order = await ModelPayment.findById(id);

            if (!order) {
                return res.status(404).json({
                    message: 'Không tìm thấy đơn hàng',
                });
            }

            const oldStatus = order.status;

            order.status = status;
            await order.save();

            if (oldStatus !== 'completed' && status === 'completed') {
                await Promise.all(
                    order.products.map((product) =>
                        modelProducts.updateOne(
                            {
                                name: product.nameProduct,
                            },
                            {
                                $inc: {
                                    sold: Number(product.quantity || 0),
                                },
                            },
                        ),
                    ),
                );
            }

            return res.status(200).json({
                message: 'Cập nhật trạng thái đơn hàng thành công',
                order,
            });
        } catch (error) {
            console.log('Lỗi UpdateOrderStatus:', error);

            return res.status(500).json({
                message: 'Lỗi cập nhật trạng thái đơn hàng',
                error: error.message,
            });
        }
    }
}

module.exports = new controllerProducts();
