import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import request from '../Config/api';
import { canUseCustomerAsk } from '../utils/canUseCustomerAsk';

function ProtectedAskerRoute({ children }) {
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const checkAccess = async () => {
            try {
                const res = await request.get('/api/auth');
                const user = res?.data?.user || res?.data || {};
                const canAsk = canUseCustomerAsk(user);

                if (isMounted) setAllowed(canAsk);
            } catch (error) {
                if (isMounted) setAllowed(false);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        checkAccess();

        return () => {
            isMounted = false;
        };
    }, []);

    if (loading) {
        return <div style={{ padding: '20px' }}>Đang kiểm tra quyền truy cập...</div>;
    }

    if (!allowed) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedAskerRoute;
