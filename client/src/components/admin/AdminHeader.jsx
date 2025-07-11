import { useState } from 'react';
import { Link } from 'react-router-dom';

const AdminHeader = ({ userName, onLogout, onMenuToggle, mobileMenuOpen }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  return (
    <header className="bg-dark/80 backdrop-blur-md shadow-md py-4 px-4 md:px-6 border-b border-white/10 flex items-center justify-between sticky top-0 z-40">
      {/* Mobile Menu Button - Left side */}
      <div className="flex items-center">
        <button
          onClick={onMenuToggle}
          className="lg:hidden mr-4 p-2 text-light-muted hover:text-white transition-colors"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          <i className={`fas fa-${mobileMenuOpen ? 'times' : 'bars'} text-xl`}></i>
        </button>
      
        {/* Logo - Left side on mobile */}
        <div className="flex items-center">
          <Link to="/" className="flex items-center">
            <i className="fas fa-music text-accent mr-2"></i>
            <span className="text-lg font-bold font-secondary">SongSculptors</span>
          </Link>
          <div className="ml-2 px-2 py-1 bg-accent/20 border border-accent/30 rounded text-xs font-medium text-accent">
            Admin
          </div>
        </div>
      </div>
      
      {/* Page Title (visible on medium+ screens) */}
      <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
        <h1 className="text-2xl font-bold font-secondary">Admin Dashboard</h1>
      </div>
      
      {/* User Menu */}
      <div className="relative">
        <button
          onClick={toggleUserMenu}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-dark font-bold">
            {userName?.charAt(0) || 'A'}
          </div>
          <span className="hidden sm:inline">{userName || 'Admin'}</span>
          <i className={`fas fa-chevron-down transition-transform ${showUserMenu ? 'rotate-180' : ''}`}></i>
        </button>
        
        {showUserMenu && (
          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-deep border border-white/10 z-50">
            <div className="py-1">
              <Link
                to="/profile"
                className="block px-4 py-2 hover:bg-white/5 transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                <i className="fas fa-user-cog mr-2"></i>
                Profile Settings
              </Link>
              <Link
                to="/dashboard"
                className="block px-4 py-2 hover:bg-white/5 transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                <i className="fas fa-tachometer-alt mr-2"></i>
                User Dashboard
              </Link>
              <Link
                to="/"
                className="block px-4 py-2 hover:bg-white/5 transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                <i className="fas fa-home mr-2"></i>
                Go to Site
              </Link>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  if (onLogout) onLogout();
                }}
                className="block w-full text-left px-4 py-2 hover:bg-white/5 transition-colors text-romantic"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default AdminHeader;