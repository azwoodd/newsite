// client/src/components/Signup.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset error state
    setError('');
    
    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    try {
      setLoading(true);
      const result = await register(name, email, password, confirmPassword);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message || 'Email is already in use');
      }
    } catch (err) {
      setError('Failed to create account. Please try again.');
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
          <Link to="/" className="font-secondary text-3xl font-bold flex items-center justify-center">
            <img src={logo} alt="SongSculptors Logo" className="h-12 mr-3" />
            <span>SongSculptors</span>
          </Link>
          <h2 className="mt-6 text-3xl font-bold font-secondary">Create your account</h2>
          <p className="mt-2 text-sm text-light-muted">
            Join us to manage your custom songs and orders
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
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(196,160,100,0.2)]"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
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
                autoComplete="new-password"
                required
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(196,160,100,0.2)]"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(196,160,100,0.2)]"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
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
                  <span className="mr-3">Creating account...</span>
                  <i className="fas fa-circle-notch fa-spin"></i>
                </>
              ) : (
                'Create Account'
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
              Sign up with Google
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-sm text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:underline">
              Sign in
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

export default Signup;