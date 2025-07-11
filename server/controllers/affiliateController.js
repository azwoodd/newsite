// server/controllers/affiliateController.js
const { pool } = require('../config/db');
const crypto = require('crypto');

// Constants
const DEFAULT_COMMISSION_RATE = 10.00;
const MIN_PAYOUT_THRESHOLD = 50.00;
const COMMISSION_HOLDING_DAYS = 14;
const REAPPLICATION_COOLDOWN_DAYS = 30;
const CODE_REGENERATION_COOLDOWN_HOURS = 24;
const AFFILIATE_COOKIE_DAYS = 30;

// Helper function to generate affiliate code
const generateAffiliateCode = () => {
  const prefix = 'SONG';
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}${random}`;
};

// Helper function to calculate commission
const calculateCommission = (orderTotal, commissionRate) => {
  return Math.round((orderTotal * commissionRate / 100) * 100) / 100;
};

// Get current user's affiliate status
const getAffiliateStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [affiliateRows] = await pool.query(`
      SELECT 
        a.*,
        pc.code as affiliate_code,
        u.name as user_name,
        u.email as user_email
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id AND pc.type = 'affiliate'
      WHERE a.user_id = ?
    `, [userId]);

    if (affiliateRows.length === 0) {
      return res.status(200).json({
        success: true,
        data: { 
          isAffiliate: false, 
          canApply: true,
          status: null 
        }
      });
    }

    const affiliate = affiliateRows[0];
    
    // Check if user can reapply (if previously denied)
    let canApply = false;
    if (affiliate.status === 'denied' && affiliate.next_allowed_application_date) {
      canApply = new Date() >= new Date(affiliate.next_allowed_application_date);
    }

    res.status(200).json({
      success: true,
      data: {
        isAffiliate: true,
        canApply,
        ...affiliate
      }
    });
  } catch (error) {
    console.error('Error getting affiliate status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get affiliate status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Submit affiliate application
const submitApplication = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const userId = req.user.id;
    const {
      contentPlatforms,
      audienceInfo,
      promotionStrategy,
      portfolioLinks
    } = req.body;

    // Validation
    if (!contentPlatforms || !audienceInfo || !promotionStrategy) {
      return res.status(400).json({
        success: false,
        message: 'Content platforms, audience info, and promotion strategy are required'
      });
    }

    // Check if user already has an affiliate account
    const [existingAffiliate] = await connection.query(
      'SELECT * FROM affiliates WHERE user_id = ?',
      [userId]
    );

    if (existingAffiliate.length > 0) {
      const affiliate = existingAffiliate[0];
      
      if (affiliate.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'You already have a pending application'
        });
      }
      
      if (affiliate.status === 'approved') {
        return res.status(400).json({
          success: false,
          message: 'You are already an approved affiliate'
        });
      }
      
      if (affiliate.status === 'denied') {
        // Check if cooldown period has passed
        if (affiliate.next_allowed_application_date && 
            new Date() < new Date(affiliate.next_allowed_application_date)) {
          return res.status(400).json({
            success: false,
            message: 'You must wait before reapplying. Next application allowed on: ' + 
                    new Date(affiliate.next_allowed_application_date).toLocaleDateString()
          });
        }
        
        // Update existing denied application
        await connection.query(`
          UPDATE affiliates SET 
            status = 'pending',
            application_date = CURRENT_TIMESTAMP,
            denial_date = NULL,
            denial_reason = NULL,
            next_allowed_application_date = NULL,
            content_platforms = ?,
            audience_info = ?,
            promotion_strategy = ?,
            portfolio_links = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [
          JSON.stringify(contentPlatforms),
          audienceInfo,
          promotionStrategy,
          portfolioLinks || null,
          userId
        ]);
      }
    } else {
      // Create new affiliate application
      await connection.query(`
        INSERT INTO affiliates (
          user_id, status, content_platforms, audience_info, 
          promotion_strategy, portfolio_links, commission_rate
        ) VALUES (?, 'pending', ?, ?, ?, ?, ?)
      `, [
        userId,
        JSON.stringify(contentPlatforms),
        audienceInfo,
        promotionStrategy,
        portfolioLinks || null,
        DEFAULT_COMMISSION_RATE
      ]);
    }

    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: 'Your affiliate application has been submitted successfully! We will review it within 2-3 business days.'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error submitting affiliate application:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

