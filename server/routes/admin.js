const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth');
const { uploadSong, uploadShowcaseFiles } = require('../middleware/upload');

// Apply admin authentication middleware to all routes
router.use(authenticateAdmin);

// Order management
// @route   GET api/admin/orders
// @desc    Get all orders
// @access  Admin
router.get('/orders', adminController.getAllOrders);

// @route   GET api/admin/orders/:id
// @desc    Get detailed order by ID
// @access  Admin
router.get('/orders/:id', adminController.getOrderDetails);

// @route   PUT api/admin/orders/:id/status
// @desc    Update order status with workflow management
// @access  Admin
router.put('/orders/:id/status', adminController.updateOrderStatus);

// @route   PUT api/admin/orders/:id/lyrics
// @desc    Update order lyrics
// @access  Admin
router.put('/orders/:id/lyrics', adminController.updateOrderLyrics);

// @route   PUT api/admin/orders/:id/revisions
// @desc    Update order revision settings
// @access  Admin
router.put('/orders/:id/revisions', adminController.updateOrderRevisions);

// @route   POST api/admin/orders/:id/songs
// @desc    Upload a song version
// @access  Admin
router.post('/orders/:id/songs', uploadSong, adminController.uploadSongVersion);

// @route   DELETE api/admin/orders/:orderId/songs/:songId
// @desc    Delete a song version
// @access  Admin
router.delete('/orders/:orderId/songs/:songId', adminController.deleteSongVersion);

// Newsletter management
// @route   GET api/admin/newsletter/signups
// @desc    Get all newsletter signups
// @access  Admin
router.get('/newsletter/signups', adminController.getNewsletterSignups);

// @route   GET api/admin/newsletter/export
// @desc    Export newsletter signups as CSV
// @access  Admin
router.get('/newsletter/export', adminController.exportNewsletterSignups);

// Showcase management
// @route   GET api/admin/showcase
// @desc    Get all showcase items
// @access  Admin
router.get('/showcase', adminController.getShowcaseItems);

// @route   POST api/admin/showcase
// @desc    Add a showcase item
// @access  Admin
router.post('/showcase', uploadShowcaseFiles, adminController.addShowcaseItem);

// @route   PUT api/admin/showcase/:id
// @desc    Update a showcase item
// @access  Admin
router.put('/showcase/:id', uploadShowcaseFiles, adminController.updateShowcaseItem);

// @route   DELETE api/admin/showcase/:id
// @desc    Delete a showcase item
// @access  Admin
router.delete('/showcase/:id', adminController.deleteShowcaseItem);

// @route   GET api/admin/orders/:id/revisions
// @desc    Get revision history for an order
// @access  Admin
router.get('/orders/:id/revisions', adminController.getOrderRevisionHistory);

// @route   POST api/admin/orders/:id/revisions/notes
// @desc    Add a revision note
// @access  Admin
router.post('/orders/:id/revisions/notes', adminController.addRevisionNote);

module.exports = router;