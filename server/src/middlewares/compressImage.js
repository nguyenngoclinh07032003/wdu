const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const compressImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return next();
        }

        const filePath = req.file.path;
        const ext = path.extname(filePath);
        const fileName = path.basename(filePath, ext);

        const compressedPath = path.join(path.dirname(filePath), `${fileName}-compressed${ext}`);

        await sharp(filePath)
            .resize({
                width: 1200,
                withoutEnlargement: true,
            })
            .jpeg({ quality: 80 })
            .toFile(compressedPath);

        fs.unlinkSync(filePath);

        req.file.filename = `${fileName}-compressed${ext}`;
        req.file.path = compressedPath;

        next();
    } catch (error) {
        console.error('Compress image error:', error);
        next();
    }
};

module.exports = compressImage;