// Get affiliate dashboard data
const getAffiliateDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get affiliate info with code
    const [affiliateRows] = await pool.query(`
      SELECT 
        a.*,
        pc.code as affiliate_code,
        pc.id as code_id
      FROM affiliates a
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id AND pc.type = 'affiliate'
      WHERE a.user_id = ? AND a.status = 'approved'
    `, [userId]);

    if (affiliateRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate account not found or not approved'
      });
    }

    const affiliate = affiliateRows[0];

    // Get statistics
    const [statsRows] = await pool.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_commissions,
        COUNT(DISTINCT CASE WHEN c.status = 'paid' THEN c.id END) as paid_commissions,
        COUNT(DISTINCT CASE WHEN c.status = 'pending' THEN c.id END) as pending_commissions,
        SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) as total_earnings,
        SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END) as pending_earnings,
        COUNT(DISTINCT re.id) as total_clicks,
        COUNT(DISTINCT CASE WHEN re.event_type = 'signup' THEN re.id END) as total_signups,
        COUNT(DISTINCT CASE WHEN re.event_type = 'purchase' THEN re.id END) as total_conversions
      FROM affiliates a
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id AND pc.type = 'affiliate'
      LEFT JOIN commissions c ON c.affiliate_id = a.id
      LEFT JOIN referral_events re ON re.code_id = pc.id
      WHERE a.id = ?
      GROUP BY a.id
    `, [affiliate.id]);

    const stats = statsRows[0] || {
      total_commissions: 0,
      paid_commissions: 0,
      pending_commissions: 0,
      total_earnings: 0,
      pending_earnings: 0,
      total_clicks: 0,
      total_signups: 0,
      total_conversions: 0
    };

    // Get recent commissions
    const [recentCommissions] = await pool.query(`
      SELECT 
        c.*,
        o.order_number,
        o.package_type,
        o.created_at as order_date,
        u.name as customer_name
      FROM commissions c
      JOIN orders o ON c.order_id = o.id
      JOIN users u ON o.user_id = u.id
      WHERE c.affiliate_id = ?
      ORDER BY c.created_at DESC
      LIMIT 10
    `, [affiliate.id]);

    // Get recent referral events
    const [recentEvents] = await pool.query(`
      SELECT 
        re.*,
        pc.code
      FROM referral_events re
      JOIN promo_codes pc ON re.code_id = pc.id
      WHERE pc.affiliate_id = ?
      ORDER BY re.created_at DESC
      LIMIT 20
    `, [affiliate.id]);

    // Calculate conversion rate
    const conversionRate = stats.total_clicks > 0 
      ? Math.round((stats.total_conversions / stats.total_clicks) * 10000) / 100 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        affiliate,
        stats: {
          ...stats,
          conversion_rate: conversionRate,
          can_request_payout: parseFloat(affiliate.balance) >= MIN_PAYOUT_THRESHOLD
        },
        recent_commissions: recentCommissions,
        recent_events: recentEvents
      }
    });
    
  } catch (error) {
    console.error('Error getting affiliate dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Regenerate affiliate code
const regenerateAffiliateCode = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const userId = req.user.id;
    
    // Get affiliate info
    const [affiliateRows] = await connection.query(
      'SELECT * FROM affiliates WHERE user_id = ? AND status = "approved"',
      [userId]
    );

    if (affiliateRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate account not found or not approved'
      });
    }

    const affiliate = affiliateRows[0];

    // Check if user has regenerated code recently (24 hour cooldown)
    const [existingCode] = await connection.query(
      'SELECT * FROM promo_codes WHERE affiliate_id = ? AND type = "affiliate"',
      [affiliate.id]
    );

    if (existingCode.length > 0) {
      const lastUpdated = new Date(existingCode[0].created_at);
      const cooldownEnd = new Date(lastUpdated.getTime() + (CODE_REGENERATION_COOLDOWN_HOURS * 60 * 60 * 1000));
      
      if (new Date() < cooldownEnd) {
        return res.status(400).json({
          success: false,
          message: `Code regeneration is limited to once per 24 hours. Try again after ${cooldownEnd.toLocaleString()}`
        });
      }

      // Deactivate old code
      await connection.query(
        'UPDATE promo_codes SET is_active = FALSE WHERE affiliate_id = ? AND type = "affiliate"',
        [affiliate.id]
      );
    }

    // Generate new unique code
    let newCode;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      newCode = generateAffiliateCode();
      const [existingCodeCheck] = await connection.query(
        'SELECT id FROM promo_codes WHERE code = ?',
        [newCode]
      );
      
      if (existingCodeCheck.length === 0) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate unique code. Please try again.'
      });
    }

    // Create new affiliate code
    await connection.query(`
      INSERT INTO promo_codes (
        code, name, type, affiliate_id, created_by, 
        discount_amount, is_percentage, is_active
      ) VALUES (?, ?, 'affiliate', ?, ?, ?, TRUE, TRUE)
    `, [
      newCode,
      `${req.user.name}'s Affiliate Code`,
      affiliate.id,
      userId,
      affiliate.commission_rate
    ]);

    // Update user's affiliate_code
    await connection.query(
      'UPDATE users SET affiliate_code = ? WHERE id = ?',
      [newCode, userId]
    );

    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: 'Affiliate code regenerated successfully',
      data: { code: newCode }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error regenerating affiliate code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate affiliate code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

