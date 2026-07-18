import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import request from '../Config/api';

function ProtectedShipperRoute({ children }) {
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const checkShipper = async () => {
            try {
                const res = await request.get('/api/me');
                const user = res.data?.user || res.data || {};
                const ok = user?.role === 'shipper';
                if (isMounted) setAllowed(ok);
            } catch (error) {
                if (isMounted) setAllowed(false);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        checkShipper();

        return () => {
            isMounted = false;
        };
    }, []);

    if (loading) {
        return <div style={{ padding: '20px' }}>Đang kiểm tra quyền Shipper...</div>;
    }

    if (!allowed) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedShipperRoute;
