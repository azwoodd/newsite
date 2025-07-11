// server/debug-auth.js
const jwt = require('jsonwebtoken');

// This is a simple custom authentication middleware for debugging
exports.debugAuthMiddleware = (req, res, next) => {
  try {
    console.log('⭐ DEBUG AUTH START ⭐');
    console.log('URL:', req.method, req.originalUrl);
    
    // Check if Authorization header exists
    const authHeader = req.headers.authorization;
    console.log('Authorization header:', authHeader ? 'EXISTS' : 'MISSING');
    
    if (authHeader) {
      // Parse the token
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        console.log('Token format:', token.length > 20 ? 'VALID LENGTH' : 'TOO SHORT');
        
        try {
          // Try to decode the token using the JWT_SECRET
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          console.log('Token decoded successfully:', {
            userId: decoded.id,
            email: decoded.email,
            role: decoded.role
          });
          
          // Set user in request for downstream middleware
          req.user = decoded;
          console.log('⭐ DEBUG AUTH END - Token Valid ⭐');
          next();
          return;
        } catch (err) {
          console.error('Token verification failed:', err.message);
          // Don't return error yet, continue debugging
        }
      } else {
        console.log('Malformed Authorization header. Format should be: Bearer [token]');
      }
    }
    
    console.log('⭐ DEBUG AUTH END - Using Mock User ⭐');
    
    // For debugging purpose, let's bypass auth for now to see if the routes work
    console.log('🚨 BYPASSING AUTHENTICATION FOR DEBUGGING 🚨');
    // Provide a mock user
    req.user = {
      id: 2,  // Use your admin user ID
      name: 'Aaron Wood',
      email: 'meaz1234@gmail.com',
      role: 'admin'
    };
    next();
  } catch (error) {
    console.error('Debug authentication middleware error:', error);
    // Send a more detailed error for debugging
    res.status(500).json({
      success: false,
      message: 'Debug middleware error',
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
  }
};