import axios from 'axios';

const request = axios.create({
    baseURL: process.env.REACT_APP_SERVER,
    headers: {
        'X-Custom-Header': 'foobar',
    },
    withCredentials: true,
});

export const requestAuth = async () => {
    const res = await request.get('/api/auth');
    return res.data;
};

export const requestRefreshToken = async () => {
    const res = await request.get('/api/refresh-token');
    return res.data;
};

export const requestLogout = async () => {
    const res = await request.post('/api/logout');
    return res.data;
};

export const requestLoginGoogle = async (credential) => {
    const res = await request.post('/api/google-login', { credential });
    return res.data;
};

export const requestGetCart = async () => {
    const res = await request.get('/api/cart');
    return res.data;
};

export const requestAdmin = async () => {
    const res = await request.get('/api/admin');
    return res.data;
};

export const requestStaff = async () => {
    const res = await request.get('/api/staff');
    return res.data;
};

export const requestDoctor = async () => {
    const res = await request.get('/api/doctor');
    return res.data;
};

export const requestChat = async (data) => {
    const res = await request.post('/api/chatbot', data);
    return res.data;
};

export const requestUpdateInfoCart = async (data) => {
    const res = await request.post('/api/update-info-cart', data);
    return res.data;
};

export const requestUpdateQuantityCart = async (data) => {
    const res = await request.put('/api/update-quantity-cart', data);
    return res.data;
};

export const requestPaymentVNPAY = async (data) => {
    const res = await request.post('/api/paymentvnpay', data);
    return res.data;
};

export const requestPaymentsMomo = async (data) => {
    const res = await request.post('/api/payment', data);
    return res.data;
};

export const requestGetBlogs = async (params = {}) => {
    const res = await request.get('/api/blogs', { params });
    return res.data;
};

export const requestGetFeaturedBlogs = async () => {
    const res = await request.get('/api/blogs/featured');
    return res.data;
};

export const requestGetPopularBlogs = async () => {
    const res = await request.get('/api/blogs/popular');
    return res.data;
};

export const requestGetBlogDetail = async (slug) => {
    const res = await request.get(`/api/blogs/${slug}`);
    return res.data;
};

let isRefreshing = false;
let failedRequestsQueue = [];

const processQueue = (error = null) => {
    failedRequestsQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve();
        }
    });
    failedRequestsQueue = [];
};

const forceLogout = (message = '') => {
    try {
        localStorage.clear();
        sessionStorage.clear();

        if (message) {
            alert(message);
        }

        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Lỗi force logout:', error);
        window.location.href = '/login';
    }
};

request.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (!error.response) {
            return Promise.reject(error);
        }

        const status = error.response.status;
        const requestUrl = originalRequest?.url || '';
        const errorData = error.response.data || {};
        const errorCode = errorData.code || '';
        const errorMessage = errorData.message || '';

        const isRefreshRequest = requestUrl.includes('/api/refresh-token');
        const isLoginRequest = requestUrl.includes('/api/login');
        const isRegisterRequest = requestUrl.includes('/api/register');
        const isForgotPasswordRequest = requestUrl.includes('/api/forgotpassword');
        const isResetPasswordRequest = requestUrl.includes('/api/resetpassword');
        const isLogoutRequest = requestUrl.includes('/api/logout');

        const isAccountLocked =
            errorCode === 'ACCOUNT_LOCKED' ||
            errorMessage.toLowerCase().includes('tài khoản của bạn đã bị khóa') ||
            errorMessage.toLowerCase().includes('tài khoản admin đã bị khóa') ||
            errorMessage.toLowerCase().includes('bị khóa');

        // Nếu tài khoản bị khóa -> out luôn, không refresh token
        if (status === 401 && isAccountLocked) {
            processQueue(error);
            forceLogout('Tài khoản của bạn đã bị khóa');
            return Promise.reject(error);
        }

        if (
            status === 401 &&
            !originalRequest._retry &&
            !isRefreshRequest &&
            !isLoginRequest &&
            !isRegisterRequest &&
            !isForgotPasswordRequest &&
            !isResetPasswordRequest &&
            !isLogoutRequest
        ) {
            originalRequest._retry = true;

            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedRequestsQueue.push({
                        resolve: () => resolve(request(originalRequest)),
                        reject,
                    });
                });
            }

            isRefreshing = true;

            try {
                await requestRefreshToken();
                processQueue();
                return request(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError);

                const refreshStatus = refreshError?.response?.status;
                const refreshCode = refreshError?.response?.data?.code || '';
                const refreshMessage = refreshError?.response?.data?.message || '';

                const refreshLocked =
                    refreshCode === 'ACCOUNT_LOCKED' || refreshMessage.toLowerCase().includes('bị khóa');

                if (refreshStatus === 401 && refreshLocked) {
                    forceLogout('Tài khoản của bạn đã bị khóa');
                } else {
                    forceLogout('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
                }

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    },
);

export default request;
