const Blog = require('../models/ModelBlog');
const slugify = require('slugify');

class ControllerBlogAdmin {
    async createBlog(req, res) {
        try {
            const {
                title,
                content,
                category,
                author,
                thumbnail,
                status,
                excerpt,
                tags,
                seoTitle,
                metaDescription,
                publishMode,
                scheduleDate,
                featured,
            } = req.body;

            if (!title || !content || !category) {
                return res.status(400).json({ message: 'Thiếu dữ liệu bắt buộc' });
            }

            const baseSlug = slugify(title, {
                lower: true,
                strict: true,
                locale: 'vi',
            });

            let slug = baseSlug;
            let count = 1;

            while (await Blog.findOne({ slug })) {
                slug = `${baseSlug}-${count++}`;
            }

            let parsedTags = [];
            if (tags) {
                if (Array.isArray(tags)) {
                    parsedTags = tags;
                } else if (typeof tags === 'string') {
                    try {
                        parsedTags = JSON.parse(tags);
                    } catch (error) {
                        parsedTags = tags
                            .split(',')
                            .map((tag) => tag.trim())
                            .filter(Boolean);
                    }
                }
            }

            const thumbnailUrl = req.file ? `/uploads/${req.file.filename}` : thumbnail || '';

            const finalStatus = status || 'draft';
            const finalPublishMode = publishMode || 'now';
            const finalScheduleDate = finalPublishMode === 'schedule' && scheduleDate ? new Date(scheduleDate) : null;

            const newBlog = await Blog.create({
                title: title.trim(),
                slug,
                content: content.trim(),
                category,
                author: author || 'Admin',
                thumbnail: thumbnailUrl,
                excerpt:
                    excerpt ||
                    content
                        .replace(/<[^>]+>/g, '')
                        .replace(/\s+/g, ' ')
                        .slice(0, 160),
                status: finalStatus,
                publishedAt: finalStatus === 'published' && finalPublishMode === 'now' ? new Date() : null,
                tags: parsedTags,
                seoTitle: seoTitle || '',
                metaDescription: metaDescription || '',
                publishMode: finalPublishMode,
                scheduleDate: finalScheduleDate,
                featured: featured === 'true' || featured === true,
            });

            return res.status(201).json({
                message: 'Tạo bài viết thành công',
                data: newBlog,
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi tạo bài viết',
                error: error.message,
            });
        }
    }

    async getAllBlogsAdmin(req, res) {
        try {
            const blogs = await Blog.find({}).sort({ createdAt: -1 });
            return res.status(200).json(blogs);
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi lấy danh sách blog',
                error: error.message,
            });
        }
    }

    async updateBlog(req, res) {
        try {
            const { id } = req.params;
            const updateData = { ...req.body };

            if (updateData.tags && typeof updateData.tags === 'string') {
                try {
                    updateData.tags = JSON.parse(updateData.tags);
                } catch (error) {
                    updateData.tags = updateData.tags
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean);
                }
            }

            if (typeof updateData.featured !== 'undefined') {
                updateData.featured = updateData.featured === 'true' || updateData.featured === true;
            }

            if (updateData.scheduleDate === '') {
                updateData.scheduleDate = null;
            }

            if (updateData.publishMode === 'now') {
                updateData.scheduleDate = null;
            }

            if (req.file) {
                updateData.thumbnail = `/uploads/${req.file.filename}`;
            } else if (updateData.thumbnail && updateData.thumbnail.startsWith('blob:')) {
                delete updateData.thumbnail;
            }

            if (updateData.title) {
                const currentBlog = await Blog.findById(id);

                if (!currentBlog) {
                    return res.status(404).json({
                        message: 'Không tìm thấy bài viết',
                    });
                }

                if (currentBlog.title !== updateData.title) {
                    const baseSlug = slugify(updateData.title, {
                        lower: true,
                        strict: true,
                        locale: 'vi',
                    });

                    let slug = baseSlug;
                    let count = 1;

                    while (await Blog.findOne({ slug, _id: { $ne: id } })) {
                        slug = `${baseSlug}-${count++}`;
                    }

                    updateData.slug = slug;
                }
            }

            if (!updateData.excerpt && updateData.content) {
                updateData.excerpt = updateData.content
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .slice(0, 160);
            }

            if (updateData.status === 'published') {
                const oldBlog = await Blog.findById(id);

                if (!oldBlog) {
                    return res.status(404).json({
                        message: 'Không tìm thấy bài viết',
                    });
                }

                const isPublishNow = updateData.publishMode
                    ? updateData.publishMode === 'now'
                    : oldBlog.publishMode === 'now';

                if (isPublishNow && !oldBlog.publishedAt) {
                    updateData.publishedAt = new Date();
                }
            }

            const updatedBlog = await Blog.findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true,
            });

            if (!updatedBlog) {
                return res.status(404).json({
                    message: 'Không tìm thấy bài viết',
                });
            }

            return res.status(200).json({
                message: 'Cập nhật bài viết thành công',
                data: updatedBlog,
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Cập nhật bài viết thất bại',
                error: error.message,
            });
        }
    }

    async softDeleteBlog(req, res) {
        try {
            await Blog.findByIdAndUpdate(req.params.id, { status: 'deleted' });
            return res.status(200).json({ message: 'Đã chuyển vào thùng rác' });
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi xóa bài viết',
                error: error.message,
            });
        }
    }

    async restoreBlog(req, res) {
        try {
            await Blog.findByIdAndUpdate(req.params.id, { status: 'draft' });
            return res.status(200).json({ message: 'Đã khôi phục bài viết' });
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi khôi phục bài viết',
                error: error.message,
            });
        }
    }

    async forceDeleteBlog(req, res) {
        try {
            const blog = await Blog.findById(req.params.id);

            if (!blog) {
                return res.status(404).json({ message: 'Không tìm thấy bài viết' });
            }

            await Blog.findByIdAndDelete(req.params.id);

            return res.status(200).json({
                message: 'Đã xóa vĩnh viễn bài viết',
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi xóa vĩnh viễn',
                error: error.message,
            });
        }
    }

    async emptyTrash(req, res) {
        try {
            const result = await Blog.deleteMany({ status: 'deleted' });

            return res.status(200).json({
                message: 'Đã xóa toàn bộ thùng rác',
                deletedCount: result.deletedCount,
            });
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi khi dọn thùng rác',
                error: error.message,
            });
        }
    }
}

module.exports = new ControllerBlogAdmin();
