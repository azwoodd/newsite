// server/controllers/adminAffiliateController.js - COMPLETE FILE WITH ALL ORIGINAL FUNCTIONALITY + FIXES
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
// Get affiliates with comprehensive data
const [affiliates] = await pool.query(`
  SELECT 
    a.*,
    u.name,
    u.email,
    pc.code as affiliate_code,
    
    -- Commission stats (with error handling)
    COALESCE(commission_stats.total_commissions, 0) as total_commissions,
    COALESCE(commission_stats.pending_commissions, 0) as pending_commissions,
    COALESCE(commission_stats.paid_commissions, 0) as paid_commissions,
    COALESCE(commission_stats.total_earnings, 0) as total_earnings,
    COALESCE(commission_stats.pending_earnings, 0) as pending_earnings,
    
    -- Referral stats (with error handling)
    COALESCE(referral_stats.total_clicks, 0) as total_clicks,
    COALESCE(referral_stats.total_signups, 0) as total_signups,
    COALESCE(referral_stats.total_conversions, 0) as total_conversions,
    COALESCE(referral_stats.conversion_rate, 0) as conversion_rate
    
  FROM affiliates a
  JOIN users u ON a.user_id = u.id
  LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id AND pc.type = 'affiliate'
  
  -- Left join commission stats (optional)
  LEFT JOIN (
    SELECT 
      affiliate_id,
      COUNT(*) as total_commissions,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_commissions,
      COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_commissions,
      SUM(amount) as total_earnings,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_earnings
    FROM commissions 
    GROUP BY affiliate_id
  ) commission_stats ON commission_stats.affiliate_id = a.id
  
  -- Left join referral stats (optional)
  LEFT JOIN (
    SELECT 
      pc_inner.affiliate_id,
      COUNT(DISTINCT CASE WHEN re.event_type = 'click' THEN re.id END) as total_clicks,
      COUNT(DISTINCT CASE WHEN re.event_type = 'signup' THEN re.id END) as total_signups,
      COUNT(DISTINCT CASE WHEN re.event_type = 'purchase' THEN re.id END) as total_conversions,
      CASE 
        WHEN COUNT(DISTINCT CASE WHEN re.event_type = 'click' THEN re.id END) > 0 THEN
          ROUND((COUNT(DISTINCT CASE WHEN re.event_type = 'purchase' THEN re.id END) * 100.0 / 
                 COUNT(DISTINCT CASE WHEN re.event_type = 'click' THEN re.id END)), 2)
        ELSE 0 
      END as conversion_rate
    FROM promo_codes pc_inner
    LEFT JOIN referral_events re ON re.code_id = pc_inner.id
    WHERE pc_inner.type = 'affiliate'
    GROUP BY pc_inner.affiliate_id
  ) referral_stats ON referral_stats.affiliate_id = a.id
  
  ${whereClause}
  ORDER BY ${validSortBy === 'name' ? 'u.name' : validSortBy === 'email' ? 'u.email' : `a.${validSortBy}`} ${validSortOrder}
  LIMIT ? OFFSET ?
`, [...queryParams, parseInt(limit), offset]);

// ✅ NEW: Convert string decimals to numbers
const parsedAffiliates = affiliates.map(affiliate => ({
  ...affiliate,
  balance: parseFloat(affiliate.balance) || 0,
  total_paid: parseFloat(affiliate.total_paid) || 0,
  commission_rate: parseFloat(affiliate.commission_rate) || 0,
  payout_threshold: parseFloat(affiliate.payout_threshold) || 50,
  total_earnings: parseFloat(affiliate.total_earnings) || 0,
  pending_earnings: parseFloat(affiliate.pending_earnings) || 0
}));

// ✅ FIXED: Flatten response - remove data wrapper
res.status(200).json({
  success: true,
  affiliates: parsedAffiliates,
  pagination: {
    page: parseInt(page),
    limit: parseInt(limit),
    total: totalAffiliates,
    totalPages: Math.ceil(totalAffiliates / parseInt(limit)),
    hasNext: (parseInt(page) * parseInt(limit)) < totalAffiliates,
    hasPrev: parseInt(page) > 1
  }
});

