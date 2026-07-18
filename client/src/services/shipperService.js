import request from '../Config/api';

export const getShipperStats = () => {
    return request.get('/api/shipper/stats');
};

export const getShipperOverview = () => {
    return request.get('/api/shipper/overview');
};

export const getShipperOrders = () => {
    return request.get('/api/shipper/orders');
};

export const getShipperHistory = () => {
    return request.get('/api/shipper/history');
};

export const startDelivery = (orderId) => {
    return request.patch(`/api/shipper/orders/${orderId}/start`);
};

/** Legacy wrapper */
export const updateDeliveryStatus = (orderId, data) => {
    return request.patch(`/api/shipper/orders/${orderId}/status`, data);
};

/** New delivery result API (multipart supported) */
export const putOrderDeliveryStatus = (orderId, payload) => {
    if (payload instanceof FormData) {
        return request.put(`/api/orders/${orderId}/delivery-status`, payload, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    }
    return request.put(`/api/orders/${orderId}/delivery-status`, payload);
};

export const getOrderDelivery = (orderId) => {
    return request.get(`/api/orders/${orderId}/delivery`);
};

export const getOrderDeliveryHistory = (orderId) => {
    return request.get(`/api/orders/${orderId}/delivery-history`);
};

export const confirmOrderReturn = (orderId, data = {}) => {
    return request.patch(`/api/orders/${orderId}/confirm-return`, data);
};

export const getFailureReasons = () => {
    return request.get('/api/orders/delivery/failure-reasons');
};

export const getMe = () => {
    return request.get('/api/me');
};
