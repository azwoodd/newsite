import axios from 'axios';
import adminHelpdeskService from './adminHelpdeskService';
import { affiliateService, adminAffiliateService } from './affiliateService';

// Create axios instance with base URL
const api = axios.create({
  baseURL: '/api', // This will use the current domain, which is https://songsculptors.com/api
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add a timestamp for debugging purposes
    const requestTime = new Date().toISOString();
    console.log(`[API Request][${requestTime}] ${config.method.toUpperCase()} ${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for handling token expiration and better error logging
api.interceptors.response.use(
  (response) => {
    // Log success for debugging
    const responseTime = new Date().toISOString();
    console.log(`[API Response][${responseTime}] ${response.config.method.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    
    return response;
  },
  (error) => {
    const responseTime = new Date().toISOString();
    
    // Enhanced error logging
    if (error.response) {
      // Server responded with a non-2xx status
      console.error(`[API Error][${responseTime}] ${error.config?.method?.toUpperCase()} ${error.config?.url} - Status: ${error.response.status}`, error.response.data);
      
      if (error.response.status === 401) {
        // Token expired or invalid
        console.log("Authentication error detected, redirecting to login");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Redirect to login page if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else if (error.response.status === 403) {
        console.error("Permission denied. You don't have access to this resource.");
      } else if (error.response.status === 400) {
        console.error("Bad request. Please check your input:", error.response.data.message);
      } else if (error.response.status === 404) {
        console.error("Resource not found:", error.response.data.message);
      } else if (error.response.status === 500) {
        console.error("Server error. Please try again later:", error.response.data.message);
      }
    } else if (error.request) {
      // No response received from server
      console.error(`[API Network Error][${responseTime}] ${error.config?.method?.toUpperCase()} ${error.config?.url} - No response received`, error.request);
    } else {
      // Something happened in setting up the request
      console.error(`[API Error][${responseTime}] Error setting up request:`, error.message);
    }
    
    return Promise.reject(error);
  }
);

// Helper function to extract error message
const getErrorMessage = (error) => {
  if (error.response && error.response.data) {
    return error.response.data.message || 'An error occurred. Please try again.';
  }
  return error.message || 'Network error. Please check your connection.';
};

// Auth services
const authService = {
  register: async (userData) => {
    try {
      return await api.post('/auth/register', userData);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  login: async (credentials) => {
    try {
      return await api.post('/auth/login', credentials);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  getCurrentUser: async () => {
    try {
      return await api.get('/auth/me');
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  changePassword: async (passwordData) => {
    try {
      return await api.put('/auth/change-password', passwordData);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
};

// User services
const userService = {
  getProfile: async () => {
    try {
      return await api.get('/users/profile');
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  updateProfile: async (profileData) => {
    try {
      return await api.put('/users/profile', profileData);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  deleteAccount: async (password) => {
    try {
      return await api.delete('/users/account', { data: { password } });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
};

// Order services
const orderService = {
  createOrder: async (orderData) => {
    try {
      console.log('[Order Service] Creating new order with data:', JSON.stringify(orderData, null, 2));
      return await api.post('/orders', orderData);
    } catch (error) {
      console.error('[Order Service] Error creating order:', error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  getUserOrders: async () => {
    try {
      console.log('[Order Service] Fetching user orders');
      return await api.get('/orders');
    } catch (error) {
      console.error('[Order Service] Error fetching user orders:', error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  getOrderById: async (orderId) => {
    try {
      console.log(`[Order Service] Fetching order details for ID: ${orderId}`);
      return await api.get(`/orders/${orderId}`);
    } catch (error) {
      console.error(`[Order Service] Error fetching order ${orderId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  selectSongVersion: async (orderId, songId) => {
    try {
      console.log(`[Order Service] Selecting song version ${songId} for order ${orderId}`);
      return await api.put(`/orders/${orderId}/songs/${songId}/select`);
    } catch (error) {
      console.error(`[Order Service] Error selecting song version ${songId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  downloadSong: async (orderId, songId) => {
    try {
      console.log(`[Order Service] Downloading song version ${songId} for order ${orderId}`);
      return await api.put(`/orders/${orderId}/songs/${songId}/download`);
    } catch (error) {
      console.error(`[Order Service] Error downloading song version ${songId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  updateOrderStatus: async (orderId, statusData) => {
    try {
      console.log(`[Order Service] Updating order ${orderId} status to:`, statusData.status);
      return await api.put(`/orders/${orderId}/status`, statusData);
    } catch (error) {
      console.error(`[Order Service] Error updating order ${orderId} status:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  // Functions for customer lyrics and song approval/revision
  approveLyrics: async (orderId, approvalData) => {
    try {
      console.log(`[Order Service] Approving lyrics for order ${orderId} with data:`, JSON.stringify(approvalData, null, 2));
      return await api.put(`/orders/${orderId}/lyrics/approve`, approvalData);
    } catch (error) {
      console.error(`[Order Service] Error approving lyrics for order ${orderId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  approveSong: async (orderId, approvalData) => {
    try {
      console.log(`[Order Service] Approving song for order ${orderId} with data:`, JSON.stringify(approvalData, null, 2));
      return await api.put(`/orders/${orderId}/song/approve`, approvalData);
    } catch (error) {
      console.error(`[Order Service] Error approving song for order ${orderId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  // Get revision history for an order
  getRevisionHistory: async (orderId) => {
    try {
      console.log(`[Order Service] Fetching revision history for order ${orderId}`);
      return await api.get(`/orders/${orderId}/revisions`);
    } catch (error) {
      console.error(`[Order Service] Error fetching revision history for order ${orderId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  }
};


// Song services
const songService = {
  getShowcaseSongs: async (category, limit) => {
    try {
      let queryParams = {};
      if (category) queryParams.category = category;
      if (limit) queryParams.limit = limit;
      return await api.get('/songs/showcase', { params: queryParams });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  getShowcaseCategories: async () => {
    try {
      return await api.get('/songs/showcase/categories');
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  getShowcaseSongById: async (songId) => {
    try {
      return await api.get(`/songs/showcase/${songId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  incrementViewCount: async (songId) => {
    try {
      return await api.post(`/songs/showcase/${songId}/view`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
};

// Newsletter services
const newsletterService = {
  subscribe: async (email) => {
    try {
      return await api.post('/newsletter/subscribe', { email });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  unsubscribe: async (email) => {
    try {
      return await api.post('/newsletter/unsubscribe', { email });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
};

// Admin services
const adminService = {
  // Order management
  getAllOrders: async () => {
    try {
      console.log('[Admin Service] Fetching all orders');
      return await api.get('/admin/orders');
    } catch (error) {
      console.error('[Admin Service] Error fetching all orders:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Get revision history for an order
getOrderRevisionHistory: async (orderId) => {
  try {
    console.log(`[Admin Service] Fetching revision history for order ${orderId}`);
    return await api.get(`/admin/orders/${orderId}/revisions`);
  } catch (error) {
    console.error(`[Admin Service] Error fetching revision history for order ${orderId}:`, error);
    throw new Error(getErrorMessage(error));
  }
},

// Add revision notes
addRevisionNote: async (orderId, noteData) => {
  try {
    console.log(`[Admin Service] Adding revision note for order ${orderId}`);
    return await api.post(`/admin/orders/${orderId}/revisions/notes`, noteData);
  } catch (error) {
    console.error(`[Admin Service] Error adding revision note for order ${orderId}:`, error);
    throw new Error(getErrorMessage(error));
  }
},
  
  getOrderDetails: async (orderId) => {
    try {
      console.log(`[Admin Service] Fetching order details for ID: ${orderId}`);
      return await api.get(`/admin/orders/${orderId}`);
    } catch (error) {
      console.error(`[Admin Service] Error fetching order ${orderId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  updateOrderStatus: async (orderId, statusData) => {
    try {
      console.log(`[Admin Service] Updating order ${orderId} status to:`, statusData.status);
      return await api.put(`/admin/orders/${orderId}/status`, statusData);
    } catch (error) {
      console.error(`[Admin Service] Error updating order ${orderId} status:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  // Lyrics management
  updateOrderLyrics: async (orderId, lyricsData) => {
    try {
      console.log(`[Admin Service] Updating lyrics for order ${orderId}`);
      return await api.put(`/admin/orders/${orderId}/lyrics`, lyricsData);
    } catch (error) {
      console.error(`[Admin Service] Error updating lyrics for order ${orderId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  // Revision settings
  updateOrderRevisions: async (orderId, revisionSettings) => {
    try {
      console.log(`[Admin Service] Updating revision settings for order ${orderId}:`, revisionSettings);
      return await api.put(`/admin/orders/${orderId}/revisions`, revisionSettings);
    } catch (error) {
      console.error(`[Admin Service] Error updating revision settings for order ${orderId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  // Song version management
  uploadSongVersion: async (orderId, formData) => {
    try {
      console.log(`[Admin Service] Uploading song version for order ${orderId}`);
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: progressEvent => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      };
      return await api.post(`/admin/orders/${orderId}/songs`, formData, config);
    } catch (error) {
      console.error(`[Admin Service] Error uploading song version for order ${orderId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  deleteSongVersion: async (orderId, songId) => {
    try {
      console.log(`[Admin Service] Deleting song version ${songId} for order ${orderId}`);
      return await api.delete(`/admin/orders/${orderId}/songs/${songId}`);
    } catch (error) {
      console.error(`[Admin Service] Error deleting song version ${songId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  // Newsletter management
  getNewsletterSignups: async () => {
    try {
      return await api.get('/admin/newsletter/signups');
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  exportNewsletterSignups: async () => {
    try {
      return await api.get('/admin/newsletter/export', { responseType: 'blob' });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  // Revision history
  getOrderRevisionHistory: async (orderId) => {
    try {
      console.log(`[Admin Service] Fetching revision history for order ${orderId}`);
      return await api.get(`/admin/orders/${orderId}/revisions`);
    } catch (error) {
      console.error(`[Admin Service] Error fetching revision history for order ${orderId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  addRevisionNote: async (orderId, noteData) => {
    try {
      console.log(`[Admin Service] Adding revision note for order ${orderId}`);
      return await api.post(`/admin/orders/${orderId}/revisions/notes`, noteData);
    } catch (error) {
      console.error(`[Admin Service] Error adding revision note for order ${orderId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
  
  // Showcase management
  getShowcaseItems: async () => {
    try {
      return await api.get('/admin/showcase');
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  addShowcaseItem: async (formData) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };
      return await api.post('/admin/showcase', formData, config);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  updateShowcaseItem: async (itemId, formData) => {
    try {
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      };
      return await api.put(`/admin/showcase/${itemId}`, formData, config);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  deleteShowcaseItem: async (itemId) => {
    try {
      return await api.delete(`/admin/showcase/${itemId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  // Format workflow status
  formatWorkflowStatus: (status) => {
    // Convert DB status to display format
    switch(status) {
      case 'pending': return 'Pending';
      case 'in_production': return 'In Production';
      case 'lyrics_review': return 'Lyrics Review';
      case 'song_production': return 'Song Production';
      case 'song_review': return 'Song Review';
      case 'completed': return 'Completed';
      case 'ready_for_review': return 'Ready for Review'; // Legacy support
      default: return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  },
  
  // Get workflow stage based on status
  getWorkflowStage: (status, lyricsApproved, hasSongVersions) => {
    // For use with legacy statuses
    switch(status.toLowerCase().replace(/\s+/g, '_')) {
      case 'pending': return 1;
      case 'in_production': return 2;
      case 'lyrics_review': return 3;
      case 'song_production': return 4;
      case 'song_review': return 5;
      case 'completed': return 6;
      case 'ready_for_review':
        if (!lyricsApproved) return 3; // Lyrics review
        if (!hasSongVersions) return 4; // Song production
        return 5; // Song review
      default: return 1;
    }
  }
};

// Helpdesk services for users
const helpdeskService = {
  // User endpoints
  createTicket: async (ticketData) => {
    try {
      return await api.post('/helpdesk/user/tickets', ticketData);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  getUserTickets: async () => {
    try {
      return await api.get('/helpdesk/user/tickets');
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  getTicketDetails: async (ticketId) => {
    try {
      return await api.get(`/helpdesk/user/tickets/${ticketId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  addMessage: async (ticketId, message) => {
    try {
      return await api.post(`/helpdesk/user/tickets/${ticketId}/messages`, { message });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  closeTicket: async (ticketId) => {
    try {
      return await api.put(`/helpdesk/user/tickets/${ticketId}/close`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  reopenTicket: async (ticketId) => {
    try {
      return await api.put(`/helpdesk/user/tickets/${ticketId}/reopen`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  getAdminStatus: async () => {
    try {
      return await api.get('/helpdesk/admin-status');
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
};

// Payment services
const paymentService = {
  // amount is in pence; orderId is required by the backend
  createPaymentIntent: async (amount, orderId, metadata = {}, currency = 'gbp') => {
    try {
      return await api.post('/payment/create-intent', { amount, currency, orderId, metadata });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  verifyPayment: async (paymentIntentId) => {
    try {
      return await api.get(`/payment/verify/${paymentIntentId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  processPayPalOrder: async (orderData) => {
    try {
      return await api.post('/paypal/create-order', orderData);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
  
  capturePayPalOrder: async (orderId) => {
    try {
      return await api.post(`/paypal/capture-order/${orderId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
};

export { 
  authService, 
  userService, 
  orderService, 
  songService, 
  newsletterService, 
  adminService,
  helpdeskService,
  adminHelpdeskService,
  paymentService,
  affiliateService,
  adminAffiliateService
};

export default api;