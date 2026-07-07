import request from '../Config/api';

export const getShipperStats = () => {
    return request.get('/api/shipper/stats');
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

export const updateDeliveryStatus = (orderId, data) => {
    return request.patch(`/api/shipper/orders/${orderId}/status`, data);
};

export const getMe = () => {
    return request.get('/api/me');
};
