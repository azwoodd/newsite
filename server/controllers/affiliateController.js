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
      content_platforms,
      audience_info,
      promotion_strategy,
      portfolio_links
    } = req.body;

    // Validation
    if (!content_platforms || !audience_info || !promotion_strategy) {
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
      
      if (affiliate.status === 'suspended') {
        return res.status(400).json({
          success: false,
          message: 'Your affiliate account is suspended. Please contact support.'
        });
      }
      
      if (affiliate.status === 'denied') {
        if (affiliate.next_allowed_application_date && 
            new Date() < new Date(affiliate.next_allowed_application_date)) {
          return res.status(400).json({
            success: false,
            message: `You can reapply after ${new Date(affiliate.next_allowed_application_date).toLocaleDateString()}`
          });
        }
      }
    }

    // Create or update affiliate application
    if (existingAffiliate.length > 0) {
      // Update existing application (reapplying)
      await connection.query(`
        UPDATE affiliates SET 
          status = 'pending',
          content_platforms = ?,
          audience_info = ?,
          promotion_strategy = ?,
          portfolio_links = ?,
          application_date = CURRENT_TIMESTAMP,
          denial_date = NULL,
          denial_reason = NULL,
          next_allowed_application_date = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [
        JSON.stringify(content_platforms),
        audience_info,
        promotion_strategy,
        portfolio_links || null,
        userId
      ]);
    } else {
      // Create new application
      await connection.query(`
        INSERT INTO affiliates (
          user_id, status, application_date,
          content_platforms, audience_info, promotion_strategy, portfolio_links,
          commission_rate, payout_threshold
        ) VALUES (?, 'pending', CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        JSON.stringify(content_platforms),
        audience_info,
        promotion_strategy,
        portfolio_links || null,
        DEFAULT_COMMISSION_RATE,
        MIN_PAYOUT_THRESHOLD
      ]);
    }

    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: 'Application submitted successfully! We will review it within 2-3 business days.'
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
        COUNT(DISTINCT CASE WHEN re.event_type = 'signup' THEN re.user_id END) as total_signups,
        COUNT(DISTINCT CASE WHEN re.event_type = 'purchase' THEN re.order_id END) as total_conversions
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
        u.name as referred_user_name
      FROM referral_events re
      JOIN promo_codes pc ON re.code_id = pc.id
      LEFT JOIN users u ON re.user_id = u.id
      WHERE pc.affiliate_id = ?
      ORDER BY re.created_at DESC
      LIMIT 20
    `, [affiliate.id]);

    // Calculate conversion rate
    const conversionRate = stats.total_clicks > 0 
      ? Math.round((stats.total_conversions / stats.total_clicks) * 10000) / 100 
      : 0;

    // Check if can request payout
    const canRequestPayout = affiliate.balance >= affiliate.payout_threshold;

    res.status(200).json({
      success: true,
      data: {
        affiliate: {
          id: affiliate.id,
          user_id: affiliate.user_id,
          status: affiliate.status,
          affiliate_code: affiliate.affiliate_code,
          commission_rate: affiliate.commission_rate,
          balance: affiliate.balance,
          total_paid: affiliate.total_paid,
          payout_threshold: affiliate.payout_threshold,
          last_payout_date: affiliate.last_payout_date,
          created_at: affiliate.created_at
        },
        stats: {
          ...stats,
          conversion_rate: conversionRate,
          can_request_payout: canRequestPayout
        },
        recent_commissions: recentCommissions,
        recent_events: recentEvents
      }
    });
    
  } catch (error) {
    console.error('Error getting affiliate dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
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
    const [affiliateRows] = await connection.query(`
      SELECT a.*, pc.last_regenerated 
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
    
    // Check regeneration cooldown
    if (affiliate.last_regenerated) {
      const hoursSinceLastRegen = (Date.now() - new Date(affiliate.last_regenerated).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastRegen < CODE_REGENERATION_COOLDOWN_HOURS) {
        const hoursRemaining = Math.ceil(CODE_REGENERATION_COOLDOWN_HOURS - hoursSinceLastRegen);
        return res.status(400).json({
          success: false,
          message: `You can regenerate your code in ${hoursRemaining} hours`
        });
      }
    }

    // Generate new unique code
    let newCode;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      newCode = generateAffiliateCode();
      const [existingCode] = await connection.query(
        'SELECT id FROM promo_codes WHERE code = ?',
        [newCode]
      );
      
      if (existingCode.length === 0) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique code');
    }

    // Update the promo code
    await connection.query(`
      UPDATE promo_codes SET 
        code = ?,
        last_regenerated = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE affiliate_id = ? AND type = 'affiliate'
    `, [newCode, affiliate.id]);

    // Update user's affiliate_code
    await connection.query(
      'UPDATE users SET affiliate_code = ? WHERE id = ?',
      [newCode, userId]
    );

    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: 'Affiliate code regenerated successfully',
      data: {
        new_code: newCode
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error regenerating affiliate code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate code',
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
    const { amount } = req.body;
    
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
    
    // Validate payout amount
    const payoutAmount = amount || affiliate.balance;
    
    if (payoutAmount < affiliate.payout_threshold) {
      return res.status(400).json({
        success: false,
        message: `Minimum payout amount is $${affiliate.payout_threshold}`
      });
    }

    if (payoutAmount > affiliate.balance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Your current balance is $${affiliate.balance}`
      });
    }

    // Get eligible commissions
    const eligibleDate = new Date();
    eligibleDate.setDate(eligibleDate.getDate() - COMMISSION_HOLDING_DAYS);
    
    const [commissions] = await connection.query(`
      SELECT id, amount 
      FROM commissions 
      WHERE affiliate_id = ? 
        AND status = 'pending' 
        AND created_at <= ?
      ORDER BY created_at ASC
    `, [affiliate.id, eligibleDate]);

    let totalAmount = 0;
    const commissionIds = [];
    
    for (const commission of commissions) {
      if (totalAmount + commission.amount <= payoutAmount) {
        totalAmount += commission.amount;
        commissionIds.push(commission.id);
      } else {
        break;
      }
    }

    if (totalAmount < affiliate.payout_threshold) {
      return res.status(400).json({
        success: false,
        message: 'Not enough eligible commissions for payout'
      });
    }

    // Create payout request
    const [payoutResult] = await connection.query(`
      INSERT INTO affiliate_payouts (
        affiliate_id, amount, commission_count, commission_ids, 
        status, created_at
      ) VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `, [
      affiliate.id,
      totalAmount,
      commissionIds.length,
      JSON.stringify(commissionIds)
    ]);

    // Update commission statuses
    if (commissionIds.length > 0) {
      await connection.query(
        'UPDATE commissions SET payout_id = ? WHERE id IN (?)',
        [payoutResult.insertId, commissionIds]
      );
    }

    // Update affiliate balance
    await connection.query(
      'UPDATE affiliates SET balance = balance - ? WHERE id = ?',
      [totalAmount, affiliate.id]
    );

    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: `Payout request of $${totalAmount.toFixed(2)} submitted successfully`,
      data: {
        payout_id: payoutResult.insertId,
        amount: totalAmount,
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
        a.user_id as affiliate_user_id,
        a.id as affiliate_id
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

    // Prevent self-referral for affiliate codes
    if (promoCode.type === 'affiliate' && userId && promoCode.affiliate_user_id === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot use your own affiliate code'
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (promoCode.is_percentage) {
      discountAmount = Math.round((orderTotal * promoCode.discount_amount / 100) * 100) / 100;
    } else {
      discountAmount = Math.min(promoCode.discount_amount, orderTotal);
    }

    res.status(200).json({
      success: true,
      data: {
        code: promoCode.code,
        name: promoCode.name,
        type: promoCode.type,
        discount_amount: discountAmount,
        is_percentage: promoCode.is_percentage,
        percentage: promoCode.is_percentage ? promoCode.discount_amount : null,
        final_price: Math.max(0, orderTotal - discountAmount),
        affiliate_id: promoCode.affiliate_id,
        code_id: promoCode.id
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

// Track referral events (clicks, signups, purchases)
const trackReferralEvent = async (req, res) => {
  try {
    const { code, eventType, orderId, sessionId } = req.body;
    const userId = req.user?.id;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    if (!code || !eventType) {
      return res.status(400).json({
        success: false,
        message: 'Code and event type are required'
      });
    }

    const validEventTypes = ['click', 'signup', 'purchase'];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event type'
      });
    }

    // Get promo code info
    const [codeRows] = await pool.query(
      'SELECT id, affiliate_id FROM promo_codes WHERE code = ? AND type = "affiliate"',
      [code.toUpperCase()]
    );

    if (codeRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate code not found'
      });
    }

    const promoCode = codeRows[0];

    // Get conversion value if it's a purchase event
    let conversionValue = 0;
    if (eventType === 'purchase' && orderId) {
      const [orderRows] = await pool.query(
        'SELECT total_price FROM orders WHERE id = ?',
        [orderId]
      );
      
      if (orderRows.length > 0) {
        conversionValue = orderRows[0].total_price;
      }
    }

    // Track the event
    await pool.query(`
      INSERT INTO referral_events (
        code_id, event_type, user_id, order_id, 
        session_id, ip_address, user_agent, conversion_value
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      promoCode.id,
      eventType,
      userId || null,
      orderId || null,
      sessionId || null,
      ipAddress,
      userAgent,
      conversionValue
    ]);

    res.status(200).json({
      success: true,
      message: 'Event tracked successfully'
    });
    
  } catch (error) {
    console.error('Error tracking referral event:', error);
    // Don't throw error for tracking - shouldn't break user experience
    res.status(200).json({
      success: false,
      message: 'Failed to track event'
    });
  }
};

// Helper function to process commission after order creation
const processCommission = async (orderId, promoCodeData) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    if (!promoCodeData || promoCodeData.type !== 'affiliate') {
      return;
    }

    const { order_id, order_total, promo_code, commission_rate, affiliate_id } = promoCodeData;
    
    // Calculate commission
    const commissionAmount = calculateCommission(order_total, commission_rate);
    
    // Create commission record
    await connection.query(`
      INSERT INTO commissions (
        affiliate_id, order_id, code_id, 
        order_amount, commission_rate, amount, 
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `, [
      affiliate_id,
      order_id,
      promo_code.id,
      order_total,
      commission_rate,
      commissionAmount
    ]);

    // Update affiliate balance
    await connection.query(
      'UPDATE affiliates SET balance = balance + ? WHERE id = ?',
      [commissionAmount, affiliate_id]
    );

    await connection.commit();
    console.log(`Commission of $${commissionAmount} processed for affiliate ${affiliate_id}`);
    
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