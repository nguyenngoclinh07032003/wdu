import { useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import request from '../Config/api';

function VerifyOtp() {
    const [otp, setOtp] = useState('');
    const navigate = useNavigate();

    const email = localStorage.getItem('register_email');

    const handleVerifyOtp = async () => {
        try {
            const res = await request.post('/api/register/verify-otp', {
                email,
                otp,
            });

            toast.success(res.data.message);
            localStorage.removeItem('register_email');

            setTimeout(() => {
                navigate('/login');
            }, 1500);
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Xác thực OTP thất bại');
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '40px auto' }}>
            <ToastContainer />
            <h2>Nhập mã OTP</h2>
            <p>Vui lòng nhập mã OTP đã được gửi về email: {email}</p>

            <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Nhập OTP"
                style={{ width: '100%', height: '40px', marginBottom: '12px', padding: '0 12px' }}
            />

            <button onClick={handleVerifyOtp} style={{ width: '100%', height: '40px' }}>
                Xác nhận OTP
            </button>
        </div>
    );
}

export default VerifyOtp;
