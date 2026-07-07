const Blog = require('../models/ModelBlog');

class ControllerBlog {
    async getBlogs(req, res) {
        try {
            const blogs = await Blog.find({
                status: 'published',
                deleted: false,
            })
                .sort({ publishedAt: -1, createdAt: -1 })
                .select('title slug excerpt thumbnail category author publishedAt views readTime');

            return res.status(200).json({ blogs });
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi lấy danh sách blog',
                error: error.message,
            });
        }
    }

    async getBlogDetail(req, res) {
        try {
            const { slug } = req.params;

            const blog = await Blog.findOneAndUpdate(
                { slug, status: 'published', deleted: false },
                { $inc: { views: 1 } },
                { new: true },
            );

            if (!blog) {
                return res.status(404).json({ message: 'Không tìm thấy bài viết' });
            }

            return res.status(200).json(blog);
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi lấy chi tiết blog',
                error: error.message,
            });
        }
    }

    async getFeaturedBlog(req, res) {
        try {
            let blogs = await Blog.find({
                status: 'published',
                deleted: false,
                featured: true,
            })
                .sort({ publishedAt: -1, createdAt: -1 })
                .limit(5)
                .select('title slug excerpt thumbnail category author publishedAt views readTime');

            if (!blogs.length) {
                blogs = await Blog.find({
                    status: 'published',
                    deleted: false,
                })
                    .sort({ publishedAt: -1, createdAt: -1 })
                    .limit(1)
                    .select('title slug excerpt thumbnail category author publishedAt views readTime');
            }

            return res.status(200).json(blogs);
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi lấy blog nổi bật',
                error: error.message,
            });
        }
    }

    async getPopularBlogs(req, res) {
        try {
            const blogs = await Blog.find({
                status: 'published',
                deleted: false,
            })
                .sort({ views: -1, publishedAt: -1 })
                .limit(10)
                .select('title slug excerpt thumbnail category author publishedAt views');

            return res.status(200).json(blogs);
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi lấy blog phổ biến',
                error: error.message,
            });
        }
    }
    async getFeaturedBlog(req, res) {
        try {
            let blogs = await Blog.find({
                status: 'published',
                deleted: false,
                featured: true,
            })
                .sort({ publishedAt: -1, createdAt: -1 })
                .limit(3)
                .select('title slug excerpt thumbnail category author publishedAt views readTime featured');

            if (!blogs.length) {
                blogs = await Blog.find({
                    status: 'published',
                    deleted: false,
                })
                    .sort({ publishedAt: -1, createdAt: -1 })
                    .limit(3)
                    .select('title slug excerpt thumbnail category author publishedAt views readTime featured');
            }

            return res.status(200).json(blogs);
        } catch (error) {
            return res.status(500).json({
                message: 'Lỗi lấy blog nổi bật',
                error: error.message,
            });
        }
    }
}

module.exports = new ControllerBlog();
