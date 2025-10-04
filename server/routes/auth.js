// server/routes/auth.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const authController = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');

// Regular routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticateUser, authController.getCurrentUser);

// Handle the missing route that caused the earlier error
router.put('/change-password', authenticateUser, (req, res) => {
  // If there's no changePassword controller function, provide a simple implementation
  // or just return a "not implemented" response
  res.status(501).json({
    success: false,
    message: 'Password change functionality is not yet implemented'
  });
});

// Google OAuth Routes - carefully structured to match the original working implementation
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false 
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign(
      { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_dev',
      { expiresIn: process.env.JWT_EXPIRE || '1d' }
    );
    
    // Redirect to frontend with token
const redirectUrl = `${process.env.CLIENT_URL || 'https://songsculptors.com'}/auth/success?token=${token}`;    
    res.redirect(redirectUrl);
  }
);

module.exports = router;