import Context from './Context';
import { useEffect, useState } from 'react';
import cookies from 'js-cookie';
import { requestAuth, requestGetCart } from '../Config/api';

export function Provider({ children }) {
    const [dataUser, setDataUser] = useState({});
    const [dataCart, setDataCart] = useState([]);

    const getAuthUser = async () => {
        try {
            const res = await requestAuth();
            setDataUser(res || {});
        } catch (error) {
            console.log('getAuthUser error:', error?.response?.data || error.message);
            setDataUser({});
        }
    };

    const getCart = async () => {
        try {
            const res = await requestGetCart();
            setDataCart(res || []);
        } catch (error) {
            console.log('getCart error:', error?.response?.data || error.message);
            setDataCart([]);
        }
    };

    useEffect(() => {
        const token = cookies.get('logged');

        const fetchData = async () => {
            await Promise.all([getAuthUser(), getCart()]);
        };

        if (token === '1') {
            fetchData();
        }
    }, []);

    return <Context.Provider value={{ dataUser, dataCart, getCart }}>{children}</Context.Provider>;
}
