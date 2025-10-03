// server/routes/webhooks.js
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Middleware to capture raw body for webhook signature verification
const rawBodyMiddleware = (req, res, next) => {
  if (req.get('content-type') === 'application/json') {
    req.rawBody = '';
    req.on('data', (chunk) => {
      req.rawBody += chunk;
    });
    req.on('end', () => {
      next();
    });
  } else {
    next();
  }
};

// Payment webhooks endpoint
// POST /api/webhooks/payments
router.post('/payments', rawBodyMiddleware, webhookController.handlePaymentWebhook);

module.exports = router;