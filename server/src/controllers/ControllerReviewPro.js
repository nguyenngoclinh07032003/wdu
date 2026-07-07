const modelReview = require('../models/ModelReview');
const { containsBadWords } = require('../utils/badWords');

class ControllerReview {
    async createReview(req, res) {
        try {
            const { orderId, productIndex, productId, nameProduct, img, rating, content, tags } = req.body;

            if (!orderId || !nameProduct || !rating) {
                return res.status(400).json({
                    message: 'Thiếu dữ liệu đánh giá',
                });
            }

            const existedReview = await modelReview.findOne({
                orderId,
                productIndex: Number(productIndex || 0),
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
                productIndex: Number(productIndex || 0),
                productId: productId || null,
                nameProduct,
                img: img || '',
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
