import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="loading-center" style={{ minHeight: '100vh' }}>
                <div className="spinner" />
                <p className="text-muted">Loading...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (roles && !roles.includes(user.role)) {
        // Redirect to the user's own dashboard
        const dashMap = { participant: '/dashboard', organizer: '/organizer/dashboard', admin: '/admin/dashboard' };
        return <Navigate to={dashMap[user.role] || '/login'} replace />;
    }

    return children;
};

export default ProtectedRoute;
