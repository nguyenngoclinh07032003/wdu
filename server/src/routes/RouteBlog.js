const express = require('express');
const router = express.Router();

const upload = require('../middlewares/upload');
const compressImage = require('../middlewares/compressImage');

const ControllerBlog = require('../controllers/ControllerBlog');
const ControllerBlogAdmin = require('../controllers/ControllerAdminBlog');

// Admin routes
router.post('/api/admin/blogs', upload.single('thumbnail'), compressImage, ControllerBlogAdmin.createBlog);
router.patch('/api/admin/blogs/:id', upload.single('thumbnail'), compressImage, ControllerBlogAdmin.updateBlog);

router.get('/api/admin/blogs', ControllerBlogAdmin.getAllBlogsAdmin);
router.patch('/api/admin/blogs/:id/soft-delete', ControllerBlogAdmin.softDeleteBlog);
router.patch('/api/admin/blogs/:id/restore', ControllerBlogAdmin.restoreBlog);
router.delete('/api/admin/blogs/:id/force-delete', ControllerBlogAdmin.forceDeleteBlog);
// router.delete('/api/admin/blogs/empty-trash', ControllerBlogAdmin.emptyTrash);

// Public routes
router.get('/api/blogs/featured', ControllerBlog.getFeaturedBlog);
router.get('/api/blogs/popular', ControllerBlog.getPopularBlogs);
router.get('/api/blogs/:slug', ControllerBlog.getBlogDetail);
router.get('/api/blogs', ControllerBlog.getBlogs);
router.get('/blogs/featured', ControllerBlog.getFeaturedBlog);

module.exports = router;
