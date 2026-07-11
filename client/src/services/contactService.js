import request from '../Config/api';

export const submitContactRequest = async (payload) => {
    const res = await request.post('/api/contact', payload);
    return res.data;
};
