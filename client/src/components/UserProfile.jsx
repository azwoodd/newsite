import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';

const UserProfile = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
    }
  }, [currentUser]);
  
  // Handle profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Call API to update profile
      await userService.updateProfile({ name, email });
      
      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle password change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Call API to change password
      const { success, message } = await userService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword
      });
      
      if (success) {
        setSuccess('Password changed successfully!');
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setError(message);
      }
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle account deletion
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Call API to delete account
      await userService.deleteAccount(deletePassword);
      
      // Logout and redirect to home
      logout();
      navigate('/', { state: { accountDeleted: true } });
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err.response?.data?.message || 'Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-deep">
        <div className="text-center">
          <p className="mb-4">You must be logged in to view this page.</p>
          <Link to="/login" className="btn px-6 py-2 border-2 border-accent rounded-full hover:bg-accent/10 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark to-deep pb-24">
      {/* Header */}
      <header className="bg-dark/80 backdrop-blur-md shadow-md py-4 sticky top-0 z-30">
        <div className="container-custom flex flex-wrap gap-y-3 justify-between items-center">
          {/* Back button */}
          <Link to="/dashboard" className="text-sm px-4 py-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors">
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Dashboard
          </Link>
          
          <div className="font-secondary flex items-center">
            <i className="fas fa-user-cog text-accent mr-2"></i>
            <span className="text-xl sm:text-2xl font-bold">Profile Settings</span>
          </div>
          
          <div className="flex items-center gap-4">
            {currentUser.role === 'admin' && (
              <Link 
                to="/admin"
                className="text-sm px-4 py-2 border border-accent text-accent rounded-full hover:bg-accent/10 transition-colors flex items-center"
              >
                <i className="fas fa-crown mr-2"></i>
                Admin Panel
              </Link>
            )}
            
            <button 
              onClick={handleLogout}
              className="text-sm px-4 py-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors"
            >
              <i className="fas fa-sign-out-alt mr-2"></i>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container-custom py-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 font-secondary">Your Profile</h1>
            <p className="text-light-muted">
              Manage your account settings and preferences.
            </p>
          </div>
          
          {/* Success Message */}
          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6 text-green-400">
              <i className="fas fa-check-circle mr-2"></i>
              {success}
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="bg-romantic/10 border border-romantic rounded-lg p-4 mb-6">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}
          
          {/* Profile Form */}
          <div className="bg-white/5 rounded-lg p-6 border border-white/10 mb-8">
            <h2 className="text-xl font-bold mb-6 pb-4 border-b border-white/10 font-secondary">
              Personal Information
            </h2>
            
            <form onSubmit={handleUpdateProfile}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="name" className="block mb-2 text-sm font-medium">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block mb-2 text-sm font-medium">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors"
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          
          {/* Change Password Form */}
          <div className="bg-white/5 rounded-lg p-6 border border-white/10 mb-8">
            <h2 className="text-xl font-bold mb-6 pb-4 border-b border-white/10 font-secondary">
              Change Password
            </h2>
            
            <form onSubmit={handleChangePassword}>
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="current-password" className="block mb-2 text-sm font-medium">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="new-password" className="block mb-2 text-sm font-medium">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                    required
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label htmlFor="confirm-password" className="block mb-2 text-sm font-medium">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors"
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-key mr-2"></i>
                      Change Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          
          {/* Delete Account Section */}
          <div className="bg-romantic/10 rounded-lg p-6 border border-romantic/20">
            <h2 className="text-xl font-bold mb-4 font-secondary text-romantic">
              Delete Account
            </h2>
            
            <p className="text-light-muted mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-6 py-2 bg-transparent border border-romantic text-romantic rounded-lg hover:bg-romantic/10 transition-colors"
              >
                <i className="fas fa-trash-alt mr-2"></i>
                Delete My Account
              </button>
            ) : (
              <form onSubmit={handleDeleteAccount} className="border-t border-romantic/20 pt-4 mt-4">
                <p className="text-sm mb-4">
                  To confirm account deletion, please enter your password:
                </p>
                
                <div className="mb-4">
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Your current password"
                    className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-romantic"
                    required
                  />
                </div>
                
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-6 py-2 bg-transparent border border-white/20 text-white rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-romantic text-white rounded-lg hover:bg-romantic/80 transition-colors"
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Processing...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-exclamation-triangle mr-2"></i>
                        Permanently Delete Account
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
      
      {/* Mobile navigation footer */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-dark/80 backdrop-blur-md border-t border-white/10 z-30">
        <div className="flex justify-around py-2">
          <Link to="/" className="flex flex-col items-center p-2 text-light-muted">
            <i className="fas fa-home text-lg"></i>
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link to="/dashboard" className="flex flex-col items-center p-2 text-light-muted">
            <i className="fas fa-tachometer-alt text-lg"></i>
            <span className="text-xs mt-1">Dashboard</span>
          </Link>
          <Link to="/showcase" className="flex flex-col items-center p-2 text-light-muted">
            <i className="fas fa-headphones text-lg"></i>
            <span className="text-xs mt-1">Gallery</span>
          </Link>
          <Link to="/profile" className="flex flex-col items-center p-2 text-accent">
            <i className="fas fa-user text-lg"></i>
            <span className="text-xs mt-1">Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;