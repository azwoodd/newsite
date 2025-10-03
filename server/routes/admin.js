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

// Affiliate management routes
// @route   GET api/admin/affiliates
// @desc    Get all affiliates
// @access  Admin
router.get('/affiliates', async (req, res) => {
  try {
    const { pool } = require('../config/db');
    const [affiliates] = await pool.query(`
      SELECT 
        a.*,
        u.name as user_name,
        u.email as user_email,
        pc.code as promo_code,
        COUNT(DISTINCT c.id) as total_commissions,
        COALESCE(SUM(c.amount), 0) as total_earned
      FROM affiliates a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id
      LEFT JOIN commissions c ON c.affiliate_id = a.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);
    
    res.json({ success: true, affiliates });
  } catch (error) {
    console.error('Error fetching affiliates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch affiliates' });
  }
});

// @route   PUT api/admin/affiliates/:id/approve
// @desc    Approve an affiliate application
// @access  Admin
router.put('/affiliates/:id/approve', async (req, res) => {
  try {
    const { pool } = require('../config/db');
    await pool.query(
      'UPDATE affiliates SET status = ?, updated_at = NOW() WHERE id = ?',
      ['approved', req.params.id]
    );
    
    res.json({ success: true, message: 'Affiliate approved successfully' });
  } catch (error) {
    console.error('Error approving affiliate:', error);
    res.status(500).json({ success: false, message: 'Failed to approve affiliate' });
  }
});

// @route   PUT api/admin/affiliates/:id/reject
// @desc    Reject an affiliate application
// @access  Admin
router.put('/affiliates/:id/reject', async (req, res) => {
  try {
    const { pool } = require('../config/db');
    await pool.query(
      'UPDATE affiliates SET status = ?, updated_at = NOW() WHERE id = ?',
      ['rejected', req.params.id]
    );
    
    res.json({ success: true, message: 'Affiliate rejected' });
  } catch (error) {
    console.error('Error rejecting affiliate:', error);
    res.status(500).json({ success: false, message: 'Failed to reject affiliate' });
  }
});

// @route   GET api/admin/promo-codes
// @desc    Get all promo codes
// @access  Admin
router.get('/promo-codes', async (req, res) => {
  try {
    const { pool } = require('../config/db');
    const [promoCodes] = await pool.query(`
      SELECT 
        pc.*,
        CASE 
          WHEN pc.affiliate_id IS NOT NULL THEN u.name
          ELSE 'Admin Created'
        END as created_by_name,
        COALESCE(usage_count, 0) as total_uses
      FROM promo_codes pc
      LEFT JOIN affiliates a ON pc.affiliate_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN (
        SELECT code_id, COUNT(*) as usage_count
        FROM promo_code_usage
        GROUP BY code_id
      ) usage ON usage.code_id = pc.id
      ORDER BY pc.created_at DESC
    `);
    
    res.json({ success: true, promoCodes });
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch promo codes' });
  }
});

// ... existing code ...
