import axios from 'axios';

// Create a dedicated admin helpdesk axios instance with proper authentication
const adminHelpdeskApi = axios.create({
  baseURL: '/api/helpdesk/admin',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to ensure token is included in every request
adminHelpdeskApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.error('No auth token found for admin helpdesk request');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for handling errors
adminHelpdeskApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle specific error codes
      if (error.response.status === 401) {
        console.error('Authentication error in admin helpdesk service:', error.response.data);
        // You could trigger a logout or redirect to login here
      } else if (error.response.status === 403) {
        console.error('Authorization error in admin helpdesk service - not an admin');
      }
    }
    return Promise.reject(error);
  }
);

// Admin Helpdesk service
const adminHelpdeskService = {
  // Get all tickets for admin
  getAllTickets: () => adminHelpdeskApi.get('/tickets'),
  
  // Get specific ticket details
  getTicketDetails: (ticketId) => adminHelpdeskApi.get(`/tickets/${ticketId}`),
  
  // Add admin reply to ticket
  addReply: (ticketId, message) => adminHelpdeskApi.post(`/tickets/${ticketId}/messages`, { message }),
  
  // Update ticket status
  updateTicketStatus: (ticketId, status) => adminHelpdeskApi.put(`/tickets/${ticketId}/status`, { status }),
  
  // Assign ticket to admin
  assignTicket: (ticketId, assignedTo) => adminHelpdeskApi.put(`/tickets/${ticketId}/assign`, { assignedTo }),
  
  // Mark ticket messages as read
  markAsRead: (ticketId) => adminHelpdeskApi.put(`/tickets/${ticketId}/read`),
  
  // Update admin activity status
  updateActivity: () => {
    // Get token directly to log it for debugging
    const token = localStorage.getItem('token');
    console.log('Sending update activity request with token: ' + (token ? 'Token exists' : 'No token'));
    
    return adminHelpdeskApi.put('/update-activity');
  }
};

export default adminHelpdeskService;