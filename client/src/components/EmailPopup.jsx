import { useState, useEffect } from 'react';
import { newsletterService } from '../services/api';

const EmailPopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState('');

  useEffect(() => {
    // Check if the popup has been shown before in this session or if user has already subscribed
    const hasSeenPopup = sessionStorage.getItem('hasSeenEmailPopup');
    const isSubscribed = localStorage.getItem('isSubscribed');
    
    if (!hasSeenPopup && !isSubscribed) {
      // Show popup after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(true);
        // Mark as shown for this session
        sessionStorage.setItem('hasSeenEmailPopup', 'true');
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Generate a random discount code
  useEffect(() => {
    const generateDiscountCode = () => {
      const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let result = 'SONG';
      for (let i = 0; i < 5; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      setDiscountCode(result);
    };

    generateDiscountCode();
  }, []);

  const validateEmail = (email) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate email format
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      // Submit email to newsletter service
      await newsletterService.subscribe(email);
      
      // Save code to localStorage for checkout
      localStorage.setItem('discountCode', discountCode);
      localStorage.setItem('isSubscribed', 'true');
      
      setSuccess(true);
      
      // Close after 5 seconds of showing success message
      setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    } catch (err) {
      console.error('Newsletter subscription error:', err);
      if (err.response?.data?.message?.includes('already subscribed')) {
        setSuccess(true);
        localStorage.setItem('isSubscribed', 'true');
      } else {
        setError(err.response?.data?.message || 'Failed to subscribe. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-deep w-full max-w-md rounded-lg relative overflow-hidden shadow-lg border border-accent/30 animate-fadeIn">
        {/* Close button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-light-muted hover:text-white transition-colors"
          aria-label="Close popup"
        >
          <i className="fas fa-times text-xl"></i>
        </button>
        
        {/* Gold accent line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-accent to-accent-alt"></div>
        
        <div className="p-6 sm:p-8">
          {!success ? (
            <>
              <div className="text-center mb-6">
                <div className="h-16 w-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-music text-2xl text-accent"></i>
                </div>
                <h2 className="text-2xl font-bold font-secondary mb-2">Get 10% Off Your First Song</h2>
                <p className="text-light-muted">Join our newsletter for special offers and music inspiration.</p>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
                    required
                  />
                  {error && (
                    <p className="mt-2 text-romantic text-sm">
                      <i className="fas fa-exclamation-circle mr-1"></i>
                      {error}
                    </p>
                  )}
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-accent text-dark font-semibold rounded-lg hover:bg-accent-alt transition-colors"
                >
                  {loading ? (
                    <>
                      <i className="fas fa-circle-notch fa-spin mr-2"></i>
                      Subscribing...
                    </>
                  ) : (
                    'Get My Discount Code'
                  )}
                </button>
                
                <p className="text-xs text-light-muted text-center mt-4">
                  We respect your privacy and will never share your information.
                  You can unsubscribe at any time.
                </p>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="h-16 w-16 rounded-full bg-green-600/20 border border-green-600/30 flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-check text-2xl text-green-500"></i>
              </div>
              <h2 className="text-2xl font-bold font-secondary mb-2">Thank You!</h2>
              <p className="mb-6">Your discount code has been saved</p>
              
              <div className="bg-white/5 border border-white/20 rounded-lg p-4 mb-6">
                <p className="text-sm mb-2">Use this code at checkout:</p>
                <div className="bg-accent/10 border border-accent/20 rounded p-3 font-mono font-semibold text-accent text-center">
                  {discountCode}
                </div>
              </div>
              
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-transparent border border-white/20 rounded-full hover:bg-white/5 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailPopup;