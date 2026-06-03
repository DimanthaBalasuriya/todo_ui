import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles = [] }) {
  const { token, user } = useAuth();
  const location = useLocation();
  const role = user?.role;

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles.length && !role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles.length && !roles.includes(role)) {
    return <Navigate to={role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
}
