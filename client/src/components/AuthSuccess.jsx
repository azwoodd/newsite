// client/src/components/AuthSuccess.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      // Get token from URL query params
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (token) {
        // Store token in localStorage
        localStorage.setItem('token', token);
        
        // Store basic user info for now, we'll get the full profile later
        // This avoids the token parsing that might be causing issues
        localStorage.setItem('user', JSON.stringify({
          // Just a placeholder - the Dashboard will fetch actual user info
          isAuthenticated: true
        }));
        
        // Navigate to dashboard - we'll refresh user info there
        console.log('Token stored, redirecting to dashboard');
        navigate('/dashboard');
      } else {
        console.error('No token found in URL');
        navigate('/login');
      }
    } catch (error) {
      console.error('Auth success error:', error);
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-deep">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-accent"></div>
        <p className="mt-4">Logging you in...</p>
      </div>
    </div>
  );
};

export default AuthSuccess;