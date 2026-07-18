const modelReview = require('../models/ModelReview');
const ModelPayment = require('../models/ModelPayment');
const { containsBadWords } = require('../utils/badWords');

const COMPLETED_DELIVERY = ['DELIVERED', 'DELIVERED_AFTER_RETRY'];

class ControllerReview {
    async createReview(req, res) {
        try {
            const { orderId, productIndex, productId, nameProduct, img, rating, content, tags } = req.body;

            if (!orderId || !rating) {
                return res.status(400).json({
                    message: 'Thiếu dữ liệu đánh giá',
                });
            }

            const order = await ModelPayment.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
            }

            const userId = String(req.user?.id || '');
            const email = req.user?.email || '';
            const ownsOrder =
                (order.userId && String(order.userId) === userId) ||
                (order.user && order.user === email) ||
                (order.email && order.email === email);

            if (!ownsOrder) {
                return res.status(403).json({ message: 'Bạn chỉ có thể đánh giá đơn của mình' });
            }

            const delivered =
                order.status === 'completed' ||
                COMPLETED_DELIVERY.includes(order.deliveryStatus);

            if (!delivered) {
                return res.status(400).json({
                    message: 'Chỉ đánh giá được đơn đã giao thành công',
                });
            }

            const products = Array.isArray(order.products) ? order.products : [];
            const idx = Number(productIndex || 0);
            const line = products[idx];
            if (!line) {
                return res.status(400).json({ message: 'Sản phẩm không thuộc đơn hàng này' });
            }

            if (productId && line.productId && String(line.productId) !== String(productId)) {
                return res.status(400).json({ message: 'Sản phẩm không khớp với đơn hàng' });
            }

            if (
                nameProduct &&
                line.nameProduct &&
                String(nameProduct).trim() !== String(line.nameProduct).trim()
            ) {
                return res.status(400).json({ message: 'Tên sản phẩm không khớp với đơn hàng' });
            }

            const existedReview = await modelReview.findOne({
                orderId,
                productIndex: idx,
                userId: req.user?.id,
            });

            if (existedReview) {
                return res.status(400).json({
                    message: 'Sản phẩm này đã được đánh giá',
                });
            }

            if (containsBadWords(content)) {
                return res.status(400).json({
                    message: 'Nội dung chứa từ ngữ không phù hợp',
                });
            }

            const images = req.files?.map((file) => file.filename) || [];

            const review = await modelReview.create({
                orderId,
                productIndex: idx,
                productId: line.productId || productId || null,
                nameProduct: line.nameProduct || nameProduct,
                img: line.img || img || '',
                rating,
                content,
                tags: tags ? JSON.parse(tags) : [],
                images,

                userId: req.user?.id,
                avatar: req.user?.avatar || req.user?.img || '',
                username: req.user?.fullname || req.user?.username || '',
                email: req.user?.email || '',
            });

            return res.status(201).json({
                message: 'Gửi đánh giá thành công',
                review,
            });
        } catch (error) {
            console.log(error);

            return res.status(500).json({
                message: 'Lỗi gửi đánh giá',
            });
        }
    }

    async getMyReviews(req, res) {
        try {
            const reviews = await modelReview
                .find({
                    userId: req.user?.id,
                })
                .select('orderId productIndex productId nameProduct')
                .sort({ createdAt: -1 });

            return res.status(200).json(reviews);
        } catch (error) {
            console.log(error);

            return res.status(500).json({
                message: 'Lỗi lấy đánh giá của tôi',
            });
        }
    }

    async getReviewsByProduct(req, res) {
        try {
            const { productId } = req.params;
            const { nameProduct } = req.query;

            const filter = {
                $or: [{ productId }, { nameProduct }],
            };

            const reviews = await modelReview.find(filter).sort({ createdAt: -1 });

            return res.status(200).json(reviews);
        } catch (error) {
            console.log(error);

            return res.status(500).json({
                message: 'Lỗi lấy đánh giá',
            });
        }
    }

    async updateReview(req, res) {
        try {
            const { id } = req.params;
            const { rating, content, tags } = req.body;

            const review = await modelReview.findById(id);

            if (!review) {
                return res.status(404).json({
                    message: 'Không tìm thấy đánh giá',
                });
            }

            const isOwner = String(review.userId) === String(req.user?.id);
            const isAdmin = req.user?.isAdmin === true;

            if (!isOwner && !isAdmin) {
                return res.status(403).json({
                    message: 'Bạn không có quyền sửa đánh giá này',
                });
            }

            if (!rating || Number(rating) < 1 || Number(rating) > 5) {
                return res.status(400).json({
                    message: 'Số sao không hợp lệ',
                });
            }

            if (containsBadWords(content)) {
                return res.status(400).json({
                    message: 'Nội dung chứa từ ngữ không phù hợp',
                });
            }

            review.rating = Number(rating);
            review.content = content || '';
            review.tags = Array.isArray(tags) ? tags : [];

            if (req.files?.length > 0) {
                review.images = req.files.map((file) => file.filename);
            }

            await review.save();

            return res.status(200).json({
                message: 'Cập nhật đánh giá thành công',
                review,
            });
        } catch (error) {
            console.log(error);

            return res.status(500).json({
                message: 'Lỗi cập nhật đánh giá',
            });
        }
    }

    async deleteReview(req, res) {
        try {
            const { id } = req.params;

            const review = await modelReview.findById(id);

            if (!review) {
                return res.status(404).json({
                    message: 'Không tìm thấy đánh giá',
                });
            }

            const isOwner = String(review.userId) === String(req.user?.id);
            const isAdmin = req.user?.isAdmin === true;

            if (!isOwner && !isAdmin) {
                return res.status(403).json({
                    message: 'Bạn không có quyền xóa đánh giá này',
                });
            }

            await modelReview.findByIdAndDelete(id);

            return res.status(200).json({
                message: 'Xóa đánh giá thành công',
            });
        } catch (error) {
            console.log(error);

            return res.status(500).json({
                message: 'Lỗi xóa đánh giá',
            });
        }
    }
}

module.exports = new ControllerReview();
