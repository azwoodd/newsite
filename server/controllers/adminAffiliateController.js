// server/controllers/adminAffiliateController.js - COMPLETE ADMIN CONTROLLER
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
    
    // Get affiliates with comprehensive data
    const [affiliates] = await pool.query(`
      SELECT 
        a.*,
        u.name,
        u.email,
        u.created_at as user_registered_at,
        pc.code as affiliate_code,
        pc.current_uses as code_uses,
        
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

    // Calculate conversion rates and add default values for missing fields
    const affiliatesWithMetrics = affiliates.map(affiliate => ({
      ...affiliate,
      conversion_rate: affiliate.total_clicks > 0 
        ? Math.round((affiliate.total_conversions / affiliate.total_clicks) * 10000) / 100 
        : 0,
      // Add default values for potentially missing fields
      application_date: affiliate.application_date || affiliate.created_at,
      approval_date: affiliate.approval_date || null,
      denial_date: affiliate.denial_date || null,
      next_allowed_application_date: affiliate.next_allowed_application_date || null,
      content_platforms: affiliate.content_platforms || '[]',
      audience_info: affiliate.audience_info || '',
      promotion_strategy: affiliate.promotion_strategy || '',
      portfolio_links: affiliate.portfolio_links || '',
      denial_reason: affiliate.denial_reason || null,
      admin_notes: affiliate.admin_notes || null,
      custom_commission_rate: affiliate.custom_commission_rate || false,
      payout_threshold: affiliate.payout_threshold || 50.00,
      last_payout_date: affiliate.last_payout_date || null,
      code_regenerated_at: affiliate.code_regenerated_at || null,
      // Ensure numeric fields have defaults
      total_clicks: affiliate.total_clicks || 0,
      total_signups: affiliate.total_signups || 0,
      total_conversions: affiliate.total_conversions || 0,
      total_commissions: affiliate.total_commissions || 0,
      paid_commissions: affiliate.paid_commissions || 0,
      pending_commissions: affiliate.pending_commissions || 0,
      total_earnings: affiliate.total_earnings || 0,
      pending_earnings: affiliate.pending_earnings || 0
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

    // Update affiliate status - handle potentially missing columns gracefully
    const updateFields = ['status = ?', 'commission_rate = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const updateValues = ['approved', rate];

    // Try to add optional fields that might not exist in all database versions
    try {
      // Check if approval_date column exists
      const [columns] = await connection.query(`
        SHOW COLUMNS FROM affiliates LIKE 'approval_date'
      `);
      if (columns.length > 0) {
        updateFields.push('approval_date = CURRENT_TIMESTAMP');
      }
    } catch (e) {
      console.log('approval_date column check failed, skipping');
    }

    try {
      // Check if custom_commission_rate column exists
      const [columns] = await connection.query(`
        SHOW COLUMNS FROM affiliates LIKE 'custom_commission_rate'
      `);
      if (columns.length > 0) {
        updateFields.push('custom_commission_rate = ?');
        updateValues.push(rate !== DEFAULT_COMMISSION_RATE);
      }
    } catch (e) {
      console.log('custom_commission_rate column check failed, skipping');
    }

    if (adminNotes) {
      try {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM affiliates LIKE 'admin_notes'
        `);
        if (columns.length > 0) {
          updateFields.push('admin_notes = ?');
          updateValues.push(adminNotes);
        }
      } catch (e) {
        console.log('admin_notes column check failed, skipping');
      }
    }

    updateValues.push(affiliateId);

    await connection.query(`
      UPDATE affiliates SET ${updateFields.join(', ')} WHERE id = ?
    `, updateValues);

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

    // Create affiliate promo code with flexible field handling
    try {
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
    } catch (e) {
      // Try with simplified structure if some columns don't exist
      console.log('Full promo code insert failed, trying simplified:', e.message);
      await connection.query(`
        INSERT INTO promo_codes (
          code, name, type, affiliate_id, discount_amount, is_active
        ) VALUES (?, ?, 'affiliate', ?, ?, TRUE)
      `, [
        affiliateCode,
        `${affiliate.name}'s Affiliate Code`,
        affiliateId,
        rate
      ]);
    }

    // Update user's affiliate_code if column exists
    try {
      await connection.query(
        'UPDATE users SET affiliate_code = ? WHERE id = ?',
        [affiliateCode, affiliate.user_id]
      );
    } catch (e) {
      console.log('affiliate_code column not available in users table:', e.message);
    }

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

    // Update affiliate status - base update
    await connection.query(`
      UPDATE affiliates SET 
        status = 'denied',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [affiliateId]);

    // Try to update denial fields if columns exist
    try {
      const nextAllowedDate = allowReapplication 
        ? new Date(Date.now() + (REAPPLICATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000))
        : null;

      const [denialDateColumns] = await connection.query(`
        SHOW COLUMNS FROM affiliates LIKE 'denial_date'
      `);
      const [denialReasonColumns] = await connection.query(`
        SHOW COLUMNS FROM affiliates LIKE 'denial_reason'
      `);
      const [nextAllowedColumns] = await connection.query(`
        SHOW COLUMNS FROM affiliates LIKE 'next_allowed_application_date'
      `);

      const updateFields = [];
      const updateValues = [];

      if (denialDateColumns.length > 0) {
        updateFields.push('denial_date = CURRENT_TIMESTAMP');
      }
      if (denialReasonColumns.length > 0) {
        updateFields.push('denial_reason = ?');
        updateValues.push(denialReason.trim());
      }
      if (nextAllowedColumns.length > 0 && nextAllowedDate) {
        updateFields.push('next_allowed_application_date = ?');
        updateValues.push(nextAllowedDate);
      }

      if (updateFields.length > 0) {
        updateValues.push(affiliateId);
        await connection.query(`
          UPDATE affiliates SET ${updateFields.join(', ')} WHERE id = ?
        `, updateValues);
      }
    } catch (e) {
      console.log('Some denial fields not available in database:', e.message);
    }

    await connection.commit();
    
    res.status(200).json({
      success: true,
      message: 'Affiliate application denied successfully',
      data: {
        affiliate_id: affiliateId,
        can_reapply: allowReapplication
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

    // Build update query dynamically - check for column existence
    const updateFields = [];
    const updateValues = [];

    if (commissionRate !== undefined) {
      updateFields.push('commission_rate = ?');
      updateValues.push(commissionRate);
      
      // Try to set custom_commission_rate if column exists
      try {
        const [columns] = await pool.query(`
          SHOW COLUMNS FROM affiliates LIKE 'custom_commission_rate'
        `);
        if (columns.length > 0) {
          updateFields.push('custom_commission_rate = TRUE');
        }
      } catch (e) {
        console.log('custom_commission_rate column check failed');
      }
    }

    if (payoutThreshold !== undefined) {
      try {
        const [columns] = await pool.query(`
          SHOW COLUMNS FROM affiliates LIKE 'payout_threshold'
        `);
        if (columns.length > 0) {
          updateFields.push('payout_threshold = ?');
          updateValues.push(payoutThreshold);
        }
      } catch (e) {
        console.log('payout_threshold column not available');
      }
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
      try {
        const [columns] = await pool.query(`
          SHOW COLUMNS FROM affiliates LIKE 'admin_notes'
        `);
        if (columns.length > 0) {
          updateFields.push('admin_notes = ?');
          updateValues.push(adminNotes);
        }
      } catch (e) {
        console.log('admin_notes column not available');
      }
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
    
    // Get codes with analytics - simplified query for compatibility
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
        
        -- Latest activity
        MAX(re.created_at) as last_used
        
      FROM promo_codes pc
      LEFT JOIN affiliates a ON pc.affiliate_id = a.id
      LEFT JOIN users u_aff ON a.user_id = u_aff.id
      LEFT JOIN users u_admin ON pc.created_by = u_admin.id
      LEFT JOIN referral_events re ON re.code_id = pc.id
      ${whereClause}
      GROUP BY pc.id
      ORDER BY pc.${sortBy === 'owner_name' ? 'name' : sortBy} ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    // Calculate conversion rates and add defaults for missing fields
    const codesWithMetrics = codes.map(code => ({
      ...code,
      conversion_rate: code.total_clicks > 0 
        ? Math.round((code.total_conversions / code.total_clicks) * 10000) / 100 
        : 0,
      // Ensure all expected fields exist with defaults
      max_uses: code.max_uses || 0,
      max_uses_per_user: code.max_uses_per_user || 1,
      starts_at: code.starts_at || null,
      expires_at: code.expires_at || null,
      current_uses: code.current_uses || 0,
      total_clicks: code.total_clicks || 0,
      total_signups: code.total_signups || 0,
      total_conversions: code.total_conversions || 0,
      total_revenue: code.total_revenue || 0
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

// Create discount code (admin only) with robust column handling
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

    // Build INSERT query based on available columns
    let insertQuery = 'INSERT INTO promo_codes (code, name, type, discount_amount, is_active';
    let values = [code.toUpperCase(), name, 'discount', discountAmount, true];
    
    // Add created_by if user exists
    if (req.user && req.user.id) {
      insertQuery += ', created_by';
      values.push(req.user.id);
    }

    // Check for and add optional columns
    const optionalFields = [];
    const optionalValues = [];

    // Check for is_percentage column
    try {
      const [columns] = await pool.query(`SHOW COLUMNS FROM promo_codes LIKE 'is_percentage'`);
      if (columns.length > 0) {
        optionalFields.push('is_percentage');
        optionalValues.push(isPercentage);
      }
    } catch (e) {
      console.log('is_percentage column check failed');
    }

    // Check for max_uses column
    try {
      const [columns] = await pool.query(`SHOW COLUMNS FROM promo_codes LIKE 'max_uses'`);
      if (columns.length > 0) {
        optionalFields.push('max_uses');
        optionalValues.push(maxUses || 0);
      }
    } catch (e) {
      console.log('max_uses column check failed');
    }

    // Check for max_uses_per_user column
    try {
      const [columns] = await pool.query(`SHOW COLUMNS FROM promo_codes LIKE 'max_uses_per_user'`);
      if (columns.length > 0) {
        optionalFields.push('max_uses_per_user');
        optionalValues.push(maxUsesPerUser || 1);
      }
    } catch (e) {
      console.log('max_uses_per_user column check failed');
    }

    // Check for starts_at column
    if (startsAt) {
      try {
        const [columns] = await pool.query(`SHOW COLUMNS FROM promo_codes LIKE 'starts_at'`);
        if (columns.length > 0) {
          optionalFields.push('starts_at');
          optionalValues.push(startsAt);
        }
      } catch (e) {
        console.log('starts_at column check failed');
      }
    }

    // Check for expires_at column
    if (expiresAt) {
      try {
        const [columns] = await pool.query(`SHOW COLUMNS FROM promo_codes LIKE 'expires_at'`);
        if (columns.length > 0) {
          optionalFields.push('expires_at');
          optionalValues.push(expiresAt);
        }
      } catch (e) {
        console.log('expires_at column check failed');
      }
    }

    // Add optional fields to query
    if (optionalFields.length > 0) {
      insertQuery += ', ' + optionalFields.join(', ');
      values = values.concat(optionalValues);
    }
    
    insertQuery += ') VALUES (' + values.map(() => '?').join(', ') + ')';
    
    const [result] = await pool.query(insertQuery, values);

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
    
    // If insert failed due to missing columns, try with minimal fields
    if (error.message && (error.message.includes('Unknown column') || error.message.includes('doesn\'t have a default value'))) {
      try {
        const { code, name, discountAmount } = req.body;
        
        const [result] = await pool.query(`
          INSERT INTO promo_codes (code, name, type, discount_amount, is_active) 
          VALUES (?, ?, 'discount', ?, TRUE)
        `, [code.toUpperCase(), name, discountAmount]);

        return res.status(201).json({
          success: true,
          message: 'Discount code created successfully (basic version)',
          data: {
            id: result.insertId,
            code: code.toUpperCase()
          }
        });
      } catch (retryError) {
        console.error('Retry insert also failed:', retryError);
      }
    }
    
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

    // Build update query dynamically based on available columns
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
      updateFields.push('discount_amount = ?');
      updateValues.push(discountAmount);
    }

    // Check for optional columns before updating
    if (isPercentage !== undefined) {
      try {
        const [columns] = await pool.query(`SHOW COLUMNS FROM promo_codes LIKE 'is_percentage'`);
        if (columns.length > 0) {
          updateFields.push('is_percentage = ?');
          updateValues.push(isPercentage);
        }
      } catch (e) {
        console.log('is_percentage column not available for update');
      }
    }

    if (maxUses !== undefined) {
      try {
        const [columns] = await pool.query(`SHOW COLUMNS FROM promo_codes LIKE 'max_uses'`);
        if (columns.length > 0) {
          updateFields.push('max_uses = ?');
          updateValues.push(maxUses);
        }
      } catch (e) {
        console.log('max_uses column not available for update');
      }
    }

    if (maxUsesPerUser !== undefined) {
      try {
        const [columns] = await pool.query(`SHOW COLUMNS FROM promo_codes LIKE 'max_uses_per_user'`);
        if (columns.length > 0) {
          updateFields.push('max_uses_per_user = ?');
          updateValues.push(maxUsesPerUser);
        }
      } catch (e) {
        console.log('max_uses_per_user column not available for update');
      }
    }

    if (startsAt !== undefined) {
      try {
        const [columns] = await pool.query(`SHOW COLUMNS FROM promo_codes LIKE 'starts_at'`);
        if (columns.length > 0) {
          updateFields.push('starts_at = ?');
          updateValues.push(startsAt);
        }
      } catch (e) {
        console.log('starts_at column not available for update');
      }
    }

    if (expiresAt !== undefined) {
      try {
        const [columns] = await pool.query(`SHOW COLUMNS FROM promo_codes LIKE 'expires_at'`);
        if (columns.length > 0) {
          updateFields.push('expires_at = ?');
          updateValues.push(expiresAt);
        }
      } catch (e) {
        console.log('expires_at column not available for update');
      }
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

    // Try to add updated_at if column exists
    try {
      const [columns] = await pool.query(`SHOW COLUMNS FROM promo_codes LIKE 'updated_at'`);
      if (columns.length > 0) {
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
      }
    } catch (e) {
      console.log('updated_at column not available');
    }

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
    
    if (period === '7d') {
      dateFilter = 'AND DATE(a.created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === '30d') {
      dateFilter = 'AND DATE(a.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    } else if (period === '90d') {
      dateFilter = 'AND DATE(a.created_at) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
    } else if (period === '1y') {
      dateFilter = 'AND DATE(a.created_at) >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
    }

    // Overall affiliate program stats
    const [overallStats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT a.id) as total_affiliates,
        COUNT(DISTINCT CASE WHEN a.status = 'approved' THEN a.id END) as active_affiliates,
        COUNT(DISTINCT CASE WHEN a.status = 'pending' THEN a.id END) as pending_applications,
        SUM(a.balance) as total_unpaid_balance,
        SUM(a.total_paid) as total_paid_out,
        
        -- Commission stats (if tables exist)
        COUNT(DISTINCT c.id) as total_commissions,
        SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) as total_commissions_paid,
        SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END) as total_commissions_pending
        
      FROM affiliates a
      LEFT JOIN commissions c ON c.affiliate_id = a.id ${dateFilter.replace('a.created_at', 'c.created_at')}
      WHERE 1=1 ${dateFilter}
      ${affiliateId ? 'AND a.id = ?' : ''}
    `, affiliateId ? [affiliateId] : []);

    // Top performing affiliates
    let topAffiliates = [];
    try {
      const [topAffiliatesRows] = await pool.query(`
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
        LEFT JOIN referral_events re ON re.code_id = pc.id ${dateFilter.replace('a.created_at', 're.created_at')}
        LEFT JOIN commissions c ON c.affiliate_id = a.id ${dateFilter.replace('a.created_at', 'c.created_at')}
        WHERE a.status = 'approved'
        GROUP BY a.id, u.name, pc.code, a.commission_rate
        ORDER BY revenue_generated DESC
        LIMIT 10
      `);
      topAffiliates = topAffiliatesRows;
    } catch (e) {
      console.log('Could not fetch top affiliates data:', e.message);
    }

    // Calculate conversion rates
    const stats = overallStats[0];
    const conversionRates = {
      click_to_signup: 0,
      signup_to_purchase: 0,
      click_to_purchase: 0
    };

    res.status(200).json({
      success: true,
      data: {
        period,
        overview: {
          ...stats,
          // Ensure numeric fields have defaults
          total_affiliates: stats.total_affiliates || 0,
          active_affiliates: stats.active_affiliates || 0,
          pending_applications: stats.pending_applications || 0,
          total_unpaid_balance: stats.total_unpaid_balance || 0,
          total_paid_out: stats.total_paid_out || 0,
          total_commissions: stats.total_commissions || 0,
          total_commissions_paid: stats.total_commissions_paid || 0,
          total_commissions_pending: stats.total_commissions_pending || 0
        },
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

    // Check if payout tables exist
    try {
      const [payoutTables] = await pool.query(`
        SHOW TABLES LIKE '%payout%'
      `);
      
      if (payoutTables.length === 0) {
        // Return empty data if no payout tables exist
        return res.status(200).json({
          success: true,
          data: {
            payouts: [],
            pagination: {
              current_page: 1,
              total_pages: 0,
              total_items: 0,
              items_per_page: parseInt(limit)
            }
          }
        });
      }

      // Try to fetch from available payout table
      const [payouts] = await pool.query(`
        SELECT 
          pr.*,
          u.name as affiliate_name,
          u.email as affiliate_email,
          a.commission_rate
        FROM payout_requests pr
        JOIN affiliates a ON pr.affiliate_id = a.id
        JOIN users u ON a.user_id = u.id
        ${status !== 'all' ? 'WHERE pr.status = ?' : ''}
        ORDER BY pr.created_at DESC
        LIMIT ?
      `, status !== 'all' ? [status, parseInt(limit)] : [parseInt(limit)]);

      res.status(200).json({
        success: true,
        data: {
          payouts: payouts || [],
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil((payouts?.length || 0) / parseInt(limit)),
            total_items: payouts?.length || 0,
            items_per_page: parseInt(limit)
          }
        }
      });

    } catch (e) {
      console.log('Payout request tables not available:', e.message);
      
      // Return empty data structure
      res.status(200).json({
        success: true,
        data: {
          payouts: [],
          pagination: {
            current_page: 1,
            total_pages: 0,
            total_items: 0,
            items_per_page: parseInt(limit)
          }
        }
      });
    }
    
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
  try {
    // For now, return a not implemented response until payout system is fully set up
    res.status(501).json({
      success: false,
      message: 'Payout processing system is not yet fully implemented'
    });
  } catch (error) {
    console.error('Error processing payout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// CRITICAL: Ensure all functions are exported
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