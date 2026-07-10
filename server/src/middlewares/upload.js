const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = 'uploads';

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },

    filename(req, file, cb) {
        const ext = path.extname(file.originalname);

        const fileName = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

        cb(null, fileName);
    },
});

const fileFilter = (req, file, cb) => {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];

    if (imageTypes.includes(file.mimetype) || videoTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload ảnh (JPG, PNG, WEBP) hoặc video (MP4, WEBM, MOV)'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,

    limits: {
        // 100MB
        fileSize: 100 * 1024 * 1024,
    },
});

module.exports = upload;
