const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateUser } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateUser);

// @route   POST api/orders
// @desc    Create a new order
// @access  Private
router.post('/', orderController.createOrder);

// @route   GET api/orders
// @desc    Get all orders for a user
// @access  Private
router.get('/', orderController.getUserOrders);

// @route   GET api/orders/:id
// @desc    Get a single order by ID
// @access  Private
router.get('/:id', orderController.getOrderById);

// @route   PUT api/orders/:id/status
// @desc    Update order status after payment
// @access  Private
router.put('/:id/status', orderController.updateOrderStatus);

// @route   PUT api/orders/:orderId/songs/:songId/select
// @desc    Select a song version
// @access  Private
router.put('/:orderId/songs/:songId/select', orderController.selectSongVersion);

// @route   PUT api/orders/:orderId/songs/:songId/download
// @desc    Download a song (mark as downloaded)
// @access  Private
router.put('/:orderId/songs/:songId/download', orderController.downloadSong);

// @route   PUT api/orders/:id/lyrics/approve
// @desc    Approve or request changes for lyrics
// @access  Private
router.put('/:id/lyrics/approve', orderController.approveLyrics);

// @route   PUT api/orders/:id/song/approve
// @desc    Approve or request changes for song
// @access  Private
router.put('/:id/song/approve', orderController.approveSong);

// @route   GET api/orders/:id/revisions
// @desc    Get revision history for an order
// @access  Private
router.get('/:id/revisions', orderController.getRevisionHistory);

module.exports = router;