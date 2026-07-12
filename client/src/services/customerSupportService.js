import request from '../Config/api';

export const fetchMySupportRequests = async () => {
    const res = await request.get('/api/support-requests/my');
    return res.data;
};

export const fetchMySupportRequestDetail = async (id) => {
    const res = await request.get(`/api/support-requests/my/${id}`);
    return res.data;
};

export const fetchCustomerNotifications = async () => {
    const res = await request.get('/api/customer-notifications');
    return res.data;
};

export const markCustomerNotificationRead = async (id) => {
    const res = await request.patch(`/api/customer-notifications/${id}/read`);
    return res.data;
};

export const markAllCustomerNotificationsRead = async () => {
    const res = await request.patch('/api/customer-notifications/read-all');
    return res.data;
};
