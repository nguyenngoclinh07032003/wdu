import request from '../Config/api';

const SHIPPER_API = {
    me: '/api/me',
    stats: '/api/shipper/stats',
    orders: '/api/shipper/orders',
    history: '/api/shipper/history',
};

const orderActionUrl = (orderId, action) => {
    return `${SHIPPER_API.orders}/${orderId}/${action}`;
};

export const getShipperStats = () => {
    return request.get(SHIPPER_API.stats);
};

export const getShipperOrders = () => {
    return request.get(SHIPPER_API.orders);
};

export const getShipperHistory = () => {
    return request.get(SHIPPER_API.history);
};

export const startDelivery = (orderId) => {
    return request.patch(orderActionUrl(orderId, 'start'));
};

export const updateDeliveryStatus = (orderId, data) => {
    return request.patch(orderActionUrl(orderId, 'status'), data);
};

export const getMe = () => {
    return request.get(SHIPPER_API.me);
};
