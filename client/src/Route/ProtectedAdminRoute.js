import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { requestAuth } from '../Config/api';

function ProtectedAdminRoute({ children }) {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const checkAdmin = async () => {
            try {
                const res = await requestAuth();

                if (!isMounted) return;

                if (res?.isAdmin === true || res?.user?.isAdmin === true) {
                    setIsAdmin(true);
                } else {
                    setIsAdmin(false);
                }
            } catch (error) {
                if (!isMounted) return;
                setIsAdmin(false);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        checkAdmin();

        return () => {
            isMounted = false;
        };
    }, []);

    if (loading) {
        return <div style={{ padding: '20px' }}>Đang kiểm tra quyền truy cập...</div>;
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedAdminRoute;
