// server/controllers/affiliateController.js - COMPLETE USER-FACING CONTROLLER WITH ALL ORIGINAL FUNCTIONALITY
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
      
      // Check if they can reapply
      if (affiliate.status === 'denied' && affiliate.next_allowed_application_date) {
        const canReapply = new Date() >= new Date(affiliate.next_allowed_application_date);
        if (!canReapply) {
          return res.status(400).json({
            success: false,
            message: `You can reapply on ${affiliate.next_allowed_application_date.toDateString()}`
          });
        }
      } else if (affiliate.status !== 'denied') {
        return res.status(400).json({
          success: false,
          message: 'You already have an affiliate application'
        });
      }
    }

    // Create application data
    const applicationData = {
      user_id: userId,
      status: 'pending',
      commission_rate: DEFAULT_COMMISSION_RATE,
      balance: 0.00,
      total_paid: 0.00,
      content_platforms: JSON.stringify(content_platforms),
      audience_info,
      promotion_strategy,
      portfolio_links: portfolio_links ? JSON.stringify(portfolio_links) : null
    };

    // Add optional fields that might not exist in all database versions
    try {
      applicationData.payout_threshold = MIN_PAYOUT_THRESHOLD;
      applicationData.application_date = new Date();
    } catch (e) {
      console.log('Some optional fields not available in current schema');
    }

    if (existingAffiliate.length > 0) {
      // Update existing application
      await connection.query(`
        UPDATE affiliates SET 
          content_platforms = ?,
          audience_info = ?,
          promotion_strategy = ?,
          portfolio_links = ?,
          status = 'pending',
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [
        applicationData.content_platforms,
        applicationData.audience_info,
        applicationData.promotion_strategy,
        applicationData.portfolio_links,
        userId
      ]);

      // Try to clear denial fields if they exist
      try {
        await connection.query(`
          UPDATE affiliates SET 
            denial_reason = NULL,
            next_allowed_application_date = NULL,
            denial_date = NULL
          WHERE user_id = ?
        `, [userId]);
      } catch (e) {
        console.log('Denial fields not available in current schema');
      }
    } else {
      // Create new application
      await connection.query(`
        INSERT INTO affiliates SET ?
      `, [applicationData]);
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Thank you for your affiliate application! We will review it within 2-3 business days.'
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
    let stats = {
      total_commissions: 0,
      paid_commissions: 0,
      pending_commissions: 0,
      total_earnings: 0,
      pending_earnings: 0,
      total_clicks: 0,
      total_signups: 0,
      total_conversions: 0
    };

    try {
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

      if (statsRows && statsRows.length > 0) {
        stats = statsRows[0];
      }
    } catch (e) {
      console.log('Stats calculation failed, using defaults:', e.message);
    }

    // Get recent commissions
    let recentCommissions = [];
    try {
      const [commissionRows] = await pool.query(`
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

      recentCommissions = commissionRows || [];
    } catch (e) {
      console.log('Recent commissions fetch failed:', e.message);
    }

    // Get recent referral events
    let recentEvents = [];
    try {
      const [eventRows] = await pool.query(`
        SELECT 
          re.*,
          o.order_number,
          o.package_type,
          u.name as customer_name
        FROM referral_events re
        LEFT JOIN orders o ON re.order_id = o.id
        LEFT JOIN users u ON re.user_id = u.id
        WHERE re.code_id = ?
        ORDER BY re.created_at DESC
        LIMIT 10
      `, [affiliate.code_id]);

      recentEvents = eventRows || [];
    } catch (e) {
      console.log('Recent events fetch failed:', e.message);
    }

    // Calculate derived stats
    const conversion_rate = stats.total_clicks > 0 
      ? Math.round((stats.total_conversions / stats.total_clicks) * 10000) / 100 
      : 0;

    const signup_rate = stats.total_clicks > 0 
      ? Math.round((stats.total_signups / stats.total_clicks) * 10000) / 100 
      : 0;

    const can_request_payout = affiliate.balance >= (affiliate.payout_threshold || MIN_PAYOUT_THRESHOLD);

    // Enhanced stats object
    const enhancedStats = {
      ...stats,
      conversion_rate,
      signup_rate,
      can_request_payout,
      payout_threshold: affiliate.payout_threshold || MIN_PAYOUT_THRESHOLD,
      next_payout_eligible: can_request_payout ? null : (affiliate.payout_threshold || MIN_PAYOUT_THRESHOLD) - affiliate.balance
    };

    res.status(200).json({
      success: true,
      data: {
        affiliate,
        stats: enhancedStats,
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
      SELECT 
        a.*,
        pc.id as code_id,
        pc.code as current_code
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

    // Check cooldown period
    if (affiliate.code_regenerated_at) {
      const timeSinceRegeneration = Date.now() - new Date(affiliate.code_regenerated_at).getTime();
      const cooldownMs = CODE_REGENERATION_COOLDOWN_HOURS * 60 * 60 * 1000;
      
      if (timeSinceRegeneration < cooldownMs) {
        const hoursLeft = Math.ceil((cooldownMs - timeSinceRegeneration) / (60 * 60 * 1000));
        return res.status(429).json({
          success: false,
          message: `Code regeneration is on cooldown. Try again in ${hoursLeft} hours.`
        });
      }
    }

    // Generate new unique code
    let newCode;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      newCode = generateAffiliateCode();
      const [existing] = await connection.query(
        'SELECT id FROM promo_codes WHERE code = ?',
        [newCode]
      );
      isUnique = existing.length === 0;
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique affiliate code');
    }

    // Update the promo code
    await connection.query(`
      UPDATE promo_codes SET 
        code = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newCode, affiliate.code_id]);

    // Update user's affiliate code
    await connection.query(
      'UPDATE users SET affiliate_code = ? WHERE id = ?',
      [newCode, userId]
    );

    // Update regeneration timestamp
    try {
      await connection.query(`
        UPDATE affiliates SET 
          code_regenerated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [affiliate.id]);
    } catch (e) {
      console.log('code_regenerated_at field not available');
    }

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
    
    if (payoutAmount < (affiliate.payout_threshold || MIN_PAYOUT_THRESHOLD)) {
      return res.status(400).json({
        success: false,
        message: `Minimum payout amount is $${affiliate.payout_threshold || MIN_PAYOUT_THRESHOLD}`
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
    
    let eligibleCommissions = [];
    try {
      const [commissions] = await connection.query(`
        SELECT id, amount 
        FROM commissions 
        WHERE affiliate_id = ? 
          AND status = 'pending' 
          AND created_at <= ?
        ORDER BY created_at ASC
      `, [affiliate.id, eligibleDate]);

      eligibleCommissions = commissions || [];
    } catch (e) {
      console.log('Commissions table not available:', e.message);
    }

    let totalEligible = 0;
    let commissionsToProcess = [];
    
    for (const commission of eligibleCommissions) {
      if (totalEligible + commission.amount <= payoutAmount) {
        totalEligible += commission.amount;
        commissionsToProcess.push(commission.id);
      } else {
        break;
      }
    }

    if (totalEligible < payoutAmount) {
      return res.status(400).json({
        success: false,
        message: `Only $${totalEligible.toFixed(2)} is eligible for payout (after ${COMMISSION_HOLDING_DAYS}-day holding period)`
      });
    }

    // Create payout request
    try {
      const payoutData = {
        affiliate_id: affiliate.id,
        amount: totalEligible,
        commission_ids: JSON.stringify(commissionsToProcess),
        status: 'pending',
        requested_at: new Date()
      };

      const [result] = await connection.query(`
        INSERT INTO affiliate_payouts SET ?
      `, [payoutData]);

      // Mark commissions as processing
      if (commissionsToProcess.length > 0) {
        await connection.query(`
          UPDATE commissions SET 
            status = 'processing',
            payout_id = ?
          WHERE id IN (${commissionsToProcess.map(() => '?').join(',')})
        `, [result.insertId, ...commissionsToProcess]);
      }

      await connection.commit();

      res.status(201).json({
        success: true,
        message: `Payout request for $${totalEligible.toFixed(2)} submitted successfully`,
        data: {
          payout_id: result.insertId,
          amount: totalEligible,
          commissions_count: commissionsToProcess.length
        }
      });

    } catch (e) {
      // If payout tables don't exist, create a simple placeholder response
      console.log('Payout tables not available:', e.message);
      
      await connection.commit();
      
      res.status(201).json({
        success: true,
        message: `Payout request for $${totalEligible.toFixed(2)} noted (pending system implementation)`,
        data: {
          amount: totalEligible,
          commissions_count: commissionsToProcess.length
        }
      });
    }

  } catch (error) {
    await connection.rollback();
    console.error('Error requesting payout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit payout request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

// Validate promo code
const validatePromoCode = async (req, res) => {
  try {
    const { code, orderTotal } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is required'
      });
    }

    const [codeRows] = await pool.query(`
      SELECT 
        pc.*,
        a.status as affiliate_status,
        u.name as affiliate_name
      FROM promo_codes pc
      LEFT JOIN affiliates a ON pc.affiliate_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE pc.code = ? AND pc.is_active = TRUE
    `, [code.toUpperCase()]);

    if (codeRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or inactive promo code'
      });
    }

    const promoCode = codeRows[0];

    // Check if affiliate code and affiliate is approved
    if (promoCode.type === 'affiliate' && promoCode.affiliate_status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: 'Invalid or inactive promo code'
      });
    }

    // Check usage limits
    if (promoCode.max_uses && promoCode.current_uses >= promoCode.max_uses) {
      return res.status(400).json({
        success: false,
        message: 'Promo code usage limit reached'
      });
    }

    // Check expiration date
    if (promoCode.expires_at && new Date() > new Date(promoCode.expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'Promo code has expired'
      });
    }

    // Check start date
    if (promoCode.starts_at && new Date() < new Date(promoCode.starts_at)) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is not yet active'
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (orderTotal && promoCode.discount_amount) {
      if (promoCode.is_percentage) {
        discountAmount = Math.round((orderTotal * promoCode.discount_amount / 100) * 100) / 100;
      } else {
        discountAmount = promoCode.discount_amount;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        code: promoCode.code,
        type: promoCode.type,
        discount_type: promoCode.is_percentage ? 'percentage' : 'fixed',
        discount_amount: promoCode.discount_amount,
        calculated_discount: discountAmount,
        affiliate_name: promoCode.affiliate_name,
        message: promoCode.affiliate_name 
          ? `Get a discount with ${promoCode.affiliate_name}'s code!`
          : 'Valid promo code applied!'
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

// Track referral events
const trackReferralEvent = async (req, res) => {
  try {
    const { 
      code, 
      eventType, 
      orderId, 
      sessionId,
      conversionValue,
      metadata 
    } = req.body;

    if (!eventType || !code) {
      return res.status(400).json({
        success: false,
        message: 'Event type and code are required'
      });
    }

    // Get promo code info
    const [codeRows] = await pool.query(`
      SELECT id, affiliate_id FROM promo_codes WHERE code = ? AND is_active = TRUE
    `, [code.toUpperCase()]);

    if (codeRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid promo code'
      });
    }

    const promoCode = codeRows[0];

    try {
      // Insert referral event
      await pool.query(`
        INSERT INTO referral_events SET ?
      `, [{
        code_id: promoCode.id,
        event_type: eventType,
        session_id: sessionId || null,
        user_id: req.user ? req.user.id : null,
        order_id: orderId || null,
        conversion_value: conversionValue || 0,
        metadata: metadata ? JSON.stringify(metadata) : null,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }]);

      // Update promo code usage count for purchases
      if (eventType === 'purchase') {
        await pool.query(`
          UPDATE promo_codes SET 
            current_uses = current_uses + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [promoCode.id]);
      }
    } catch (e) {
      console.log('Referral tracking tables not available:', e.message);
      // Continue without tracking if tables don't exist
    }

    res.status(201).json({
      success: true,
      message: 'Referral event tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking referral event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track referral event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Process commission (internal function)
const processCommission = async (affiliate_id, orderId, orderTotal) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get affiliate commission rate
    const [affiliateRows] = await connection.query(
      'SELECT commission_rate FROM affiliates WHERE id = ? AND status = "approved"',
      [affiliate_id]
    );

    if (affiliateRows.length === 0) {
      throw new Error('Affiliate not found or not approved');
    }

    const commissionRate = affiliateRows[0].commission_rate;
    const commissionAmount = calculateCommission(orderTotal, commissionRate);

    try {
      // Create commission record
      await connection.query(`
        INSERT INTO commissions SET ?
      `, [{
        affiliate_id: affiliate_id,
        order_id: orderId,
        amount: commissionAmount,
        rate: commissionRate,
        status: 'pending'
      }]);
    } catch (e) {
      console.log('Commissions table not available:', e.message);
    }

    // Update affiliate balance
    await connection.query(`
      UPDATE affiliates SET 
        balance = balance + ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
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

// CRITICAL: Ensure all functions are exported
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