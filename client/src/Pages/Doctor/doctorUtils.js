const SERVER_URL = process.env.REACT_APP_SERVER || 'http://localhost:5001';

export const getCertificateUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('/uploads/')) return `${SERVER_URL}${path}`;
    return `${SERVER_URL}/uploads/${path}`;
};

export const STATUS_LABELS = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Bị từ chối',
};

export const isCertificateImage = (fileNameOrUrl = '') => {
    return /\.(jpe?g|png|webp|gif)$/i.test(String(fileNameOrUrl));
};
