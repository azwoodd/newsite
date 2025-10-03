// server/routes/checkout.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const checkoutController = require('../controllers/checkoutController');
const { authenticateUser, optionalAuth } = require('../middleware/auth');

// Rate limiting for checkout operations
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 checkout attempts per window
  message: 'Too many checkout attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user ? `user_${req.user.id}` : req.ip,
});

const promoLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 promo validations per window
  message: 'Too many promo code attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user ? `user_${req.user.id}` : req.ip,
});

// Apply promo code and get pricing breakdown
// POST /api/checkout/apply-promo
router.post('/apply-promo', promoLimiter, optionalAuth, checkoutController.applyPromo);

// Get checkout summary with pricing
// GET /api/checkout/summary
router.get('/summary', authenticateUser, checkoutController.getCheckoutSummary);

// Confirm checkout and process payment
// POST /api/checkout/confirm
router.post('/confirm', checkoutLimiter, authenticateUser, checkoutController.confirmCheckout);

module.exports = router;