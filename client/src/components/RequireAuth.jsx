import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// This component is used to protect routes that require authentication
const RequireAuth = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Show loading state if auth is still being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-deep">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-accent"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    // Redirect to login page with return URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // If authenticated, render the protected component
  return children;
};

export default RequireAuth;