// server/controllers/adminAffiliateController.js
const { pool } = require('../config/db');
const crypto = require('crypto');

// Constants
const DEFAULT_COMMISSION_RATE = 10.00;
const REAPPLICATION_COOLDOWN_DAYS = 30;

// Helper function to generate affiliate code
const generateAffiliateCode = () => {
  const prefix = 'SONG';
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}${random}`;
};

// Get all affiliates with filtering and pagination
const getAllAffiliates = async (req, res) => {
  try {
    const {
      status = 'all',
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    
    if (status !== 'all') {
      whereConditions.push('a.status = ?');
      queryParams.push(status);
    }
    
    if (search) {
      whereConditions.push('(u.name LIKE ? OR u.email LIKE ? OR pc.code LIKE ?)');
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // Validate sort parameters
    const allowedSortFields = ['created_at', 'status', 'name', 'email', 'balance', 'total_paid', 'commission_rate'];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Get total count
    const [countResult] = await pool.query(`
      SELECT COUNT(DISTINCT a.id) as total
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id AND pc.type = 'affiliate'
      ${whereClause}
    `, queryParams);
    
    const totalAffiliates = countResult[0].total;
    
    // Get affiliates with pagination
    const [affiliates] = await pool.query(`
      SELECT 
        a.*,
        u.name,
        u.email,
        u.created_at as user_registered_at,
        pc.code as affiliate_code,
        pc.current_uses as code_uses,
        a.application_date,
        a.approval_date,
        a.denial_date,
        a.next_allowed_application_date,
        a.content_platforms,
        a.audience_info,
        a.promotion_strategy,
        a.portfolio_links,
        a.denial_reason,
        
        -- Commission stats
        COUNT(DISTINCT c.id) as total_commissions,
        COUNT(DISTINCT CASE WHEN c.status = 'paid' THEN c.id END) as paid_commissions,
        COUNT(DISTINCT CASE WHEN c.status = 'pending' THEN c.id END) as pending_commissions,
        SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) as total_earnings,
        SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END) as pending_earnings,
        
        -- Referral stats
        COUNT(DISTINCT re.id) as total_clicks,
        COUNT(DISTINCT CASE WHEN re.event_type = 'signup' THEN re.id END) as total_signups,
        COUNT(DISTINCT CASE WHEN re.event_type = 'purchase' THEN re.id END) as total_conversions,
        
        -- Latest activity
        MAX(re.created_at) as last_activity
        
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id AND pc.type = 'affiliate'
      LEFT JOIN commissions c ON c.affiliate_id = a.id
      LEFT JOIN referral_events re ON re.code_id = pc.id
      ${whereClause}
      GROUP BY a.id, u.name, u.email, u.created_at, pc.code, pc.current_uses
      ORDER BY ${validSortBy === 'name' ? 'u.name' : validSortBy === 'email' ? 'u.email' : `a.${validSortBy}`} ${validSortOrder}
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    // Calculate conversion rates
    const affiliatesWithMetrics = affiliates.map(affiliate => ({
      ...affiliate,
      conversion_rate: affiliate.total_clicks > 0 
        ? Math.round((affiliate.total_conversions / affiliate.total_clicks) * 10000) / 100 
        : 0
    }));

    res.status(200).json({
      success: true,
      data: {
        affiliates: affiliatesWithMetrics,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalAffiliates / parseInt(limit)),
          total_items: totalAffiliates,
          items_per_page: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting all affiliates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch affiliates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Approve affiliate application
const approveAffiliate = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { affiliateId } = req.params;
    const { commissionRate, adminNotes } = req.body;
    
    // Validate commission rate
    const rate = commissionRate || DEFAULT_COMMISSION_RATE;
    if (rate < 0 || rate > 50) {
      return res.status(400).json({
        success: false,
        message: 'Commission rate must be between 0% and 50%'
      });
    }

    // Get affiliate details
    const [affiliateRows] = await connection.query(`
      SELECT a.*, u.name, u.email 
      FROM affiliates a 
      JOIN users u ON a.user_id = u.id 
      WHERE a.id = ?
    `, [affiliateId]);

    if (affiliateRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found'
      });
    }

    const affiliate = affiliateRows[0];

    if (affiliate.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending applications can be approved'
      });
    }

    // Update affiliate status
    await connection.query(`
      UPDATE affiliates SET 
        status = 'approved',
        approval_date = CURRENT_TIMESTAMP,
        commission_rate = ?,
        custom_commission_rate = ?,
        admin_notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      rate,
      rate !== DEFAULT_COMMISSION_RATE,
      adminNotes || null,
      affiliateId
    ]);

    // Generate unique affiliate code
    let affiliateCode;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      affiliateCode = generateAffiliateCode();
      const [existingCode] = await connection.query(
        'SELECT id FROM promo_codes WHERE code = ?',
        [affiliateCode]
      );
      
      if (existingCode.length === 0) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique affiliate code');
    }

    // Create affiliate promo code
    await connection.query(`
      INSERT INTO promo_codes (
        code, name, type, affiliate_id, created_by, 
        discount_amount, is_percentage, is_active
      ) VALUES (?, ?, 'affiliate', ?, ?, ?, TRUE, TRUE)
    `, [
      affiliateCode,
      `${affiliate.name}'s Affiliate Code`,
      affiliateId,
      req.user.id,
      rate
    ]);

    // Update user's affiliate_code
    await connection.query(
      'UPDATE users SET affiliate_code = ? WHERE id = ?',
      [affiliateCode, affiliate.user_id]
    );

    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: `Affiliate application approved successfully. Code: ${affiliateCode}`,
      data: {
        affiliate_id: affiliateId,
        affiliate_code: affiliateCode,
        commission_rate: rate
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error approving affiliate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve affiliate',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

// Deny affiliate application
const denyAffiliate = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { affiliateId } = req.params;
    const { denialReason, allowReapplication = true } = req.body;
    
    if (!denialReason || denialReason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Denial reason must be at least 10 characters long'
      });
    }

    // Get affiliate details
    const [affiliateRows] = await connection.query(
      'SELECT * FROM affiliates WHERE id = ?',
      [affiliateId]
    );

    if (affiliateRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found'
      });
    }

    const affiliate = affiliateRows[0];

    if (affiliate.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending applications can be denied'
      });
    }

    // Calculate reapplication date
    const nextAllowedDate = allowReapplication 
      ? new Date(Date.now() + (REAPPLICATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000))
      : null;

    // Update affiliate status
    await connection.query(`
      UPDATE affiliates SET 
        status = 'denied',
        denial_date = CURRENT_TIMESTAMP,
        denial_reason = ?,
        next_allowed_application_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      denialReason.trim(),
      nextAllowedDate,
      affiliateId
    ]);

    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: 'Affiliate application denied successfully',
      data: {
        affiliate_id: affiliateId,
        can_reapply: allowReapplication,
        next_application_date: nextAllowedDate
      }
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error denying affiliate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deny affiliate',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

// Update affiliate settings
const updateAffiliateSettings = async (req, res) => {
  try {
    const { affiliateId } = req.params;
    const { 
      commissionRate, 
      payoutThreshold, 
      status, 
      adminNotes 
    } = req.body;

    // Validation
    if (commissionRate !== undefined && (commissionRate < 0 || commissionRate > 50)) {
      return res.status(400).json({
        success: false,
        message: 'Commission rate must be between 0% and 50%'
      });
    }

    if (payoutThreshold !== undefined && payoutThreshold < 10) {
      return res.status(400).json({
        success: false,
        message: 'Payout threshold must be at least $10'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (commissionRate !== undefined) {
      updateFields.push('commission_rate = ?', 'custom_commission_rate = TRUE');
      updateValues.push(commissionRate);
    }

    if (payoutThreshold !== undefined) {
      updateFields.push('payout_threshold = ?');
      updateValues.push(payoutThreshold);
    }

    if (status !== undefined) {
      const validStatuses = ['approved', 'suspended'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be approved or suspended'
        });
      }
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (adminNotes !== undefined) {
      updateFields.push('admin_notes = ?');
      updateValues.push(adminNotes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(affiliateId);

    await pool.query(`
      UPDATE affiliates SET ${updateFields.join(', ')} WHERE id = ?
    `, updateValues);

    // If commission rate was updated, update the affiliate's promo code
    if (commissionRate !== undefined) {
      await pool.query(`
        UPDATE promo_codes SET 
          discount_amount = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE affiliate_id = ? AND type = 'affiliate'
      `, [commissionRate, affiliateId]);
    }

    res.status(200).json({
      success: true,
      message: 'Affiliate settings updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating affiliate settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update affiliate settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all promo codes with analytics
const getAllPromoCodes = async (req, res) => {
  try {
    const {
      type = 'all',
      status = 'all',
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    
    if (type !== 'all') {
      whereConditions.push('pc.type = ?');
      queryParams.push(type);
    }
    
    if (status === 'active') {
      whereConditions.push('pc.is_active = TRUE');
    } else if (status === 'inactive') {
      whereConditions.push('pc.is_active = FALSE');
    }
    
    if (search) {
      whereConditions.push('(pc.code LIKE ? OR pc.name LIKE ? OR u.name LIKE ?)');
      const searchPattern = `%${search}%`;
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // Get total count
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM promo_codes pc
      LEFT JOIN affiliates a ON pc.affiliate_id = a.id
      LEFT JOIN users u ON a.user_id = u.id OR pc.created_by = u.id
      ${whereClause}
    `, queryParams);
    
    const totalCodes = countResult[0].total;
    
    // Get codes with analytics
    const [codes] = await pool.query(`
      SELECT 
        pc.*,
        COALESCE(u_aff.name, u_admin.name) as owner_name,
        COALESCE(u_aff.email, u_admin.email) as owner_email,
        a.status as affiliate_status,
        
        -- Usage analytics
        COUNT(DISTINCT re.id) as total_clicks,
        COUNT(DISTINCT CASE WHEN re.event_type = 'signup' THEN re.id END) as total_signups,
        COUNT(DISTINCT CASE WHEN re.event_type = 'purchase' THEN re.id END) as total_conversions,
        SUM(CASE WHEN re.event_type = 'purchase' THEN re.conversion_value ELSE 0 END) as total_revenue,
        
        -- Commission data
        COUNT(DISTINCT c.id) as total_commissions,
        SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) as total_commissions_paid,
        
        -- Latest activity
        MAX(re.created_at) as last_used
        
      FROM promo_codes pc
      LEFT JOIN affiliates a ON pc.affiliate_id = a.id
      LEFT JOIN users u_aff ON a.user_id = u_aff.id
      LEFT JOIN users u_admin ON pc.created_by = u_admin.id
      LEFT JOIN referral_events re ON re.code_id = pc.id
      LEFT JOIN commissions c ON c.code_id = pc.id
      ${whereClause}
      GROUP BY pc.id
      ORDER BY pc.${sortBy === 'owner_name' ? 'name' : sortBy} ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    // Calculate conversion rates
    const codesWithMetrics = codes.map(code => ({
      ...code,
      conversion_rate: code.total_clicks > 0 
        ? Math.round((code.total_conversions / code.total_clicks) * 10000) / 100 
        : 0
    }));

    res.status(200).json({
      success: true,
      data: {
        codes: codesWithMetrics,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalCodes / parseInt(limit)),
          total_items: totalCodes,
          items_per_page: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting promo codes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch promo codes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create discount code (admin only)
const createDiscountCode = async (req, res) => {
  try {
    const {
      code,
      name,
      discountAmount,
      isPercentage = true,
      maxUses = 0,
      maxUsesPerUser = 1,
      startsAt,
      expiresAt
    } = req.body;

    // Validation
    if (!code || !name || discountAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Code, name, and discount amount are required'
      });
    }

    if (discountAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount amount must be greater than 0'
      });
    }

    if (isPercentage && discountAmount > 100) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount cannot be greater than 100%'
      });
    }

    // Check if code already exists
    const [existingCode] = await pool.query(
      'SELECT id FROM promo_codes WHERE code = ?',
      [code.toUpperCase()]
    );

    if (existingCode.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A promo code with this code already exists'
      });
    }

    // Insert new promo code
    const [result] = await pool.query(`
      INSERT INTO promo_codes (
        code, name, type, created_by, 
        discount_amount, is_percentage, 
        max_uses, max_uses_per_user,
        starts_at, expires_at, is_active
      ) VALUES (?, ?, 'discount', ?, ?, ?, ?, ?, ?, ?, TRUE)
    `, [
      code.toUpperCase(),
      name,
      req.user.id,
      discountAmount,
      isPercentage,
      maxUses || 0,
      maxUsesPerUser || 1,
      startsAt || null,
      expiresAt || null
    ]);

    res.status(201).json({
      success: true,
      message: 'Discount code created successfully',
      data: {
        id: result.insertId,
        code: code.toUpperCase()
      }
    });
    
  } catch (error) {
    console.error('Error creating discount code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create discount code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update promo code
const updatePromoCode = async (req, res) => {
  try {
    const { codeId } = req.params;
    const {
      name,
      discountAmount,
      isPercentage,
      maxUses,
      maxUsesPerUser,
      startsAt,
      expiresAt,
      isActive
    } = req.body;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }

    if (discountAmount !== undefined) {
      if (discountAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Discount amount must be greater than 0'
        });
      }
      if (isPercentage && discountAmount > 100) {
        return res.status(400).json({
          success: false,
          message: 'Percentage discount cannot be greater than 100%'
        });
      }
      updateFields.push('discount_amount = ?');
      updateValues.push(discountAmount);
    }

    if (isPercentage !== undefined) {
      updateFields.push('is_percentage = ?');
      updateValues.push(isPercentage);
    }

    if (maxUses !== undefined) {
      updateFields.push('max_uses = ?');
      updateValues.push(maxUses);
    }

    if (maxUsesPerUser !== undefined) {
      updateFields.push('max_uses_per_user = ?');
      updateValues.push(maxUsesPerUser);
    }

    if (startsAt !== undefined) {
      updateFields.push('starts_at = ?');
      updateValues.push(startsAt);
    }

    if (expiresAt !== undefined) {
      updateFields.push('expires_at = ?');
      updateValues.push(expiresAt);
    }

    if (isActive !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(isActive);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(codeId);

    const [result] = await pool.query(`
      UPDATE promo_codes SET ${updateFields.join(', ')} WHERE id = ?
    `, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Promo code updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update promo code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get affiliate analytics and performance metrics
const getAffiliateAnalytics = async (req, res) => {
  try {
    const { period = '30d', affiliateId } = req.query;
    
    // Calculate date range
    let dateFilter = '';
    let dateParams = [];
    
    if (period === '7d') {
      dateFilter = 'AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === '30d') {
      dateFilter = 'AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    } else if (period === '90d') {
      dateFilter = 'AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
    } else if (period === '1y') {
      dateFilter = 'AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
    }

    // Overall affiliate program stats
    const [overallStats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT a.id) as total_affiliates,
        COUNT(DISTINCT CASE WHEN a.status = 'approved' THEN a.id END) as active_affiliates,
        COUNT(DISTINCT CASE WHEN a.status = 'pending' THEN a.id END) as pending_applications,
        SUM(a.balance) as total_unpaid_balance,
        SUM(a.total_paid) as total_paid_out,
        
        -- Commission stats
        COUNT(DISTINCT c.id) as total_commissions,
        SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) as total_commissions_paid,
        SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END) as total_commissions_pending,
        
        -- Conversion funnel
        COUNT(DISTINCT re.id) as total_events,
        COUNT(DISTINCT CASE WHEN re.event_type = 'click' THEN re.id END) as total_clicks,
        COUNT(DISTINCT CASE WHEN re.event_type = 'signup' THEN re.id END) as total_signups,
        COUNT(DISTINCT CASE WHEN re.event_type = 'purchase' THEN re.id END) as total_purchases,
        SUM(CASE WHEN re.event_type = 'purchase' THEN re.conversion_value ELSE 0 END) as total_revenue_generated
        
      FROM affiliates a
      LEFT JOIN commissions c ON c.affiliate_id = a.id ${dateFilter}
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id
      LEFT JOIN referral_events re ON re.code_id = pc.id ${dateFilter}
      WHERE 1=1
      ${affiliateId ? 'AND a.id = ?' : ''}
    `, affiliateId ? [affiliateId] : []);

    // Top performing affiliates
    const [topAffiliates] = await pool.query(`
      SELECT 
        a.id,
        u.name as affiliate_name,
        pc.code as affiliate_code,
        a.commission_rate,
        COUNT(DISTINCT re.id) as total_clicks,
        COUNT(DISTINCT CASE WHEN re.event_type = 'purchase' THEN re.id END) as conversions,
        SUM(CASE WHEN re.event_type = 'purchase' THEN re.conversion_value ELSE 0 END) as revenue_generated,
        SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) as commissions_paid
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id
      LEFT JOIN referral_events re ON re.code_id = pc.id ${dateFilter}
      LEFT JOIN commissions c ON c.affiliate_id = a.id ${dateFilter}
      WHERE a.status = 'approved'
      GROUP BY a.id, u.name, pc.code, a.commission_rate
      ORDER BY revenue_generated DESC
      LIMIT 10
    `);

    // Calculate conversion rates
    const stats = overallStats[0];
    const conversionRates = {
      click_to_signup: stats.total_clicks > 0 
        ? Math.round((stats.total_signups / stats.total_clicks) * 10000) / 100 
        : 0,
      signup_to_purchase: stats.total_signups > 0 
        ? Math.round((stats.total_purchases / stats.total_signups) * 10000) / 100 
        : 0,
      click_to_purchase: stats.total_clicks > 0 
        ? Math.round((stats.total_purchases / stats.total_clicks) * 10000) / 100 
        : 0
    };

    res.status(200).json({
      success: true,
      data: {
        period,
        overview: stats,
        conversion_rates: conversionRates,
        top_affiliates: topAffiliates
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
};

// Get payout requests
const getPayoutRequests = async (req, res) => {
  try {
    const {
      status = 'all',
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause
    let whereClause = '';
    let queryParams = [];
    
    if (status !== 'all') {
      whereClause = 'WHERE ap.status = ?';
      queryParams.push(status);
    }
    
    // Get total count
    const [countResult] = await pool.query(`
      SELECT COUNT(*) as total
      FROM affiliate_payouts ap
      ${whereClause}
    `, queryParams);
    
    const totalPayouts = countResult[0].total;
    
    // Get payouts with details
    const [payouts] = await pool.query(`
      SELECT 
        ap.*,
        a.commission_rate,
        u.name as affiliate_name,
        u.email as affiliate_email,
        pc.code as affiliate_code
      FROM affiliate_payouts ap
      JOIN affiliates a ON ap.affiliate_id = a.id
      JOIN users u ON a.user_id = u.id
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id AND pc.type = 'affiliate'
      ${whereClause}
      ORDER BY ap.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    res.status(200).json({
      success: true,
      data: {
        payouts,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(totalPayouts / parseInt(limit)),
          total_items: totalPayouts,
          items_per_page: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting payout requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payout requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Process payout
const processPayout = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { payoutId } = req.params;
    const { 
      action, // 'approve' or 'reject'
      processingNotes,
      transactionId 
    } = req.body;
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either approve or reject'
      });
    }

    // Get payout details
    const [payoutRows] = await connection.query(`
      SELECT ap.*, a.balance, a.user_id 
      FROM affiliate_payouts ap
      JOIN affiliates a ON ap.affiliate_id = a.id
      WHERE ap.id = ?
    `, [payoutId]);

    if (payoutRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payout request not found'
      });
    }

    const payout = payoutRows[0];

    if (payout.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending payouts can be processed'
      });
    }

    if (action === 'approve') {
      // Update payout status
      await connection.query(`
        UPDATE affiliate_payouts SET 
          status = 'paid',
          paid_date = CURRENT_TIMESTAMP,
          transaction_id = ?,
          processing_notes = ?,
          processed_by = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        transactionId || null,
        processingNotes || null,
        req.user.id,
        payoutId
      ]);

      // Update affiliate balance and total_paid
      await connection.query(`
        UPDATE affiliates SET 
          balance = balance - ?,
          total_paid = total_paid + ?,
          last_payout_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        payout.amount,
        payout.amount,
        payout.affiliate_id
      ]);

      // Update commission statuses
      const commissionIds = JSON.parse(payout.commission_ids || '[]');
      if (commissionIds.length > 0) {
        await connection.query(`
          UPDATE commissions SET 
            status = 'paid',
            paid_date = CURRENT_TIMESTAMP,
            payout_id = ?
          WHERE id IN (?)
        `, [payoutId, commissionIds]);
      }
    } else {
      // Reject payout
      await connection.query(`
        UPDATE affiliate_payouts SET 
          status = 'rejected',
          processing_notes = ?,
          processed_by = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [
        processingNotes || 'Payout rejected by admin',
        req.user.id,
        payoutId
      ]);

      // Reset commission statuses to pending
      const commissionIds = JSON.parse(payout.commission_ids || '[]');
      if (commissionIds.length > 0) {
        await connection.query(`
          UPDATE commissions SET 
            payout_id = NULL
          WHERE id IN (?)
        `, [commissionIds]);
      }
    }

    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: `Payout ${action === 'approve' ? 'approved' : 'rejected'} successfully`
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('Error processing payout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
};

module.exports = {
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
};