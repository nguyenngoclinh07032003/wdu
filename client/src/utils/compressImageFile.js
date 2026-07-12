const compressImageFile = (file, maxWidth = 1280, quality = 0.82) =>
    new Promise((resolve, reject) => {
        if (!file?.type?.startsWith('image/')) {
            reject(new Error('File không phải hình ảnh'));
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            const img = new Image();

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Không thể xử lý hình ảnh'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };

            img.onerror = () => reject(new Error('Không thể đọc hình ảnh'));
            img.src = reader.result;
        };

        reader.onerror = () => reject(new Error('Không thể đọc file'));
        reader.readAsDataURL(file);
    });

export default compressImageFile;
