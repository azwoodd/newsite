// client/src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService, orderService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugMode, setDebugMode] = useState(false); // For development use

  // Debug log function - for tracing issues with order processing
  const logDebug = (message, data = null) => {
    if (debugMode) {
      const timestamp = new Date().toISOString();
      console.log(`[AuthContext][${timestamp}] ${message}`, data || '');
    }
  };

  useEffect(() => {
    // Check if debug mode is enabled in localStorage
    const savedDebugMode = localStorage.getItem('debug_mode') === 'true';
    setDebugMode(savedDebugMode);
    
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          // Parse stored user
          const user = JSON.parse(storedUser);
          setCurrentUser(user);
          
          // Verify token validity by making a request to getCurrentUser endpoint
          logDebug('Verifying stored token...');
          const response = await authService.getCurrentUser();
          if (response.data.success) {
            logDebug('Token verified, user:', response.data.user);
            // Update user data from server response
            setCurrentUser(response.data.user);
          } else {
            // Token invalid, clear storage
            logDebug('Token verification failed, logging out');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setCurrentUser(null);
          }
        } catch (err) {
          logDebug('Error verifying token:', err);
          // Token invalid, clear storage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setCurrentUser(null);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    initAuth();
  }, []);

  // Toggle debug mode - for development use
  const toggleDebugMode = () => {
    const newMode = !debugMode;
    setDebugMode(newMode);
    localStorage.setItem('debug_mode', newMode.toString());
    console.log(`Debug mode ${newMode ? 'enabled' : 'disabled'}`);
  };

  const register = async (name, email, password, confirmPassword) => {
    setError(null);
    try {
      logDebug('Registering new user:', { name, email });
      const response = await authService.register({
        name,
        email,
        password,
        confirmPassword
      });
      
      if (response.data.success) {
        // Store token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Update state
        setCurrentUser(response.data.user);
        logDebug('Registration successful');
        
        return { success: true };
      } else {
        setError(response.data.message || 'Registration failed');
        logDebug('Registration failed:', response.data.message);
        return { success: false, message: response.data.message };
      }
    } catch (err) {
      const errorMsg = err.message || 'Registration failed';
      setError(errorMsg);
      logDebug('Registration error:', errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      logDebug('Logging in user:', { email });
      const response = await authService.login({ email, password });
      
      if (response.data.success) {
        // Store token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Update state
        setCurrentUser(response.data.user);
        
        logDebug('Login successful', response.data.user);
        
        return { success: true };
      } else {
        setError(response.data.message || 'Login failed');
        logDebug('Login failed:', response.data.message);
        return { success: false, message: response.data.message };
      }
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
      setError(errorMsg);
      logDebug('Login error:', errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  const logout = () => {
    logDebug('Logging out user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setError(null);
  };

  const updateProfile = async (profileData) => {
    setError(null);
    try {
      logDebug('Updating user profile', profileData);
      const response = await authService.updateProfile(profileData);
      
      if (response.data.success) {
        // Update stored user data
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Update state
        setCurrentUser(response.data.user);
        logDebug('Profile update successful');
        
        return { success: true };
      } else {
        setError(response.data.message || 'Profile update failed');
        logDebug('Profile update failed:', response.data.message);
        return { success: false, message: response.data.message };
      }
    } catch (err) {
      const errorMsg = err.message || 'Profile update failed';
      setError(errorMsg);
      logDebug('Profile update error:', errorMsg);
      return { success: false, message: errorMsg };
    }
  };

  const updateOrder = async (orderId, updateData) => {
    setError(null);
    try {
      logDebug(`Updating order ${orderId} with data:`, updateData);
      
      // Check what kind of update we're performing
      let response;
      let successMsg = 'Order updated successfully';
      
      if (updateData.selectedVersion) {
        // Select song version
        logDebug(`Selecting song version ${updateData.selectedVersion} for order ${orderId}`);
        response = await orderService.selectSongVersion(orderId, updateData.selectedVersion);
        successMsg = 'Song version selected successfully';
      } else if (updateData.downloadedVersion) {
        // Download song version
        logDebug(`Downloading song version ${updateData.downloadedVersion} for order ${orderId}`);
        response = await orderService.downloadSong(orderId, updateData.downloadedVersion);
        successMsg = 'Song downloaded successfully';
      } else if (updateData.approveLyrics !== undefined) {
        // Approve or request changes to lyrics
        logDebug(`${updateData.approveLyrics ? 'Approving' : 'Requesting changes to'} lyrics for order ${orderId}`);
        response = await orderService.approveLyrics(orderId, {
          feedback: updateData.feedback || '',
          approved: updateData.approveLyrics
        });
        successMsg = updateData.approveLyrics ? 'Lyrics approved successfully' : 'Lyrics change request submitted';
      } else if (updateData.approveSong !== undefined) {
        // Approve or request changes to song
        logDebug(`${updateData.approveSong ? 'Approving' : 'Requesting changes to'} song for order ${orderId}`);
        const approvalData = {
          feedback: updateData.feedback || '',
          approved: updateData.approveSong
        };
        
        if (updateData.approveSong && updateData.selectedVersionId) {
          approvalData.selectedVersionId = updateData.selectedVersionId;
        }
        
        response = await orderService.approveSong(orderId, approvalData);
        successMsg = updateData.approveSong ? 'Song approved successfully' : 'Song change request submitted';
      } else if (updateData.status) {
        // Update order status - typically used by admin
        logDebug(`Updating order ${orderId} status to:`, updateData.status);
        response = await orderService.updateOrderStatus(orderId, {
          status: updateData.status
        });
        successMsg = `Order status updated to ${updateData.status}`;
      } else {
        logDebug('Invalid update data for order', updateData);
        return { success: false, message: 'Invalid update data' };
      }
      
      if (response.data.success) {
        logDebug('Order update successful:', response.data);
        return { success: true, message: response.data.message || successMsg };
      } else {
        logDebug('Order update failed:', response.data);
        setError(response.data.message || 'Order update failed');
        return { success: false, message: response.data.message || 'Order update failed' };
      }
    } catch (err) {
      const errorMsg = err.message || 'Order update failed';
      setError(errorMsg);
      logDebug('Order update error:', err);
      return { success: false, message: errorMsg };
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    register,
    login,
    logout,
    updateProfile,
    updateOrder,
    debugMode,
    toggleDebugMode
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;