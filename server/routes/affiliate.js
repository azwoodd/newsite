// server/routes/affiliate.js - CORRECTED VERSION
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import controllers with CORRECT function names
const { 
  getAffiliateStatus,
  submitApplication,
  getAffiliateDashboard,
  regenerateAffiliateCode,
  requestPayout,
  validatePromoCode,
  trackReferralEvent
} = require('../controllers/affiliateController');

const {
  getAllAffiliates,
  approveAffiliate,
  denyAffiliate,
  updateAffiliateSettings,
  getAllPromoCodes,
  createDiscountCode,
  updatePromoCode,
  getAffiliateAnalytics,
  getPayoutRequests,
  processPayout
} = require('../controllers/adminAffiliateController');

// Import middleware
const { authenticateUser, authenticateAdmin, optionalAuth } = require('../middleware/auth');

// Rate limiting configurations
const promoValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 promo validations per window
  message: 'Too many promo code validation attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user ? `user_${req.user.id}` : req.ip,
});

const applicationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // 3 applications per day
  message: 'Too many affiliate applications, please try again tomorrow.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user ? `user_${req.user.id}` : req.ip,
});

const codeRegenerationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1, // 1 regeneration per day
  message: 'Code regeneration is limited to once per day.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user ? `user_${req.user.id}` : req.ip,
});

const payoutRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1,
  message: 'Payout requests are limited to once per hour.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user ? `user_${req.user.id}` : req.ip,
});

// =============================================================================
// PUBLIC ROUTES (No authentication required)
// =============================================================================

// Validate promo code
router.post('/validate-code', promoValidationLimiter, optionalAuth, validatePromoCode);

// Track referral events (clicks, signups, purchases)
router.post('/track', optionalAuth, trackReferralEvent);

// Get affiliate link preview (for social sharing)
router.get('/link/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    // Lazy load the database to avoid circular dependencies
    const { pool } = require('../config/db');
    
    const [codeRows] = await pool.query(`
      SELECT 
        pc.code,
        pc.name,
        u.name as affiliate_name
      FROM promo_codes pc
      JOIN affiliates a ON pc.affiliate_id = a.id
      JOIN users u ON a.user_id = u.id
      WHERE pc.code = ?
        AND pc.type = 'affiliate' 
        AND pc.is_active = TRUE
    `, [code.toUpperCase()]);

    if (codeRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate link not found'
      });
    }

    const affiliate = codeRows[0];
    
    res.status(200).json({
      success: true,
      data: {
        code: affiliate.code,
        affiliate_name: affiliate.affiliate_name,
        message: `Get a discount on your custom song with ${affiliate.affiliate_name}'s code!`
      }
    });
    
  } catch (error) {
    console.error('Error getting link preview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load link preview'
    });
  }
});

// =============================================================================
// USER ROUTES (Require user authentication)
// =============================================================================

// Get current user's affiliate status
router.get('/status', authenticateUser, getAffiliateStatus);

// Submit affiliate application
router.post('/apply', authenticateUser, applicationLimiter, submitApplication);

// Get affiliate dashboard data
router.get('/dashboard', authenticateUser, getAffiliateDashboard);

// Regenerate affiliate code
router.post('/regenerate-code', authenticateUser, codeRegenerationLimiter, regenerateAffiliateCode);

// Request payout
router.post('/request-payout', authenticateUser, payoutRequestLimiter, requestPayout);

