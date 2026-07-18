const express = require('express');
const router = express.Router();

const upload = require('../middlewares/upload');
const compressImage = require('../middlewares/compressImage');

const ControllerBlog = require('../controllers/ControllerBlog');
const ControllerBlogAdmin = require('../controllers/ControllerAdminBlog');
const ControllerJWT = require('../jwt/ControllerJWT');

// Admin routes (require admin)
router.post(
    '/api/admin/blogs',
    ControllerJWT.verifyTokenAdmin,
    upload.single('thumbnail'),
    compressImage,
    ControllerBlogAdmin.createBlog,
);
router.patch(
    '/api/admin/blogs/:id',
    ControllerJWT.verifyTokenAdmin,
    upload.single('thumbnail'),
    compressImage,
    ControllerBlogAdmin.updateBlog,
);

router.get('/api/admin/blogs', ControllerJWT.verifyTokenAdmin, ControllerBlogAdmin.getAllBlogsAdmin);
router.patch(
    '/api/admin/blogs/:id/soft-delete',
    ControllerJWT.verifyTokenAdmin,
    ControllerBlogAdmin.softDeleteBlog,
);
router.patch('/api/admin/blogs/:id/restore', ControllerJWT.verifyTokenAdmin, ControllerBlogAdmin.restoreBlog);
router.delete(
    '/api/admin/blogs/:id/force-delete',
    ControllerJWT.verifyTokenAdmin,
    ControllerBlogAdmin.forceDeleteBlog,
);

// Public routes
router.get('/api/blogs/featured', ControllerBlog.getFeaturedBlog);
router.get('/api/blogs/popular', ControllerBlog.getPopularBlogs);
router.get('/api/blogs/:slug', ControllerBlog.getBlogDetail);
router.get('/api/blogs', ControllerBlog.getBlogs);
router.get('/blogs/featured', ControllerBlog.getFeaturedBlog);

module.exports = router;