// Request payout
const requestPayout = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const userId = req.user.id;
    
    // Get affiliate info
    const [affiliateRows] = await connection.query(
      'SELECT * FROM affiliates WHERE user_id = ? AND status = "approved"',
      [userId]
    );

    if (affiliateRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate account not found or not approved'
      });
    }

    const affiliate = affiliateRows[0];

    // Check minimum payout threshold
    if (parseFloat(affiliate.balance) < MIN_PAYOUT_THRESHOLD) {
      return res.status(400).json({
        success: false,
        message: `Minimum payout threshold is $${MIN_PAYOUT_THRESHOLD}. Your current balance is $${affiliate.balance}`
      });
    }

    // Check if there's already a pending payout
    const [pendingPayouts] = await connection.query(
      'SELECT * FROM affiliate_payouts WHERE affiliate_id = ? AND status IN ("pending", "processing")',
      [affiliate.id]
    );

    if (pendingPayouts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending payout request'
      });
    }

    // Get eligible commissions (approved and past holding period)
    const [eligibleCommissions] = await connection.query(`
      SELECT * FROM commissions 
      WHERE affiliate_id = ? 
        AND status = 'approved' 
        AND eligible_for_payout_date <= CURRENT_TIMESTAMP
      ORDER BY created_at ASC
    `, [affiliate.id]);

    if (eligibleCommissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No eligible commissions for payout'
      });
    }

    const payoutAmount = eligibleCommissions.reduce((sum, commission) => {
      return sum + parseFloat(commission.amount);
    }, 0);

    const commissionIds = eligibleCommissions.map(c => c.id);

    // Create payout request
    await connection.query(`
      INSERT INTO affiliate_payouts (
        affiliate_id, amount, commission_ids, commission_count, status
      ) VALUES (?, ?, ?, ?, 'pending')
    `, [
      affiliate.id,
      payoutAmount,
      JSON.stringify(commissionIds),
      commissionIds.length
    ]);

    // Update commission statuses to 'paid' (they'll be marked as paid when payout completes)
    await connection.query(
      'UPDATE commissions SET status = "paid", paid_at = CURRENT_TIMESTAMP WHERE id IN (?)',
      [commissionIds]
    );

    // Update affiliate balance
    await connection.query(
      'UPDATE affiliates SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [payoutAmount, affiliate.id]
    );

    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: `Payout request of $${payoutAmount.toFixed(2)} submitted successfully`,
      data: {
        amount: payoutAmount,
        commission_count: commissionIds.length
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error requesting payout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request payout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

// Validate and apply promo code (public endpoint)
const validatePromoCode = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    const userId = req.user?.id; // Optional for logged-in users

    if (!code || !orderTotal) {
      return res.status(400).json({
        success: false,
        message: 'Code and order total are required'
      });
    }

    // Get promo code details
    const [codeRows] = await pool.query(`
      SELECT 
        pc.*,
        a.commission_rate,
        a.user_id as affiliate_user_id
      FROM promo_codes pc
      LEFT JOIN affiliates a ON pc.affiliate_id = a.id
      WHERE pc.code = ? AND pc.is_active = TRUE
    `, [code.toUpperCase()]);

    if (codeRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive promo code'
      });
    }

    const promoCode = codeRows[0];

    // Check if code has expired
    if (promoCode.expires_at && new Date() > new Date(promoCode.expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'This promo code has expired'
      });
    }

    // Check if code hasn't started yet
    if (promoCode.starts_at && new Date() < new Date(promoCode.starts_at)) {
      return res.status(400).json({
        success: false,
        message: 'This promo code is not yet active'
      });
    }

    // Check usage limits
    if (promoCode.max_uses > 0 && promoCode.current_uses >= promoCode.max_uses) {
      return res.status(400).json({
        success: false,
        message: 'This promo code has reached its usage limit'
      });
    }

    // Check per-user limits (if user is logged in)
    if (userId && promoCode.max_uses_per_user > 0) {
      const [userUsage] = await pool.query(
        'SELECT COUNT(*) as usage_count FROM promo_code_usage WHERE code_id = ? AND user_id = ?',
        [promoCode.id, userId]
      );
      
      if (userUsage[0].usage_count >= promoCode.max_uses_per_user) {
        return res.status(400).json({
          success: false,
          message: 'You have already used this promo code the maximum number of times'
        });
      }
    }

    // Calculate discount
    let discountAmount;
    if (promoCode.is_percentage) {
      discountAmount = Math.round((orderTotal * promoCode.discount_amount / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(promoCode.discount_amount, orderTotal);
    }

    // Calculate final total
    const finalTotal = Math.max(0, orderTotal - discountAmount);

    res.status(200).json({
      success: true,
      message: 'Promo code applied successfully',
      data: {
        code: promoCode.code,
        name: promoCode.name,
        type: promoCode.type,
        discount_amount: discountAmount,
        original_total: orderTotal,
        final_total: finalTotal,
        is_percentage: promoCode.is_percentage,
        code_id: promoCode.id,
        affiliate_id: promoCode.affiliate_id
      }
    });
    
  } catch (error) {
    console.error('Error validating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate promo code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Track referral event (clicks, signups, purchases)
const trackReferralEvent = async (req, res) => {
  try {
    const { code, eventType, orderId, sessionId } = req.body;
    const userId = req.user?.id;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const referrer = req.get('Referrer');

    if (!code || !eventType) {
      return res.status(400).json({
        success: false,
        message: 'Code and event type are required'
      });
    }

    // Get code ID
    const [codeRows] = await pool.query(
      'SELECT id FROM promo_codes WHERE code = ? AND is_active = TRUE',
      [code.toUpperCase()]
    );

    if (codeRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid promo code'
      });
    }

    const codeId = codeRows[0].id;

    // For purchase events, get order total
    let conversionValue = null;
    if (eventType === 'purchase' && orderId) {
      const [orderRows] = await pool.query(
        'SELECT total_price FROM orders WHERE id = ?',
        [orderId]
      );
      
      if (orderRows.length > 0) {
        conversionValue = orderRows[0].total_price;
      }
    }

    // Insert referral event
    await pool.query(`
      INSERT INTO referral_events (
        code_id, user_id, ip_address, user_agent, referrer_url,
        event_type, order_id, session_id, conversion_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      codeId,
      userId || null,
      ipAddress,
      userAgent || null,
      referrer || null,
      eventType,
      orderId || null,
      sessionId || null,
      conversionValue
    ]);

    res.status(200).json({
      success: true,
      message: 'Event tracked successfully'
    });
    
  } catch (error) {
    console.error('Error tracking referral event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Process commission after order completion (internal function)
const processCommission = async (orderId, codeId) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get order details
    const [orderRows] = await connection.query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (orderRows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderRows[0];

    // Get promo code and affiliate details
    const [codeRows] = await connection.query(`
      SELECT 
        pc.*,
        a.id as affiliate_id,
        a.commission_rate,
        a.user_id as affiliate_user_id
      FROM promo_codes pc
      JOIN affiliates a ON pc.affiliate_id = a.id
      WHERE pc.id = ? AND pc.type = 'affiliate' AND a.status = 'approved'
    `, [codeId]);

    if (codeRows.length === 0) {
      throw new Error('Affiliate code not found or affiliate not approved');
    }

    const promoCode = codeRows[0];
    const commissionAmount = calculateCommission(order.total_price, promoCode.commission_rate);

    // Check if commission already exists
    const [existingCommission] = await connection.query(
      'SELECT id FROM commissions WHERE affiliate_id = ? AND order_id = ?',
      [promoCode.affiliate_id, orderId]
    );

    if (existingCommission.length > 0) {
      console.log('Commission already exists for this order');
      await connection.commit();
      return;
    }

    // Create commission record
    await connection.query(`
      INSERT INTO commissions (
        affiliate_id, order_id, code_id, amount, rate, order_total, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [
      promoCode.affiliate_id,
      orderId,
      codeId,
      commissionAmount,
      promoCode.commission_rate,
      order.total_price
    ]);

    // Update affiliate balance
    await connection.query(
      'UPDATE affiliates SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [commissionAmount, promoCode.affiliate_id]
    );

    await connection.commit();
    console.log(`Commission of $${commissionAmount} processed for affiliate ${promoCode.affiliate_id}`);
    
  } catch (error) {
    await connection.rollback();
    console.error('Error processing commission:', error);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  getAffiliateStatus,
  submitApplication,
  getAffiliateDashboard,
  regenerateAffiliateCode,
  requestPayout,
  validatePromoCode,
  trackReferralEvent,
  processCommission
};