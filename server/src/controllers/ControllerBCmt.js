const sanitizeHtml = require('sanitize-html');

const ModelBlog = require('../models/ModelBlog');
const ModelBlogComment = require('../models/ModelBlogComment');
const { containsBadWords } = require('../utils/badWords');

class ControllerBlogComment {
    async getComments(req, res) {
        try {
            const { slug } = req.params;

            const blog = await ModelBlog.findOne({ slug });

            if (!blog) {
                return res.status(404).json({
                    message: 'Không tìm thấy bài viết',
                });
            }

            const comments = await ModelBlogComment.find({
                blogId: blog._id,
                isDeleted: false,
            })
                .populate('userId', 'fullname email avatar')
                .sort({ createdAt: -1 });

            return res.status(200).json({
                comments,
            });
        } catch (error) {
            console.log('Lỗi lấy bình luận:', error);

            return res.status(500).json({
                message: 'Lỗi server khi lấy bình luận',
            });
        }
    }

    async createComment(req, res) {
        try {
            const { slug } = req.params;
            const { content, parentCommentId } = req.body;

            const userId = req.user?.id || req.user?._id;

            if (!userId) {
                return res.status(401).json({
                    message: 'Vui lòng đăng nhập để bình luận',
                });
            }

            if (!content || !content.trim()) {
                return res.status(400).json({
                    message: 'Nội dung bình luận không được để trống',
                });
            }

            const cleanContent = sanitizeHtml(content, {
                allowedTags: [],
                allowedAttributes: {},
            }).trim();

            if (!cleanContent) {
                return res.status(400).json({
                    message: 'Nội dung bình luận không hợp lệ',
                });
            }

            if (cleanContent.length > 500) {
                return res.status(400).json({
                    message: 'Bình luận không được vượt quá 500 ký tự',
                });
            }

            if (containsBadWords(cleanContent)) {
                return res.status(400).json({
                    message: 'Bình luận chứa từ ngữ hoặc liên kết không phù hợp',
                });
            }

            const recentComment = await ModelBlogComment.findOne({
                userId,
            }).sort({ createdAt: -1 });

            if (recentComment) {
                const diff = Date.now() - new Date(recentComment.createdAt).getTime();

                if (diff < 10000) {
                    return res.status(429).json({
                        message: 'Bạn đang bình luận quá nhanh. Vui lòng thử lại sau vài giây',
                    });
                }
            }

            const blog = await ModelBlog.findOne({ slug });

            if (!blog) {
                return res.status(404).json({
                    message: 'Không tìm thấy bài viết',
                });
            }

            const comment = await ModelBlogComment.create({
                blogId: blog._id,
                userId,
                content: cleanContent,
                parentCommentId: parentCommentId || null,
            });

            const populatedComment = await ModelBlogComment.findById(comment._id).populate(
                'userId',
                'fullname email avatar',
            );

            return res.status(201).json({
                message: 'Bình luận thành công',
                comment: populatedComment,
            });
        } catch (error) {
            console.log('Lỗi tạo bình luận:', error);

            return res.status(500).json({
                message: 'Lỗi server khi gửi bình luận',
            });
        }
    }

