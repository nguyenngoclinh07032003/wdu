const express = require('express');
const router = express.Router();

const controller = require('../controllers/ControllerProduct');
const ControllerJWT = require('../jwt/ControllerJWT');

const sharp = require('sharp');
const multer = require('multer');
const path = require('path');
const fsSync = require('fs');
const fs = require('fs/promises');

const uploadDir = path.resolve(__dirname, '../uploads');

if (!fsSync.existsSync(uploadDir)) {
    fsSync.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, uploadDir);
    },

    filename(req, file, cb) {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});

const fileFilter = (req, file, cb) => {
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

    if (imageTypes.includes(file.mimetype) || videoTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ cho phép upload ảnh hoặc video'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024,
    },
});

const compressImage = async (req, res, next) => {
    const imageFiles = req.files?.fileImg || [];

    if (imageFiles.length === 0) {
        return next();
    }

    try {
        for (const file of imageFiles) {
            const oldPath = path.join(uploadDir, file.filename);
            const newFilename = file.filename.replace(/\.[^.]*$/, '.webp');
            const newPath = path.join(uploadDir, newFilename);

            await sharp(oldPath)
                .resize(800, 800, {
                    fit: 'inside',
                    withoutEnlargement: true,
                })
                .webp({
                    quality: 80,
                })
                .toFile(newPath);

            if (oldPath !== newPath) {
                await fs.unlink(oldPath).catch(() => {});
            }

            file.filename = newFilename;
        }

        return next();
    } catch (error) {
        console.error('Lỗi nén ảnh:', error);

        return res.status(500).json({
            message: 'Lỗi nén ảnh sản phẩm',
            error: error.message,
        });
    }
};

router.post(
    '/api/addproduct',
    ControllerJWT.verifyTokenStaffOrAdmin,
    upload.fields([
        {
            name: 'fileImg',
            maxCount: 10,
        },
        {
            name: 'fileVideo',
            maxCount: 5,
        },
    ]),
    compressImage,
    controller.AddProducts,
);
router.post(
    '/api/editpro',
    ControllerJWT.verifyTokenStaffOrAdmin,
    upload.fields([
        { name: 'fileImg', maxCount: 10 },
        { name: 'fileVideo', maxCount: 5 },
    ]),
    compressImage,
    controller.EditPro,
);
router.get('/api/products', controller.GetProducts);
router.get('/api/product', controller.GetOneProducts);
router.get('/api/search', controller.SearchProduct);
router.delete('/api/deleteproduct', ControllerJWT.verifyTokenStaffOrAdmin, controller.deletePro);
router.post('/api/editorder', ControllerJWT.verifyTokenStaffOrAdmin, controller.EditOrder);
router.get('/api/similarproduct', controller.similarProduct);
router.get('/api/combos', controller.GetComboProducts);

module.exports = router;
