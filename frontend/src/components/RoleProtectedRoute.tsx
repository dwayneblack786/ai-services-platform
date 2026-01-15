import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RoleProtectedRouteProps } from '../types';

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  allowedRoles,
  redirectTo = '/dashboard' 
}) => {
  const { user, loading, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!hasAnyRole(...allowedRoles)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '2rem'
      }}>
        <h1 style={{ color: '#dc3545', marginBottom: '1rem' }}>Access Denied</h1>
        <p style={{ marginBottom: '2rem' }}>
          You don't have permission to access this page.
        </p>
        <button 
          onClick={() => navigate(redirectTo)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
