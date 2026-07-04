import request from '../../Config/api';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddToCartProduct = async (props, quantity, selectSize) => {
    const token = document.cookie;

    if (!token) {
        return toast.error('Bạn Cần Đăng Nhập Trước !!!');
    }
    try {
        const { img, name, price, type } = props;

        const res = await request.post('/api/addtocart', {
            nameProduct: name,
            imgProduct: img[0],
            priceProduct: price,
            quantityProduct: quantity,
            size: selectSize,
            sumprice: price * quantity,
            type: type,
        });
        return res;
    } catch (error) {
        console.log(error);
    }
};

export default AddToCartProduct;
