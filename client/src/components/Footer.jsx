import { Link } from 'react-router-dom';
import { useState } from 'react';
import { newsletterService } from '../services/api';
import { usePreserveParams } from '../hooks/usePreserveParams';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { getUrlWithParams } = usePreserveParams();
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  
  const footerLinks = {
  quickLinks: [
    { text: 'Home', href: '#home', isRoute: false },
    { text: 'Experience', href: '#experience', isRoute: false },
    { text: 'Our Process', href: '#process', isRoute: false },
    { text: 'Showcase', href: '/showcase', isRoute: true }, // ✅ This is a route
    { text: 'Pricing', href: '#pricing', isRoute: false }
  ],
    policies: [
      { text: 'Privacy Policy', href: '#' },
      { text: 'Terms of Service', href: '#' },
      { text: 'Refund Policy', href: '#' },
      { text: 'Copyright', href: '#' }
    ]
  };
  
  const contactInfo = [
    { icon: 'envelope', text: 'hello@songsculptors.com' },
    { icon: 'phone', text: '+1 (555) 123-4567' },
    { icon: 'clock', text: 'Mon-Fri: 9AM - 5PM GMT' }
  ];
  
  const socialLinks = [
    { icon: 'facebook-f', href: '#' },
    { icon: 'instagram', href: '#' },
    { icon: 'twitter', href: '#' },
    { icon: 'youtube', href: '#' }
  ];

  // Handle newsletter subscription
  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setSubscribeStatus({
        type: 'error',
        message: 'Please enter your email address'
      });
      return;
    }
    
    try {
      setLoading(true);
      await newsletterService.subscribe(email);
      
      setSubscribeStatus({
        type: 'success',
        message: 'Thanks for subscribing!'
      });
      
      setEmail('');
      
      // Save to localStorage to prevent showing email popup again
      localStorage.setItem('isSubscribed', 'true');
    } catch (err) {
      console.error('Newsletter subscription error:', err);
      
      if (err.response?.data?.message?.includes('already subscribed')) {
        setSubscribeStatus({
          type: 'success',
          message: 'You are already subscribed!'
        });
        localStorage.setItem('isSubscribed', 'true');
      } else {
        setSubscribeStatus({
          type: 'error',
          message: err.response?.data?.message || 'Failed to subscribe. Please try again.'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="bg-dark pt-20 pb-8">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <Link to={getUrlWithParams('/')} className="font-secondary flex items-center mb-6">
              <i className="fas fa-music text-accent mr-2"></i>
              <span className="text-2xl font-bold">SongSculptors</span>
            </Link>
            <p className="text-muted mb-6">
              We transform your most meaningful moments into beautiful, professional songs. 
              The perfect gift that captures your unique story through music.
            </p>
            <div className="flex gap-4 mb-6">
              {socialLinks.map((link, index) => (
                <a 
                  key={index}
                  href={link.href}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-all duration-200 hover:bg-accent hover:-translate-y-1"
                  aria-label={`Follow us on ${link.icon.replace('-', ' ')}`}
                >
                  <i className={`fab fa-${link.icon}`}></i>
                </a>
              ))}
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="text-xl font-semibold mb-6 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-10 after:h-0.5 after:bg-accent">
              Quick Links
            </h4>
            <ul className="flex flex-col gap-3">
              {footerLinks.quickLinks.map((link, index) => (
  <li key={index}>
    {link.isRoute ? (
      <Link
        to={getUrlWithParams(link.href)}
        className="text-muted transition-all duration-200 hover:text-accent hover:translate-x-1 flex items-center group"
      >
        <i className="fas fa-chevron-right text-xs mr-2 text-accent opacity-0 transition-all duration-200 group-hover:opacity-100"></i>
        <span className="transform transition-transform duration-200 hover:translate-x-1">
          {link.text}
        </span>
      </Link>
    ) : (
      <a 
        href={link.href}
        className="text-muted transition-all duration-200 hover:text-accent hover:translate-x-1 flex items-center group"
      >
        <i className="fas fa-chevron-right text-xs mr-2 text-accent opacity-0 transition-all duration-200 group-hover:opacity-100"></i>
        <span className="transform transition-transform duration-200 hover:translate-x-1">
          {link.text}
        </span>
      </a>
    )}
  </li>
))}
            </ul>
          </div>
          
          {/* Policies */}
          <div>
            <h4 className="text-xl font-semibold mb-6 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-10 after:h-0.5 after:bg-accent">
              Policies
            </h4>
            <ul className="flex flex-col gap-3">
              {footerLinks.policies.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href}
                    className="text-muted transition-all duration-200 hover:text-accent hover:translate-x-1 flex items-center group"
                  >
                    <i className="fas fa-chevron-right text-xs mr-2 text-accent opacity-0 transition-all duration-200 group-hover:opacity-100"></i>
                    <span className="transform transition-transform duration-200 hover:translate-x-1">
                      {link.text}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h4 className="text-xl font-semibold mb-6 relative pb-2 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-10 after:h-0.5 after:bg-accent">
              Contact Us
            </h4>
            <div className="flex flex-col gap-4">
              {contactInfo.map((item, index) => (
                <div key={index} className="flex items-start gap-4 text-muted">
                  <i className={`fas fa-${item.icon} text-accent mt-1`}></i>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/10">
              <h5 className="font-semibold mb-3">Newsletter</h5>
              <form className="flex gap-2" onSubmit={handleSubscribe}>
                <input 
                  type="email" 
                  placeholder="Your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-grow px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                />
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors"
                  disabled={loading}
                >
                  {loading ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-paper-plane"></i>
                  )}
                </button>
              </form>
              {subscribeStatus.message && (
                <p className={`mt-2 text-sm ${
                  subscribeStatus.type === 'success' ? 'text-green-400' : 'text-romantic'
                }`}>
                  {subscribeStatus.type === 'success' ? (
                    <i className="fas fa-check-circle mr-1"></i>
                  ) : (
                    <i className="fas fa-exclamation-circle mr-1"></i>
                  )}
                  {subscribeStatus.message}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-8 mt-8"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-center text-muted text-sm">
          <p>
            &copy; {currentYear} SongSculptors. All rights reserved.
          </p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-accent">Privacy</a>
            <a href="#" className="hover:text-accent">Terms</a>
            <a href="#" className="hover:text-accent">Cookies</a>
          </div>
        </div>
        
        <div className="text-center mt-6 text-xs text-white/30">
          <p>Crafted from your story, carved into song.</p>
        </div>
      </div>

      {/* Add bottom margin to account for music player */}
      <div className="h-[90px] md:h-0"></div>
    </footer>
  );
};

export default Footer;