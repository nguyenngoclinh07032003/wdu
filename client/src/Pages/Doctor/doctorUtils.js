export const getCertificateUrl = (path) => {
    if (!path) return '';
    // File chứng chỉ chỉ xem qua API có JWT (cookie)
    const rel = path.startsWith('http://') || path.startsWith('https://')
        ? path
        : path.startsWith('/uploads/')
          ? path
          : `/uploads/${path}`;
    const SERVER_URL = process.env.REACT_APP_SERVER || 'http://localhost:5001';
    return `${SERVER_URL}/api/doctor/certificate-file?path=${encodeURIComponent(rel)}`;
};

export const STATUS_LABELS = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Bị từ chối',
};

export const isCertificateImage = (fileNameOrUrl = '') => {
    return /\.(jpe?g|png|webp|gif)$/i.test(String(fileNameOrUrl));
};
