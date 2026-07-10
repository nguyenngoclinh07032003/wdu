import axios from 'axios';

const API_URL = process.env.REACT_APP_SERVER;

export const getReminders = async () => {
    const res = await axios.get(`${API_URL}/api/reminders`, {
        withCredentials: true,
    });
    return res.data;
};

export const createReminder = async (data) => {
    const res = await axios.post(`${API_URL}/api/reminders`, data, {
        withCredentials: true,
    });
    return res.data;
};

export const deleteReminder = async (id) => {
    const res = await axios.delete(`${API_URL}/api/reminders/${id}`, {
        withCredentials: true,
    });
    return res.data;
};

export const completeReminder = async (id) => {
    const res = await axios.post(
        `${API_URL}/api/reminders/${id}/complete`,
        {},
        {
            withCredentials: true,
        },
    );
    return res.data;
};
