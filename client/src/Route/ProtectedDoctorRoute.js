import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { requestDoctor } from '../Config/api';

function ProtectedDoctorRoute({ children }) {
    const [loading, setLoading] = useState(true);
    const [allowed, setAllowed] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const checkDoctor = async () => {
            try {
                await requestDoctor();
                if (isMounted) setAllowed(true);
            } catch (error) {
                if (isMounted) setAllowed(false);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        checkDoctor();

        return () => {
            isMounted = false;
        };
    }, []);

    if (loading) {
        return <div style={{ padding: '20px' }}>Đang kiểm tra quyền Bác sĩ...</div>;
    }

    if (!allowed) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedDoctorRoute;