// Get user's referral history
router.get('/referrals', authenticateUser, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user.id;
    
    // Lazy load the database
    const { pool } = require('../config/db');
    
    // Get user's affiliate ID
    const [affiliateRows] = await pool.query(
      'SELECT id FROM affiliates WHERE user_id = ? AND status = "approved"',
      [userId]
    );

    if (affiliateRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate account not found'
      });
    }

    const affiliateId = affiliateRows[0].id;

    // Get referral events
    const [events] = await pool.query(`
      SELECT 
        re.*,
        pc.code,
        u.name as referred_user_name,
        o.order_number,
        o.package_type
      FROM referral_events re
      JOIN promo_codes pc ON re.code_id = pc.id
      LEFT JOIN users u ON re.user_id = u.id
      LEFT JOIN orders o ON re.order_id = o.id
      WHERE pc.affiliate_id = ?
      ORDER BY re.created_at DESC
      LIMIT ? OFFSET ?
    `, [affiliateId, parseInt(limit), offset]);

    // Get total count
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM referral_events re
      JOIN promo_codes pc ON re.code_id = pc.id
      WHERE pc.affiliate_id = ?
    `, [affiliateId]);

    res.status(200).json({
      success: true,
      data: {
        events,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(countResult[0].total / parseInt(limit)),
          total_items: countResult[0].total,
          items_per_page: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting referral history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// =============================================================================
// ADMIN ROUTES (Require admin authentication)
// =============================================================================

// Get all affiliates (admin)
router.get('/admin/affiliates', authenticateAdmin, getAllAffiliates);

// Approve affiliate application (admin)
router.post('/admin/affiliates/:affiliateId/approve', authenticateAdmin, approveAffiliate);

// Deny affiliate application (admin)
router.post('/admin/affiliates/:affiliateId/deny', authenticateAdmin, denyAffiliate);

// Update affiliate settings (admin)
router.put('/admin/affiliates/:affiliateId', authenticateAdmin, updateAffiliateSettings);

// Suspend/unsuspend affiliate (admin)
router.put('/admin/affiliates/:affiliateId/status', authenticateAdmin, async (req, res) => {
  try {
    const { affiliateId } = req.params;
    const { status } = req.body;
    
    if (!['approved', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved or suspended.'
      });
    }
    
    // Lazy load the database
    const { pool } = require('../config/db');
    
    await pool.query(
      'UPDATE affiliates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, affiliateId]
    );

    // Handle promo codes based on status
    if (status === 'suspended') {
      await pool.query(
        'UPDATE promo_codes SET is_active = FALSE WHERE affiliate_id = ? AND type = "affiliate"',
        [affiliateId]
      );
    } else if (status === 'approved') {
      await pool.query(
        'UPDATE promo_codes SET is_active = TRUE WHERE affiliate_id = ? AND type = "affiliate"',
        [affiliateId]
      );
    }

    res.status(200).json({
      success: true,
      message: `Affiliate ${status === 'suspended' ? 'suspended' : 'reactivated'} successfully`
    });
    
  } catch (error) {
    console.error('Error updating affiliate status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update affiliate status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all promo codes (admin)
router.get('/admin/promo-codes', authenticateAdmin, getAllPromoCodes);

// Create discount code (admin)
router.post('/admin/promo-codes', authenticateAdmin, createDiscountCode);

// Update promo code (admin)
router.put('/admin/promo-codes/:codeId', authenticateAdmin, updatePromoCode);

// Delete/deactivate promo code (admin)
router.delete('/admin/promo-codes/:codeId', authenticateAdmin, async (req, res) => {
  try {
    const { codeId } = req.params;
    
    const { pool } = require('../config/db');
    
    // Soft delete by deactivating
    const [result] = await pool.query(
      'UPDATE promo_codes SET is_active = FALSE WHERE id = ?',
      [codeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Promo code deactivated successfully'
    });
    
  } catch (error) {
    console.error('Error deactivating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate promo code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get affiliate analytics (admin)
router.get('/admin/analytics', authenticateAdmin, getAffiliateAnalytics);

// Get payout requests (admin)
router.get('/admin/payouts', authenticateAdmin, getPayoutRequests);

// Process payout (admin)
router.post('/admin/payouts/:payoutId/process', authenticateAdmin, processPayout);

// Get affiliate performance overview (admin)
router.get('/admin/performance', authenticateAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const { pool } = require('../config/db');
    
    // Get overall affiliate program stats
    const [overallStats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT a.id) as total_affiliates,
        COUNT(DISTINCT CASE WHEN a.status = 'approved' THEN a.id END) as active_affiliates,
        COUNT(DISTINCT CASE WHEN a.status = 'pending' THEN a.id END) as pending_applications,
        SUM(a.balance) as total_unpaid_balance,
        SUM(a.total_paid) as total_paid_out
      FROM affiliates a
      WHERE 1=1
      ${startDate ? 'AND DATE(a.created_at) >= ?' : ''}
      ${endDate ? 'AND DATE(a.created_at) <= ?' : ''}
    `, [startDate, endDate].filter(Boolean));

    // Get top performing affiliates
    const [topAffiliates] = await pool.query(`
      SELECT 
        a.id,
        u.name as affiliate_name,
        a.commission_rate,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_price) as total_revenue,
        SUM(c.amount) as total_commissions,
        pc.code as affiliate_code
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN orders o ON o.referring_affiliate_id = a.id
      LEFT JOIN commissions c ON c.affiliate_id = a.id
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id AND pc.type = 'affiliate'
      WHERE a.status = 'approved'
      GROUP BY a.id, u.name, a.commission_rate, pc.code
      ORDER BY total_revenue DESC
      LIMIT 10
    `);

    // Get conversion funnel data
    const [funnelData] = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN event_type = 'click' THEN session_id END) as total_clicks,
        COUNT(DISTINCT CASE WHEN event_type = 'signup' THEN user_id END) as total_signups,
        COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN order_id END) as total_purchases,
        SUM(CASE WHEN event_type = 'purchase' THEN conversion_value ELSE 0 END) as total_value
      FROM referral_events
      WHERE 1=1
      ${startDate ? 'AND DATE(created_at) >= ?' : ''}
      ${endDate ? 'AND DATE(created_at) <= ?' : ''}
    `, [startDate, endDate].filter(Boolean));

    res.status(200).json({
      success: true,
      data: {
        overview: overallStats[0],
        top_affiliates: topAffiliates,
        funnel: funnelData[0],
        date_range: {
          start: startDate || 'all time',
          end: endDate || 'present'
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting affiliate analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;