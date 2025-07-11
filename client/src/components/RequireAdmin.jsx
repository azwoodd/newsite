// client/src/components/RequireAdmin.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// This component is used to protect routes that require admin authorization
const RequireAdmin = ({ children }) => {
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

  // Debug output
  console.log('RequireAdmin check:', { 
    currentUser, 
    isAdmin: currentUser?.role === 'admin' 
  });

  // Redirect to login if not authenticated
  if (!currentUser) {
    // Redirect to login page with return URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Redirect to dashboard if authenticated but not admin
  if (currentUser.role !== 'admin') {
    console.log('User is not admin, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // If authenticated and admin, render the protected component
  console.log('Admin access granted');
  return children;
};

export default RequireAdmin;