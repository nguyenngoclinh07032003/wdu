const express = require('express');
const router = express.Router();

const ControllerBlogComment = require('../controllers/ControllerBCmt');
const { verifyToken } = require('../jwt/ControllerJWT');

router.get('/blogs/:slug/comments', ControllerBlogComment.getComments);

router.post('/blogs/:slug/comments', verifyToken, ControllerBlogComment.createComment);

router.delete('/blog-comments/:id', verifyToken, ControllerBlogComment.deleteComment);

router.patch('/blog-comments/:id', verifyToken, ControllerBlogComment.updateComment);

router.patch('/blog-comments/:id/like', verifyToken, ControllerBlogComment.toggleLike);

router.patch('/blog-comments/:id/heart', verifyToken, ControllerBlogComment.toggleHeart);

router.patch('/blog-comments/:id/dislike', verifyToken, ControllerBlogComment.toggleDislike);
module.exports = router;
