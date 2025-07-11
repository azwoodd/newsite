const express = require('express');
const router = express.Router();
const newsletterController = require('../controllers/newsletterController');

// @route   POST api/newsletter/subscribe
// @desc    Subscribe to newsletter
// @access  Public
router.post('/subscribe', newsletterController.subscribe);

// @route   POST api/newsletter/unsubscribe
// @desc    Unsubscribe from newsletter
// @access  Public
router.post('/unsubscribe', newsletterController.unsubscribe);

module.exports = router;