    async deleteComment(req, res) {
        try {
            const { id } = req.params;

            const userId = req.user?.id || req.user?._id;
            const isAdmin = req.user?.isAdmin === true || req.user?.admin === true;

            if (!userId) {
                return res.status(401).json({
                    message: 'Vui lòng đăng nhập để xóa bình luận',
                });
            }

            const comment = await ModelBlogComment.findById(id);

            if (!comment || comment.isDeleted) {
                return res.status(404).json({
                    message: 'Không tìm thấy bình luận',
                });
            }

            const isOwner = String(comment.userId) === String(userId);

            if (!isOwner && !isAdmin) {
                return res.status(403).json({
                    message: 'Bạn không có quyền xóa bình luận của người khác',
                });
            }

            comment.isDeleted = true;
            await comment.save();

            if (!comment.parentCommentId) {
                await ModelBlogComment.updateMany(
                    {
                        parentCommentId: comment._id,
                    },
                    {
                        $set: {
                            isDeleted: true,
                        },
                    },
                );
            }

            return res.status(200).json({
                message: 'Xóa bình luận thành công',
            });
        } catch (error) {
            console.log('Lỗi xóa bình luận:', error);

            return res.status(500).json({
                message: 'Lỗi server khi xóa bình luận',
            });
        }
    }
    async updateComment(req, res) {
        try {
            const { id } = req.params;
            const { content } = req.body;

            const userId = req.user?.id || req.user?._id;

            if (!userId) {
                return res.status(401).json({
                    message: 'Vui lòng đăng nhập để sửa bình luận',
                });
            }

            const comment = await ModelBlogComment.findById(id);

            if (!comment || comment.isDeleted) {
                return res.status(404).json({
                    message: 'Không tìm thấy bình luận',
                });
            }

            const isOwner = String(comment.userId) === String(userId);

            if (!isOwner) {
                return res.status(403).json({
                    message: 'Bạn không có quyền sửa bình luận của người khác',
                });
            }

            if (!content || !content.trim()) {
                return res.status(400).json({
                    message: 'Nội dung bình luận không được để trống',
                });
            }

            const cleanContent = sanitizeHtml(content, {
                allowedTags: [],
                allowedAttributes: {},
            }).trim();

            if (!cleanContent) {
                return res.status(400).json({
                    message: 'Nội dung bình luận không hợp lệ',
                });
            }

            if (cleanContent.length > 500) {
                return res.status(400).json({
                    message: 'Bình luận không được vượt quá 500 ký tự',
                });
            }

            if (containsBadWords(cleanContent)) {
                return res.status(400).json({
                    message: 'Bình luận chứa từ ngữ hoặc liên kết không phù hợp',
                });
            }

            comment.content = cleanContent;
            comment.editedAt = new Date();

            await comment.save();

            const populatedComment = await ModelBlogComment.findById(comment._id).populate(
                'userId',
                'fullname email avatar',
            );

            return res.status(200).json({
                message: 'Sửa bình luận thành công',
                comment: populatedComment,
            });
        } catch (error) {
            console.log('Lỗi sửa bình luận:', error);

            return res.status(500).json({
                message: 'Lỗi server khi sửa bình luận',
            });
        }
    }
    async toggleLike(req, res) {
        try {
            const { id } = req.params;

            const userId = req.user?.id || req.user?._id;

            const comment = await ModelBlogComment.findById(id);

            if (!comment) {
                return res.status(404).json({
                    message: 'Không tìm thấy bình luận',
                });
            }

            const alreadyLiked = comment.likes.some((item) => String(item) === String(userId));

            if (alreadyLiked) {
                comment.likes = comment.likes.filter((item) => String(item) !== String(userId));
            } else {
                comment.likes.push(userId);

                comment.hearts = comment.hearts.filter((item) => String(item) !== String(userId));

                comment.dislikes = comment.dislikes.filter((item) => String(item) !== String(userId));
            }

            await comment.save();

            return res.status(200).json({
                likes: comment.likes.length,
                dislikes: comment.dislikes.length,
                hearts: comment.hearts.length,
            });
        } catch (error) {
            console.log(error);

            return res.status(500).json({
                message: 'Lỗi server',
            });
        }
    }
    async toggleHeart(req, res) {
        try {
            const { id } = req.params;

            const userId = req.user?.id || req.user?._id;

            const comment = await ModelBlogComment.findById(id);

            if (!comment) {
                return res.status(404).json({
                    message: 'Không tìm thấy bình luận',
                });
            }

            const alreadyHearted = comment.hearts.some((item) => String(item) === String(userId));

            if (alreadyHearted) {
                comment.hearts = comment.hearts.filter((item) => String(item) !== String(userId));
            } else {
                comment.hearts.push(userId);

                comment.likes = comment.likes.filter((item) => String(item) !== String(userId));

                comment.dislikes = comment.dislikes.filter((item) => String(item) !== String(userId));
            }

            await comment.save();

            return res.status(200).json({
                likes: comment.likes.length,
                dislikes: comment.dislikes.length,
                hearts: comment.hearts.length,
            });
        } catch (error) {
            console.log(error);

            return res.status(500).json({
                message: 'Lỗi server',
            });
        }
    }
    async toggleDislike(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user?.id || req.user?._id;

            const comment = await ModelBlogComment.findById(id);

            if (!comment) {
                return res.status(404).json({
                    message: 'Không tìm thấy bình luận',
                });
            }

            const alreadyDisliked = comment.dislikes.some((item) => String(item) === String(userId));

            if (alreadyDisliked) {
                comment.dislikes = comment.dislikes.filter((item) => String(item) !== String(userId));
            } else {
                comment.dislikes.push(userId);

                comment.likes = comment.likes.filter((item) => String(item) !== String(userId));
                comment.hearts = comment.hearts.filter((item) => String(item) !== String(userId));
            }

            await comment.save();

            return res.status(200).json({
                likes: comment.likes.length,
                hearts: comment.hearts.length,
                dislikes: comment.dislikes.length,
            });
        } catch (error) {
            console.log(error);

            return res.status(500).json({
                message: 'Lỗi server',
            });
        }
    }
}

module.exports = new ControllerBlogComment();
