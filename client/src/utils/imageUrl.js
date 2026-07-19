const SERVER_URL = process.env.REACT_APP_SERVER || 'http://localhost:5001';
const UPLOAD_URL = process.env.REACT_APP_IMG || `${SERVER_URL}/uploads`;

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');

export const getUploadUrl = (path) => {
    if (Array.isArray(path)) {
        return getUploadUrl(path.find(Boolean));
    }

    const value = String(path || '').trim().replace(/\\/g, '/');

    if (!value) return '';
    if (/^(https?:|data:|blob:)/i.test(value)) return value;
    if (value.startsWith('/uploads/')) return `${trimTrailingSlash(SERVER_URL)}${value}`;
    if (value.startsWith('uploads/')) return `${trimTrailingSlash(SERVER_URL)}/${value}`;

    return `${trimTrailingSlash(UPLOAD_URL)}/${value.replace(/^\/+/, '')}`;
};

export const getFirstUploadUrl = (paths) => {
    if (Array.isArray(paths)) return getUploadUrl(paths.find(Boolean));
    return getUploadUrl(paths);
};
