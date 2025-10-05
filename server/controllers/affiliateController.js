// server/controllers/affiliateController.js
// ✅ COMPLETE FILE WITH ALL FIXES: GBP currency, payout with payment details, commission fixes

const { pool } = require('../config/db');
const crypto = require('crypto');

// Constants
const DEFAULT_COMMISSION_RATE = 10.00;
const MIN_PAYOUT_THRESHOLD = 10.00; // £10 GBP minimum
const COMMISSION_HOLDING_DAYS = 14; // ✅ FIXED: 14 day holding period for chargebacks
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
    
    console.log(`[DEBUG] Getting affiliate status for user ID: ${userId}`);
    
    const [affiliateRows] = await pool.query(`
      SELECT 
        a.*,
        pc.code as affiliate_code,
        u.name as user_name,
        u.email as user_email
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id AND pc.type = 'affiliate' AND pc.is_active = TRUE
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
      LIMIT 1
    `, [userId]);

    console.log(`[DEBUG] Affiliate query result:`, affiliateRows);

    if (affiliateRows.length === 0) {
      console.log(`[DEBUG] No affiliate record found, returning default structure`);
      return res.status(200).json({
        success: true,
        data: { 
          isAffiliate: false, 
          canApply: true,
          status: null,
          hasApplication: false
        }
      });
    }

    const affiliate = affiliateRows[0];
    console.log(`[DEBUG] Found affiliate:`, {
      id: affiliate.id,
      status: affiliate.status,
      code: affiliate.affiliate_code
    });
    
    // Check if user can reapply (if previously denied)
    let canApply = false;
    if (affiliate.status === 'rejected' && affiliate.next_allowed_application_date) {
      canApply = new Date() >= new Date(affiliate.next_allowed_application_date);
    } else if (affiliate.status === 'rejected' && !affiliate.next_allowed_application_date) {
      canApply = true;
    }

    const responseData = {
      isAffiliate: true,
      hasApplication: true,
      canApply: canApply,
      status: affiliate.status,
      id: affiliate.id,
      user_id: affiliate.user_id,
      commission_rate: affiliate.commission_rate,
      balance: affiliate.balance,
      total_paid: affiliate.total_paid,
      affiliate_code: affiliate.affiliate_code,
      application_date: affiliate.application_date,
      approval_date: affiliate.approval_date,
      payout_threshold: affiliate.payout_threshold || MIN_PAYOUT_THRESHOLD,
      name: affiliate.user_name,
      email: affiliate.user_email,
      denial_reason: affiliate.denial_reason,
      next_allowed_application_date: affiliate.next_allowed_application_date
    };

    console.log(`[DEBUG] Returning affiliate data:`, responseData);

    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error getting affiliate status:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to get affiliate status',
      data: { 
        isAffiliate: false, 
        canApply: false,
        status: null,
        hasApplication: false
      },
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
      if (affiliate.status === 'rejected' && affiliate.next_allowed_application_date) {
        const canReapply = new Date() >= new Date(affiliate.next_allowed_application_date);
        if (!canReapply) {
          return res.status(400).json({
            success: false,
            message: `You can reapply on ${affiliate.next_allowed_application_date.toDateString()}`
          });
        }
      } else if (affiliate.status !== 'rejected') {
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
        JSON.stringify(content_platforms),
        audience_info,
        promotion_strategy,
        portfolio_links ? JSON.stringify(portfolio_links) : null,
        userId
      ]);
    } else {
      // Create new application
      await connection.query('INSERT INTO affiliates SET ?', [applicationData]);
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Affiliate application submitted successfully',
      data: {
        status: 'pending'
      }
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
        u.name as user_name,
        u.email as user_email
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id AND pc.type = 'affiliate'
      WHERE a.user_id = ? AND a.status = 'approved'
    `, [userId]);

    if (affiliateRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Approved affiliate account not found'
      });
    }

    const affiliate = affiliateRows[0];

    // Get commission stats
    let commissionStats = {
      total_commissions: 0,
      approved_commissions: 0,
      paid_commissions: 0,
      total_earnings: 0,
      available_balance: 0,
      paid_earnings: 0
    };

    try {
      const [statsRows] = await pool.query(`
        SELECT 
          COUNT(*) as total_commissions,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_commissions,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_commissions,
          SUM(amount) as total_earnings,
          SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as available_balance,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_earnings
        FROM commissions 
        WHERE affiliate_id = ?
      `, [affiliate.id]);

      if (statsRows.length > 0) {
        commissionStats = {
          total_commissions: statsRows[0].total_commissions || 0,
          approved_commissions: statsRows[0].approved_commissions || 0,
          paid_commissions: statsRows[0].paid_commissions || 0,
          total_earnings: parseFloat(statsRows[0].total_earnings) || 0,
          available_balance: parseFloat(statsRows[0].available_balance) || 0,
          paid_earnings: parseFloat(statsRows[0].paid_earnings) || 0
        };
      }
    } catch (e) {
      console.log('Commission stats not available:', e.message);
    }

    // Get recent commissions
    let recentCommissions = [];
    try {
      const [commissionRows] = await pool.query(`
        SELECT 
          c.*,
          o.order_number,
          o.package_type,
          o.total_price as order_total
        FROM commissions c
        LEFT JOIN orders o ON c.order_id = o.id
        WHERE c.affiliate_id = ?
        ORDER BY c.created_at DESC
        LIMIT 10
      `, [affiliate.id]);

      recentCommissions = commissionRows;
    } catch (e) {
      console.log('Recent commissions not available:', e.message);
    }

    // Get referral analytics
    let referralStats = {
      total_clicks: 0,
      total_signups: 0,
      total_conversions: 0,
      conversion_rate: 0
    };

    try {
      const [analyticsRows] = await pool.query(`
        SELECT 
          COUNT(CASE WHEN event_type = 'click' THEN 1 END) as total_clicks,
          COUNT(CASE WHEN event_type = 'signup' THEN 1 END) as total_signups,
          COUNT(CASE WHEN event_type = 'purchase' THEN 1 END) as total_conversions
        FROM referral_events re
        JOIN promo_codes pc ON re.code_id = pc.id
        WHERE pc.affiliate_id = ?
      `, [affiliate.id]);

      if (analyticsRows.length > 0) {
        const stats = analyticsRows[0];
        referralStats = {
          total_clicks: stats.total_clicks || 0,
          total_signups: stats.total_signups || 0,
          total_conversions: stats.total_conversions || 0,
          conversion_rate: stats.total_clicks > 0 
            ? ((stats.total_conversions / stats.total_clicks) * 100).toFixed(2)
            : 0
        };
      }
    } catch (e) {
      console.log('Referral analytics not available:', e.message);
    }

    // Calculate payout eligibility
    const canRequestPayout = affiliate.balance >= (affiliate.payout_threshold || MIN_PAYOUT_THRESHOLD);

    res.status(200).json({
      success: true,
      data: {
        affiliate: {
          id: affiliate.id,
          user_id: affiliate.user_id,
          status: affiliate.status,
          commission_rate: parseFloat(affiliate.commission_rate) || 0,
          balance: parseFloat(affiliate.balance) || 0,
          total_paid: parseFloat(affiliate.total_paid) || 0,
          affiliate_code: affiliate.affiliate_code,
          payout_threshold: parseFloat(affiliate.payout_threshold) || MIN_PAYOUT_THRESHOLD,
          name: affiliate.user_name,
          email: affiliate.user_email,
          created_at: affiliate.created_at,
          approval_date: affiliate.approval_date
        },
        stats: {
          ...commissionStats,
          ...referralStats,
          can_request_payout: canRequestPayout,
          total_commissions: parseInt(commissionStats.total_commissions) || 0,
          approved_commissions: parseInt(commissionStats.approved_commissions) || 0,
          paid_commissions: parseInt(commissionStats.paid_commissions) || 0,
          total_earnings: parseFloat(commissionStats.total_earnings) || 0,
          available_balance: parseFloat(commissionStats.available_balance) || 0,
          paid_earnings: parseFloat(commissionStats.paid_earnings) || 0
        },
        recent_commissions: recentCommissions,
        recent_events: []
      }
    });

  } catch (error) {
    console.error('Error getting affiliate dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard',
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
    
    // Get current affiliate info
    const [affiliateRows] = await connection.query(`
      SELECT a.*, pc.id as code_id, pc.code as current_code
      FROM affiliates a
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id AND pc.type = 'affiliate'
      WHERE a.user_id = ? AND a.status = 'approved'
    `, [userId]);

    if (affiliateRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Approved affiliate account not found'
      });
    }

    const affiliate = affiliateRows[0];

    // Check regeneration cooldown
    try {
      const [cooldownRows] = await connection.query(
        'SELECT code_regenerated_at FROM affiliates WHERE id = ?',
        [affiliate.id]
      );

      if (cooldownRows.length > 0 && cooldownRows[0].code_regenerated_at) {
        const lastRegeneration = new Date(cooldownRows[0].code_regenerated_at);
        const now = new Date();
        const hoursSinceLastRegen = (now - lastRegeneration) / (1000 * 60 * 60);
        
        if (hoursSinceLastRegen < CODE_REGENERATION_COOLDOWN_HOURS) {
          const hoursRemaining = Math.ceil(CODE_REGENERATION_COOLDOWN_HOURS - hoursSinceLastRegen);
          return res.status(429).json({
            success: false,
            message: `Code regeneration is limited to once per day. Try again in ${hoursRemaining} hours.`
          });
        }
      }
    } catch (e) {
      console.log('Cooldown check not available:', e.message);
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
      throw new Error('Failed to generate unique affiliate code');
    }

    // Update promo code
    await connection.query(`
      UPDATE promo_codes SET code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
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

// ✅ UPDATED: Request payout with payment details
const requestPayout = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const userId = req.user.id;
    const { 
      paymentMethod, 
      stripeEmail, 
      fullName,
      accountHolderName,
      bankName,
      accountNumber,
      sortCode
    } = req.body;

    // ✅ Validate payment method
    if (!paymentMethod || !['stripe', 'bank_transfer'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method. Must be "stripe" or "bank_transfer"'
      });
    }

    // ✅ Validate required fields based on payment method
    if (paymentMethod === 'stripe') {
      if (!stripeEmail || !fullName) {
        return res.status(400).json({
          success: false,
          message: 'Stripe email and full name are required for Stripe payouts'
        });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stripeEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email address format'
        });
      }
    } else if (paymentMethod === 'bank_transfer') {
      if (!accountHolderName || !bankName || !accountNumber || !sortCode || !fullName) {
        return res.status(400).json({
          success: false,
          message: 'All bank details are required for bank transfer payouts'
        });
      }
    }
    
    // Get affiliate info
    const [affiliateRows] = await connection.query(
      'SELECT * FROM affiliates WHERE user_id = ? AND status = "approved"',
      [userId]
    );

    if (affiliateRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Approved affiliate account not found'
      });
    }

    const affiliate = affiliateRows[0];

    // ✅ Check minimum threshold (GBP)
    if (affiliate.balance < MIN_PAYOUT_THRESHOLD) {
      return res.status(400).json({
        success: false,
        message: `Minimum payout threshold is £${MIN_PAYOUT_THRESHOLD}. Your current balance is £${affiliate.balance}`
      });
    }

    // ✅ Get eligible commissions (approved and at least 14 days old)
    const eligibleDate = new Date();
    eligibleDate.setDate(eligibleDate.getDate() - COMMISSION_HOLDING_DAYS);

    const [eligibleCommissions] = await connection.query(`
      SELECT id, amount 
      FROM commissions 
      WHERE affiliate_id = ? 
        AND status = 'approved'
        AND created_at <= ?
      ORDER BY created_at ASC
    `, [affiliate.id, eligibleDate]);

    if (eligibleCommissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No eligible commissions. Commissions must be ${COMMISSION_HOLDING_DAYS} days old to be eligible for payout.`
      });
    }

    // Calculate total eligible amount
    let totalEligible = 0;
    let commissionsToProcess = [];

    for (const commission of eligibleCommissions) {
      if (totalEligible + commission.amount <= affiliate.balance) {
        totalEligible += commission.amount;
        commissionsToProcess.push(commission.id);
      } else {
        break;
      }
    }

    if (totalEligible === 0) {
      return res.status(400).json({
        success: false,
        message: 'No eligible commissions available for payout at this time'
      });
    }

    // ✅ Prepare payment info based on method
    let paymentInfo = {
      method: paymentMethod,
      fullName: fullName
    };

    if (paymentMethod === 'stripe') {
      paymentInfo.stripeEmail = stripeEmail;
    } else {
      paymentInfo.accountHolderName = accountHolderName;
      paymentInfo.bankName = bankName;
      paymentInfo.accountNumber = accountNumber.slice(-4); // Store only last 4 digits
      paymentInfo.sortCode = sortCode;
    }

    // ✅ Create payout request with payment details
    const payoutData = {
      affiliate_id: affiliate.id,
      amount: totalEligible,
      commission_ids: JSON.stringify(commissionsToProcess),
      commission_count: commissionsToProcess.length,
      status: 'pending',
      payment_method: paymentMethod,
      payment_info: JSON.stringify(paymentInfo),
      requested_at: new Date()
    };

    const [result] = await connection.query(`
      INSERT INTO affiliate_payouts SET ?
    `, [payoutData]);

    const payoutId = result.insertId;

    // Mark commissions as processing
    if (commissionsToProcess.length > 0) {
      await connection.query(`
        UPDATE commissions 
        SET status = 'processing', payout_id = ?
        WHERE id IN (${commissionsToProcess.map(() => '?').join(',')})
      `, [payoutId, ...commissionsToProcess]);
    }

    // Deduct from affiliate balance
    await connection.query(`
      UPDATE affiliates 
      SET balance = balance - ?
      WHERE id = ?
    `, [totalEligible, affiliate.id]);

    await connection.commit();

    // ✅ Return success with GBP symbol
    res.status(201).json({
      success: true,
      message: `Payout request for £${totalEligible.toFixed(2)} submitted successfully`,
      data: {
        payoutId,
        amount: totalEligible,
        commissionCount: commissionsToProcess.length,
        paymentMethod,
        status: 'pending',
        estimatedProcessingTime: paymentMethod === 'stripe' ? '3-5 business days' : '5-7 business days'
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
        message: 'Invalid or expired promo code'
      });
    }

    const promoCode = codeRows[0];

    // Check if code has expired
    if (promoCode.expires_at && new Date() > new Date(promoCode.expires_at)) {
      return res.status(400).json({
        success: false,
        message: 'Promo code has expired'
      });
    }

    // Check if code hasn't started yet
    if (promoCode.starts_at && new Date() < new Date(promoCode.starts_at)) {
      return res.status(400).json({
        success: false,
        message: 'Promo code is not yet active'
      });
    }

    // Check usage limits
    if (promoCode.max_uses > 0 && promoCode.current_uses >= promoCode.max_uses) {
      return res.status(400).json({
        success: false,
        message: 'Promo code usage limit reached'
      });
    }

    // ✅ Check minimum order value (GBP)
    if (orderTotal && promoCode.min_order_value > 0 && orderTotal < promoCode.min_order_value) {
      return res.status(400).json({
        success: false,
        message: `Minimum order value for this code is £${promoCode.min_order_value}`
      });
    }

    // Check affiliate status for affiliate codes
    if (promoCode.type === 'affiliate' && promoCode.affiliate_status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Affiliate code is not currently available'
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (orderTotal) {
      if (promoCode.is_percentage) {
        discountAmount = (orderTotal * promoCode.discount_amount) / 100;
      } else {
        discountAmount = Math.min(promoCode.discount_amount, orderTotal);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        code: promoCode.code,
        name: promoCode.name,
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
    console.log(`Commission of £${commissionAmount} processed for affiliate ${affiliate_id}`);
    
  } catch (error) {
    await connection.rollback();
    console.error('Error processing commission:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Export all functions
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