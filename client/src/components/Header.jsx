import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { smoothScrollTo } from '../utils/scrollUtils';
import Logo from './Logo';

const Header = ({ scrolled }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Close menu when location changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const navLinks = [
    { text: 'Home', href: '/' },
    { text: 'Experience', href: '/#experience' },
    { text: 'Process', href: '/#process' },
    { text: 'Showcase', href: '/showcase' },
    { text: 'Pricing', href: '/#pricing' },
  ];

  // Handle smooth scrolling for anchor links with improved reliability
  const handleAnchorClick = (e, href) => {
    // Only process anchor links on the current page
    if (href.includes('#')) {
      e.preventDefault();
      closeMenu();
      
      // Extract the target ID
      const targetId = href.includes('/') 
        ? href.split('#')[1]  // Format: /#section-id
        : href.substring(1);  // Format: #section-id
      
      if (!targetId) return;
      
      // If we're not on the home page and this is a home page section
      if (location.pathname !== '/' && href.startsWith('/#')) {
        // Navigate to home page with the anchor
        navigate('/', { replace: true });
        
        // Give time for the navigation to complete before scrolling
        setTimeout(() => {
          smoothScrollTo(targetId, 80);
        }, 100);
        
        return;
      }
      
      // Otherwise, we're already on the right page, just scroll
      smoothScrollTo(targetId, 80);
      
      // Update URL without full page reload
      if (history.pushState) {
        history.pushState(null, null, href);
      }
    } else {
      // Regular navigation, just close the menu
      closeMenu();
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 transition-all duration-300">
      <div className="container-custom h-full">
        {/* Background Blur */}
        <div
          className={`absolute top-0 left-0 w-full h-full bg-dark/50 backdrop-blur-md z-0 ${scrolled ? '' : 'opacity-0'}`}
        ></div>

        <nav className="flex justify-between items-center h-20 relative z-10">
          {/* Brand Logo */}
          <Logo size="normal" className="relative z-50 pr-6" />

          <ul
            className={`flex lg:flex-row lg:static lg:h-auto lg:bg-transparent lg:translate-x-0 lg:p-0 
              fixed top-16 left-0 w-full h-[calc(100vh-64px)] flex-col items-center 
              justify-start pt-4 gap-5 bg-dark/95 backdrop-blur-md transition-transform 
              duration-300 z-50 ${menuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
          >
            {navLinks.map((link, index) => (
              <li key={index} className="lg:ml-8 w-full px-6 lg:px-0 lg:w-auto">
                <Link
                  to={link.href}
                  className="font-medium relative py-3 px-4 lg:px-0 lg:py-2 flex w-full lg:w-auto justify-center hover:text-accent transition-colors duration-200 
                    after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 
                    after:bg-accent after:transition-width after:duration-300 hover:after:w-full"
                  onClick={(e) => handleAnchorClick(e, link.href)}
                >
                  {link.text}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center z-50">
            {currentUser ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-full bg-transparent border-2 border-accent text-white hover:bg-accent/10 transition-all duration-200 text-sm font-medium hidden sm:flex items-center"
              >
                <i className="fas fa-user mr-2"></i>
                Dashboard
              </Link>
            ) : (
              <div className="hidden sm:flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-1.5 rounded-full bg-transparent border-2 border-accent text-white hover:bg-accent/10 transition-all duration-200 text-sm font-medium flex items-center"
                >
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-1.5 rounded-full bg-accent border-2 border-accent text-dark hover:bg-accent-alt transition-all duration-200 text-sm font-medium flex items-center"
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="lg:hidden text-2xl bg-transparent border-none cursor-pointer text-white ml-4"
              onClick={toggleMenu}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <i className={`fas ${menuOpen ? 'fa-times' : 'fa-bars'}`}></i>
            </button>

            {/* Mobile auth buttons */}
            {!currentUser && menuOpen && (
              <div className="fixed bottom-32 left-0 w-full flex justify-center gap-4 lg:hidden z-50">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-full bg-transparent border-2 border-accent text-white hover:bg-accent/10 transition-all duration-200 text-xs font-medium flex items-center"
                  onClick={closeMenu}
                >
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-full bg-accent border-2 border-accent text-dark hover:bg-accent-alt transition-all duration-200 text-xs font-medium flex items-center"
                  onClick={closeMenu}
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile dashboard button */}
            {currentUser && menuOpen && (
              <div className="fixed bottom-32 left-0 w-full flex justify-center lg:hidden z-50">
                <Link
                  to="/dashboard"
                  className="px-6 py-3 rounded-full bg-transparent border-2 border-accent text-white hover:bg-accent/10 transition-all duration-200 text-sm font-medium flex items-center"
                  onClick={closeMenu}
                >
                  <i className="fas fa-user mr-2"></i>
                  Dashboard
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;