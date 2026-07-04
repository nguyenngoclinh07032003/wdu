const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const ControllerReview = require('../controllers/ControllerReviewPro');
const ControllerJWT = require('../jwt/ControllerJWT');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads'));
    },

    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const filename = `review-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, filename);
    },
});

const upload = multer({ storage });

router.post('/api/reviews', ControllerJWT.verifyToken, upload.array('images', 5), ControllerReview.createReview);
router.get('/api/reviews/product/:productId', ControllerReview.getReviewsByProduct);
router.get('/api/my-reviews', ControllerJWT.verifyToken, ControllerReview.getMyReviews);
router.put('/api/reviews/:id', ControllerJWT.verifyToken, upload.array('images', 5), ControllerReview.updateReview);
router.delete('/api/reviews/:id', ControllerJWT.verifyToken, ControllerReview.deleteReview);
module.exports = router;
