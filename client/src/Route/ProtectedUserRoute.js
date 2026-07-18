import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import request from '../Config/api';

function ProtectedUserRoute({ children }) {
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const checkAuth = async () => {
            try {
                await request.get('/api/auth');
                if (isMounted) setAllowed(true);
            } catch (error) {
                if (isMounted) setAllowed(false);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        checkAuth();

        return () => {
            isMounted = false;
        };
    }, []);

    if (loading) {
        return <div style={{ padding: '20px' }}>Đang kiểm tra đăng nhập...</div>;
    }

    if (!allowed) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedUserRoute;
