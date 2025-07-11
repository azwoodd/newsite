const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateUser } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// @route   GET api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', userController.getUserProfile);

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', userController.updateUserProfile);

// @route   DELETE api/users/account
// @desc    Delete user account
// @access  Private
router.delete('/account', userController.deleteUserAccount);

module.exports = router;