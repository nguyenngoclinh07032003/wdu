import axios from 'axios';

const SERVER_URL = process.env.REACT_APP_SERVER || 'http://localhost:5001';

const API_URL = `${SERVER_URL}/api/addresses`;

const axiosConfig = {
    withCredentials: true,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
};

export const CHECKOUT_ADDRESS_KEY = 'checkoutAddressId';

export const setCheckoutAddressId = (id) => {
    if (id) {
        sessionStorage.setItem(CHECKOUT_ADDRESS_KEY, String(id));
    }
};

export const getCheckoutAddressId = () => sessionStorage.getItem(CHECKOUT_ADDRESS_KEY);

export const pickCheckoutAddress = (addresses, preferredId = null) => {
    const list = Array.isArray(addresses) ? addresses : [];
    if (!list.length) return null;

    if (preferredId) {
        const preferred = list.find((item) => String(item._id || item.id) === String(preferredId));
        if (preferred) return preferred;
    }

    return list.find((item) => item.isDefault) || list[0];
};

export const formatAddressText = (item) => {
    if (!item) return '';

    return [item.detail, item.ward, item.district, item.province].filter(Boolean).join(', ');
};

// GET ALL ADDRESSES
export const getAddresses = async () => {
    try {
        const res = await axios.get(API_URL, axiosConfig);
        return Array.isArray(res.data) ? res.data : [];
    } catch (error) {
        console.log('getAddresses error:', error);
        throw error;
    }
};

// CREATE ADDRESS
export const createAddress = async (data) => {
    try {
        const payload = {
            fullName: data.fullName || '',
            phone: data.phone || '',
            province: data.province || '',
            district: data.district || '',
            ward: data.ward || '',
            detail: data.detail || '',

            // GOOGLE MAP
            lat: data.lat || null,
            lng: data.lng || null,
            mapAddress: data.mapAddress || '',

            isDefault: !!data.isDefault,
        };

        const res = await axios.post(API_URL, payload, axiosConfig);

        return res.data;
    } catch (error) {
        console.log('createAddress error:', error);
        throw error;
    }
};

// UPDATE ADDRESS
export const updateAddress = async (id, data) => {
    try {
        const payload = {
            fullName: data.fullName || '',
            phone: data.phone || '',
            province: data.province || '',
            district: data.district || '',
            ward: data.ward || '',
            detail: data.detail || '',

            // GOOGLE MAP
            lat: data.lat || null,
            lng: data.lng || null,
            mapAddress: data.mapAddress || '',

            isDefault: !!data.isDefault,
        };

        const res = await axios.put(`${API_URL}/${id}`, payload, axiosConfig);

        return res.data;
    } catch (error) {
        console.log('updateAddress error:', error);
        throw error;
    }
};

// DELETE ADDRESS
export const deleteAddress = async (id) => {
    try {
        const res = await axios.delete(`${API_URL}/${id}`, axiosConfig);
        return res.data;
    } catch (error) {
        console.log('deleteAddress error:', error);
        throw error;
    }
};

// SET DEFAULT ADDRESS
export const setDefaultAddress = async (id) => {
    try {
        const res = await axios.patch(
            `${API_URL}/${id}/default`,
            {},
            {
                withCredentials: true,
                timeout: 15000,
            },
        );

        return res.data;
    } catch (error) {
        console.log('setDefaultAddress error:', error);
        throw error;
    }
};
