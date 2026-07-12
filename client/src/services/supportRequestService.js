import request from '../Config/api';

export const submitContactRequest = async (payload) => {
    const res = await request.post('/api/contact', payload);
    return res.data;
};

export const fetchSupportRequests = async (params = {}) => {
    const res = await request.get('/api/support-requests', { params });
    return res.data;
};

export const fetchSupportRequestPendingCount = async () => {
    const res = await request.get('/api/support-requests/pending-count');
    return res.data;
};

export const fetchSupportRequestDetail = async (id) => {
    const res = await request.get(`/api/support-requests/${id}`);
    return res.data;
};

export const fetchSupportStaffUsers = async () => {
    const res = await request.get('/api/support-requests/staff-users');
    return res.data;
};

export const acceptSupportRequest = async (id) => {
    const res = await request.put(`/api/support-requests/${id}/accept`);
    return res.data;
};

export const assignSupportRequest = async (id, staffId) => {
    const res = await request.put(`/api/support-requests/${id}/assign`, { staffId });
    return res.data;
};

export const updateSupportRequestStatus = async (id, payload) => {
    const res = await request.put(`/api/support-requests/${id}/status`, payload);
    return res.data;
};

export const addSupportRequestNote = async (id, note) => {
    const res = await request.put(`/api/support-requests/${id}/note`, { note });
    return res.data;
};

export const addSupportRequestReply = async (id, reply) => {
    const res = await request.put(`/api/support-requests/${id}/reply`, { reply });
    return res.data;
};
