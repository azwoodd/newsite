// client/src/components/Login.jsx
import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the return URL if available (for redirecting after login)
  const from = location.state?.from || '/dashboard';
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset error state
    setError('');
    
    // Validation
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    
    try {
      setLoading(true);
      const result = await login(email, password);
      
      if (result.success) {
        navigate(from);
      } else {
        setError(result.message || 'Invalid email or password');
      }
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Login
  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <section className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-dark to-deep pb-24">
      <div className="max-w-md w-full space-y-8 bg-white/5 p-10 rounded-xl backdrop-blur-sm border border-white/10">
        <div className="text-center">
          <Link to="/" className="font-secondary flex items-center justify-center">
            <div className="h-12 w-auto mr-3 flex-shrink-0">
              <img src={logo} alt="SongSculptors Logo" className="h-full" />
            </div>
            <span className="text-3xl font-bold">SongSculptors</span>
          </Link>
          <h2 className="mt-6 text-3xl font-bold font-secondary">Sign in to your account</h2>
          <p className="mt-2 text-sm text-light-muted">
            Access your orders and song versions
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-romantic/10 border border-romantic rounded-md p-4 text-sm text-center">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(196,160,100,0.2)]"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(196,160,100,0.2)]"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 accent-accent bg-white/10 border-white/20 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="text-accent hover:underline">
                Forgot your password?
              </a>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 px-6 bg-gradient-to-r from-accent to-accent-alt text-dark font-semibold rounded-full relative overflow-hidden transition-all duration-300 ${
                loading ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-[0_0_15px_rgba(196,160,100,0.5)]'
              }`}
            >
              {loading ? (
                <>
                  <span className="mr-3">Signing in...</span>
                  <i className="fas fa-circle-notch fa-spin"></i>
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-deep text-light-muted">Or continue with</span>
            </div>
          </div>
          
          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex justify-center items-center py-3 px-4 border border-white/20 rounded-full shadow-sm text-sm font-medium text-white hover:bg-white/5"
            >
              <img src="https://developers.google.com/identity/images/g-logo.png" className="h-5 w-5 mr-2" alt="Google logo" />
              Sign in with Google
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-sm text-muted mb-2">
            Demo account: test@example.com / password123
          </p>
          <p className="text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-accent hover:underline">
              Sign up
            </Link>
          </p>
        </div>
        
        <div className="pt-4 text-center">
          <Link to="/" className="text-sm text-light-muted hover:text-white transition-colors">
            <i className="fas fa-arrow-left mr-2"></i>
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Login;