// Approve affiliate application
const approveAffiliate = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { affiliateId } = req.params;
    const { 
      commissionRate = DEFAULT_COMMISSION_RATE, 
      adminNotes = '',
      payoutThreshold = 50.00
    } = req.body;

    // Validate commission rate
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 50) {
      return res.status(400).json({
        success: false,
        message: 'Commission rate must be between 0% and 50%'
      });
    }

    // Get affiliate info
    const [affiliateRows] = await connection.query(
      'SELECT a.*, u.name FROM affiliates a JOIN users u ON a.user_id = u.id WHERE a.id = ?',
      [affiliateId]
    );

    if (affiliateRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found'
      });
    }

    const affiliate = affiliateRows[0];

    if (affiliate.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Affiliate is already approved'
      });
    }

    // Update affiliate status with flexible field handling
    let updateFields = ['status = ?', 'commission_rate = ?', 'approval_date = CURRENT_TIMESTAMP'];
    let updateValues = ['approved', rate];

    // Add optional fields that might not exist in all database versions
    if (payoutThreshold !== undefined) {
      try {
        const [columns] = await connection.query(`
          SHOW COLUMNS FROM affiliates LIKE 'payout_threshold'
        `);
        if (columns.length > 0) {
          updateFields.push('payout_threshold = ?');
          updateValues.push(payoutThreshold);
        }
      } catch (e) {
        console.log('payout_threshold column check failed, skipping');
      }
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
  try {
    const { affiliateId } = req.params;
    const { 
      denialReason = 'Application does not meet current requirements',
      allowReapplication = true
    } = req.body;

    // Get affiliate info
    const [affiliateRows] = await pool.query(
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

    if (affiliate.status === 'denied') {
      return res.status(400).json({
        success: false,
        message: 'Affiliate application is already denied'
      });
    }

    // Calculate next allowed application date
    const nextAllowedDate = allowReapplication 
      ? new Date(Date.now() + (REAPPLICATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000))
      : null;

    // Update affiliate status with flexible field handling
    let updateFields = ['status = ?', 'denial_date = CURRENT_TIMESTAMP'];
    let updateValues = ['denied'];

    // Add optional fields if they exist
    try {
      const [columns] = await pool.query(`
        SHOW COLUMNS FROM affiliates LIKE 'denial_reason'
      `);
      if (columns.length > 0) {
        updateFields.push('denial_reason = ?');
        updateValues.push(denialReason);
      }
    } catch (e) {
      console.log('denial_reason column not available');
    }

    if (nextAllowedDate) {
      try {
        const [columns] = await pool.query(`
          SHOW COLUMNS FROM affiliates LIKE 'next_allowed_application_date'
        `);
        if (columns.length > 0) {
          updateFields.push('next_allowed_application_date = ?');
          updateValues.push(nextAllowedDate);
        }
      } catch (e) {
        console.log('next_allowed_application_date column not available');
      }
    }

    updateValues.push(affiliateId);

    await pool.query(`
      UPDATE affiliates SET ${updateFields.join(', ')} WHERE id = ?
    `, updateValues);

    res.status(200).json({
      success: true,
      message: 'Affiliate application denied',
      data: {
        affiliate_id: affiliateId,
        denial_reason: denialReason,
        next_allowed_application: nextAllowedDate
      }
    });
    
  } catch (error) {
    console.error('Error denying affiliate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deny affiliate',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update affiliate settings
const updateAffiliateSettings = async (req, res) => {
  try {
    const { affiliateId } = req.params;
    const { 
      commissionRate, 
      status, 
      payoutThreshold, 
      adminNotes 
    } = req.body;

    // Validate inputs
    if (commissionRate !== undefined) {
      const rate = parseFloat(commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 50) {
        return res.status(400).json({
          success: false,
          message: 'Commission rate must be between 0% and 50%'
        });
      }
    }

    // Build update query dynamically
    let updateFields = [];
    let updateValues = [];

    if (commissionRate !== undefined) {
      updateFields.push('commission_rate = ?');
      updateValues.push(parseFloat(commissionRate));
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

// 🔧 FIXED: Get all promo codes with simplified query and better error handling
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

    console.log(`[DEBUG] getAllPromoCodes called with params:`, {
      type, status, page, limit, search, sortBy, sortOrder
    });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause with simplified conditions
    let whereConditions = ['1=1']; // Always true condition to simplify query building
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
    
    if (search && search.trim()) {
      whereConditions.push('(pc.code LIKE ? OR pc.name LIKE ?)');
      const searchPattern = `%${search.trim()}%`;
      queryParams.push(searchPattern, searchPattern);
    }
    
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    
    console.log(`[DEBUG] Where clause:`, whereClause);
    console.log(`[DEBUG] Query params:`, queryParams);
    
    // 🔧 FIX: Simplified query to get basic promo codes first
    const basicQuery = `
      SELECT 
        pc.id,
        pc.code,
        pc.name,
        pc.type,
        pc.affiliate_id,
        pc.created_by,
        pc.discount_amount,
        pc.is_percentage,
        pc.min_order_value,
        pc.max_uses,
        pc.current_uses,
        pc.max_uses_per_user,
        pc.expires_at,
        pc.starts_at,
        pc.is_active,
        pc.created_at,
        pc.updated_at
      FROM promo_codes pc
      ${whereClause}
      ORDER BY pc.${sortBy === 'owner_name' ? 'name' : sortBy} ${sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}
      LIMIT ? OFFSET ?
    `;

    console.log(`[DEBUG] Executing basic query:`, basicQuery);
    
    // Get basic promo codes data
    const [basicCodes] = await pool.query(basicQuery, [...queryParams, parseInt(limit), offset]);
    
    console.log(`[DEBUG] Basic codes result:`, {
      count: basicCodes.length,
      codes: basicCodes.map(c => ({ id: c.id, code: c.code, name: c.name, type: c.type }))
    });

    // Get total count with same conditions
    const countQuery = `
      SELECT COUNT(*) as total
      FROM promo_codes pc
      ${whereClause}
    `;
    
    const [countResult] = await pool.query(countQuery, queryParams);
    const totalCodes = countResult[0].total;
    
    console.log(`[DEBUG] Total count:`, totalCodes);

    // 🔧 FIX: Enhance codes with owner info using separate queries to avoid JOIN issues
    const enhancedCodes = await Promise.all(basicCodes.map(async (code) => {
      let ownerName = 'System';
      let ownerEmail = null;
      let affiliateStatus = null;
      
      try {
        if (code.affiliate_id) {
          // Get affiliate owner info
          const [affiliateRows] = await pool.query(`
            SELECT u.name, u.email, a.status
            FROM affiliates a 
            JOIN users u ON a.user_id = u.id 
            WHERE a.id = ?
          `, [code.affiliate_id]);
          
          if (affiliateRows.length > 0) {
            ownerName = affiliateRows[0].name;
            ownerEmail = affiliateRows[0].email;
            affiliateStatus = affiliateRows[0].status;
          }
        } else if (code.created_by) {
          // Get admin creator info
          const [userRows] = await pool.query(`
            SELECT name, email FROM users WHERE id = ?
          `, [code.created_by]);
          
          if (userRows.length > 0) {
            ownerName = userRows[0].name;
            ownerEmail = userRows[0].email;
          }
        }
      } catch (error) {
        console.log(`[DEBUG] Error getting owner info for code ${code.id}:`, error.message);
        // Continue with default values
      }

      // Get basic analytics with error handling
      let totalClicks = 0;
      let totalConversions = 0;
      let totalRevenue = 0;
      let lastUsed = null;

      try {
        const [analyticsRows] = await pool.query(`
          SELECT 
            COUNT(DISTINCT CASE WHEN event_type = 'click' THEN id END) as clicks,
            COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN id END) as conversions,
            SUM(CASE WHEN event_type = 'purchase' THEN conversion_value ELSE 0 END) as revenue,
            MAX(created_at) as last_used
          FROM referral_events 
          WHERE code_id = ?
        `, [code.id]);

        if (analyticsRows.length > 0) {
          totalClicks = analyticsRows[0].clicks || 0;
          totalConversions = analyticsRows[0].conversions || 0;
          totalRevenue = analyticsRows[0].revenue || 0;
          lastUsed = analyticsRows[0].last_used;
        }
      } catch (error) {
        console.log(`[DEBUG] Analytics query failed for code ${code.id}, using defaults:`, error.message);
        // Continue with default values (0)
      }

      return {
        ...code,
        owner_name: ownerName,
        owner_email: ownerEmail,
        affiliate_status: affiliateStatus,
        total_clicks: totalClicks,
        total_conversions: totalConversions,
        total_revenue: parseFloat(totalRevenue) || 0,
        conversion_rate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : '0.00',
        last_used: lastUsed
      };
    }));

    console.log(`[DEBUG] Enhanced codes:`, {
      count: enhancedCodes.length,
      sample: enhancedCodes[0] ? {
        code: enhancedCodes[0].code,
        name: enhancedCodes[0].name,
        owner_name: enhancedCodes[0].owner_name
      } : null
    });

    const responseData = {
      codes: enhancedCodes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCodes,
        totalPages: Math.ceil(totalCodes / parseInt(limit)),
        hasNext: (parseInt(page) * parseInt(limit)) < totalCodes,
        hasPrev: parseInt(page) > 1
      }
    };

    console.log(`[DEBUG] Final response:`, {
      codesCount: responseData.codes.length,
      pagination: responseData.pagination
    });

    res.status(200).json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error('Error getting promo codes:', error);
    
    // 🔧 FIX: Return safe fallback structure
    res.status(500).json({
      success: false,
      message: 'Failed to get promo codes',
      data: {
        codes: [],
        pagination: {
          page: parseInt(req.query.page) || 1,
          limit: parseInt(req.query.limit) || 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      },
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 🔧 FIXED: Create discount code with better error handling
const createDiscountCode = async (req, res) => {
  try {
    const {
      code,
      name,
      discountAmount,
      isPercentage = false,
      maxUses = 0,
      maxUsesPerUser = 1,
      startsAt = null,
      expiresAt = null
    } = req.body;

    console.log(`[DEBUG] Creating discount code:`, {
      code, name, discountAmount, isPercentage, maxUses, maxUsesPerUser
    });

    // Validation
    if (!code || !name || !discountAmount) {
      return res.status(400).json({
        success: false,
        message: 'Code, name, and discount amount are required'
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

    // 🔧 FIX: Insert with proper field handling
    const insertData = {
      code: code.toUpperCase(),
      name: name,
      type: 'discount',
      created_by: req.user.id,
      discount_amount: parseFloat(discountAmount),
      is_percentage: isPercentage ? 1 : 0,
      max_uses: parseInt(maxUses) || 0,
      max_uses_per_user: parseInt(maxUsesPerUser) || 1,
      is_active: 1,
      current_uses: 0
    };

    // Add optional dates if provided
    if (startsAt) {
      insertData.starts_at = new Date(startsAt);
    }
    if (expiresAt) {
      insertData.expires_at = new Date(expiresAt);
    }

    console.log(`[DEBUG] Insert data:`, insertData);

    const [result] = await pool.query(
      'INSERT INTO promo_codes SET ?',
      [insertData]
    );

    console.log(`[DEBUG] Insert result:`, { insertId: result.insertId, affectedRows: result.affectedRows });

    if (result.affectedRows === 0) {
      throw new Error('Failed to create promo code - no rows affected');
    }

    // Get the created code to return full data
    const [createdCode] = await pool.query(
      'SELECT * FROM promo_codes WHERE id = ?',
      [result.insertId]
    );

    console.log(`[DEBUG] Created code:`, createdCode[0]);

    res.status(201).json({
      success: true,
      message: 'Discount code created successfully!',
      data: {
        code: createdCode[0] || insertData
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
    const updateData = req.body;

    // Build update query dynamically
    let updateFields = [];
    let updateValues = [];

    const allowedFields = ['name', 'discount_amount', 'is_percentage', 'max_uses', 'max_uses_per_user', 'starts_at', 'expires_at', 'is_active'];
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updateData[field]);
      }
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
        SUM(a.total_paid) as total_paid_out
      FROM affiliates a
      WHERE 1=1 ${dateFilter}
      ${affiliateId ? 'AND a.id = ?' : ''}
    `, affiliateId ? [affiliateId] : []);

    // Get performance metrics by day/week
    const [performanceData] = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as new_affiliates,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count
      FROM affiliates 
      WHERE 1=1 ${dateFilter}
      ${affiliateId ? 'AND id = ?' : ''}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, affiliateId ? [affiliateId] : []);

    res.status(200).json({
      success: true,
      data: {
        overview: overallStats[0],
        performance: performanceData,
        period: period
      }
    });
    
  } catch (error) {
    console.error('Error getting affiliate analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
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
    let whereCondition = '';
    let queryParams = [];
    
    if (status !== 'all') {
      whereCondition = 'WHERE ap.status = ?';
      queryParams.push(status);
    }

    try {
      const [payouts] = await pool.query(`
        SELECT 
          ap.*,
          a.user_id,
          u.name as affiliate_name,
          u.email as affiliate_email
        FROM affiliate_payouts ap
        JOIN affiliates a ON ap.affiliate_id = a.id
        JOIN users u ON a.user_id = u.id
        ${whereCondition}
        ORDER BY ap.created_at DESC
        LIMIT ? OFFSET ?
      `, [...queryParams, parseInt(limit), offset]);

      // Get total count
      const [countResult] = await pool.query(`
        SELECT COUNT(*) as total
        FROM affiliate_payouts ap
        ${whereCondition}
      `, queryParams);

      res.status(200).json({
        success: true,
        data: {
          payouts,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult[0].total,
            totalPages: Math.ceil(countResult[0].total / parseInt(limit))
          }
        }
      });
    } catch (e) {
      console.log('Payout tables not available:', e.message);
      res.status(200).json({
        success: true,
        data: {
          payouts: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0
          }
        },
        message: 'Payout system not yet fully implemented'
      });
    }
    
  } catch (error) {
    console.error('Error getting payout requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payout requests',
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

// CRITICAL: Export all functions
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