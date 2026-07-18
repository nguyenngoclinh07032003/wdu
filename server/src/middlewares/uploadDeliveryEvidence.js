const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join('uploads', 'delivery-evidence');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },
    filename(req, file, cb) {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
        const fileName = `evidence-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, fileName);
    },
});

const fileFilter = (req, file, cb) => {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (imageTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload ảnh minh chứng (JPG, PNG, WEBP, GIF)'), false);
    }
};

const uploadDeliveryEvidence = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = uploadDeliveryEvidence;
