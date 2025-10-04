// server/controllers/adminAffiliateController.js - COMPLETE FILE WITH ALL ORIGINAL FUNCTIONALITY + FIXES
const { pool } = require('../config/db');
const crypto = require('crypto');

// Constants
const DEFAULT_COMMISSION_RATE = 10.0;
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
      sortOrder = 'DESC',
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * pageSize;

    // Build WHERE clause
    const whereConditions = [];
    const queryParams = [];

    if (status !== 'all') {
      whereConditions.push('a.status = ?');
      queryParams.push(status);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      whereConditions.push('(u.name LIKE ? OR u.email LIKE ? OR pc.code LIKE ?)');
      queryParams.push(searchPattern, searchPattern, searchPattern);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Validate sort parameters
    const allowedSortFields = [
      'created_at',
      'status',
      'name',
      'email',
      'balance',
      'total_paid',
      'commission_rate',
    ];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const orderExpr =
      validSortBy === 'name' ? 'u.name' :
      validSortBy === 'email' ? 'u.email' :
      `a.${validSortBy}`;

    // Get total count
    const [countResult] = await pool.query(
      `
      SELECT COUNT(DISTINCT a.id) as total
      FROM affiliates a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id AND pc.type = 'affiliate'
      ${whereClause}
    `,
      queryParams
    );

    const totalAffiliates = Number(countResult?.[0]?.total || 0);

    // Get affiliates with comprehensive data
    const [affiliates] = await pool.query(
      `
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
      ORDER BY ${orderExpr} ${validSortOrder}
      LIMIT ? OFFSET ?
    `,
      [...queryParams, pageSize, offset]
    );

    // Convert string decimals to numbers
    const parsedAffiliates = affiliates.map((affiliate) => ({
      ...affiliate,
      balance: parseFloat(affiliate.balance) || 0,
      total_paid: parseFloat(affiliate.total_paid) || 0,
      commission_rate: parseFloat(affiliate.commission_rate) || 0,
      payout_threshold: parseFloat(affiliate.payout_threshold) || 50,
      total_earnings: parseFloat(affiliate.total_earnings) || 0,
      pending_earnings: parseFloat(affiliate.pending_earnings) || 0,
    }));

    // Flatten response
    res.status(200).json({
      success: true,
      affiliates: parsedAffiliates,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: totalAffiliates,
        totalPages: Math.ceil(totalAffiliates / pageSize),
        hasNext: pageNum * pageSize < totalAffiliates,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Error in getAllAffiliates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch affiliates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}; // <-- ✅ this was missing in your file

// Approve affiliate application
const approveAffiliate = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { affiliateId } = req.params;
    const {
      commissionRate = DEFAULT_COMMISSION_RATE,
      adminNotes = '',
      payoutThreshold = 50.0,
    } = req.body;

    // Validate commission rate
    const rate = parseFloat(commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 50) {
      return res.status(400).json({
        success: false,
        message: 'Commission rate must be between 0% and 50%',
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
        message: 'Affiliate not found',
      });
    }

    const affiliate = affiliateRows[0];

    if (affiliate.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Affiliate is already approved',
      });
    }

    // Update affiliate status with flexible field handling
    const updateFields = ['status = ?', 'commission_rate = ?', 'approval_date = CURRENT_TIMESTAMP'];
    const updateValues = ['approved', rate];

    // Optional columns
    if (payoutThreshold !== undefined) {
      try {
        const [columns] = await connection.query(`SHOW COLUMNS FROM affiliates LIKE 'payout_threshold'`);
        if (columns.length > 0) {
          updateFields.push('payout_threshold = ?');
          updateValues.push(payoutThreshold);
        }
      } catch {
        // ignore
      }
    }

    if (adminNotes) {
      try {
        const [columns] = await connection.query(`SHOW COLUMNS FROM affiliates LIKE 'admin_notes'`);
        if (columns.length > 0) {
          updateFields.push('admin_notes = ?');
          updateValues.push(adminNotes);
        }
      } catch {
        // ignore
      }
    }

    updateValues.push(affiliateId);

    await connection.query(
      `UPDATE affiliates SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Generate unique affiliate code
    let affiliateCode;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      affiliateCode = generateAffiliateCode();
      const [existingCode] = await connection.query('SELECT id FROM promo_codes WHERE code = ?', [
        affiliateCode,
      ]);
      if (existingCode.length === 0) isUnique = true;
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique affiliate code');
    }

    // Create affiliate promo code (flexible fallback)
    try {
      await connection.query(
        `
        INSERT INTO promo_codes (
          code, name, type, affiliate_id, created_by, 
          discount_amount, is_percentage, is_active
        ) VALUES (?, ?, 'affiliate', ?, ?, ?, TRUE, TRUE)
      `,
        [affiliateCode, `${affiliate.name}'s Affiliate Code`, affiliateId, req.user.id, rate]
      );
    } catch (e) {
      console.log('Full promo code insert failed, trying simplified:', e.message);
      await connection.query(
        `
        INSERT INTO promo_codes (
          code, name, type, affiliate_id, discount_amount, is_active
        ) VALUES (?, ?, 'affiliate', ?, ?, TRUE)
      `,
        [affiliateCode, `${affiliate.name}'s Affiliate Code`, affiliateId, rate]
      );
    }

    // Update user's affiliate_code if column exists
    try {
      await connection.query('UPDATE users SET affiliate_code = ? WHERE id = ?', [
        affiliateCode,
        affiliate.user_id,
      ]);
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
        commission_rate: rate,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error approving affiliate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve affiliate',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
      allowReapplication = true,
    } = req.body;

    // Get affiliate info
    const [affiliateRows] = await pool.query('SELECT * FROM affiliates WHERE id = ?', [affiliateId]);

    if (affiliateRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Affiliate not found',
      });
    }

    const affiliate = affiliateRows[0];

    if (affiliate.status === 'denied') {
      return res.status(400).json({
        success: false,
        message: 'Affiliate application is already denied',
      });
    }

    // Calculate next allowed application date
    const nextAllowedDate = allowReapplication
      ? new Date(Date.now() + REAPPLICATION_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
      : null;

    // Update affiliate status with flexible field handling
    const updateFields = ['status = ?', 'denial_date = CURRENT_TIMESTAMP'];
    const updateValues = ['denied'];

    try {
      const [columns] = await pool.query(`SHOW COLUMNS FROM affiliates LIKE 'denial_reason'`);
      if (columns.length > 0) {
        updateFields.push('denial_reason = ?');
        updateValues.push(denialReason);
      }
    } catch {
      // ignore
    }

    if (nextAllowedDate) {
      try {
        const [columns] = await pool.query(
          `SHOW COLUMNS FROM affiliates LIKE 'next_allowed_application_date'`
        );
        if (columns.length > 0) {
          updateFields.push('next_allowed_application_date = ?');
          updateValues.push(nextAllowedDate);
        }
      } catch {
        // ignore
      }
    }

    updateValues.push(affiliateId);

    await pool.query(`UPDATE affiliates SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

    res.status(200).json({
      success: true,
      message: 'Affiliate application denied',
      data: {
        affiliate_id: affiliateId,
        denial_reason: denialReason,
        next_allowed_application: nextAllowedDate,
      },
    });
  } catch (error) {
    console.error('Error denying affiliate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deny affiliate',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Update affiliate settings
const updateAffiliateSettings = async (req, res) => {
  try {
    const { affiliateId } = req.params;
    const { commissionRate, status, payoutThreshold, adminNotes } = req.body;

    // Validate inputs
    if (commissionRate !== undefined) {
      const rate = parseFloat(commissionRate);
      if (isNaN(rate) || rate < 0 || rate > 50) {
        return res.status(400).json({
          success: false,
          message: 'Commission rate must be between 0% and 50%',
        });
      }
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (commissionRate !== undefined) {
      updateFields.push('commission_rate = ?');
      updateValues.push(parseFloat(commissionRate));
    }

    if (payoutThreshold !== undefined) {
      try {
        const [columns] = await pool.query(`SHOW COLUMNS FROM affiliates LIKE 'payout_threshold'`);
        if (columns.length > 0) {
          updateFields.push('payout_threshold = ?');
          updateValues.push(payoutThreshold);
        }
      } catch {
        // ignore
      }
    }

    if (status !== undefined) {
      const validStatuses = ['approved', 'suspended'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be approved or suspended',
        });
      }
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (adminNotes !== undefined) {
      try {
        const [columns] = await pool.query(`SHOW COLUMNS FROM affiliates LIKE 'admin_notes'`);
        if (columns.length > 0) {
          updateFields.push('admin_notes = ?');
          updateValues.push(adminNotes);
        }
      } catch {
        // ignore
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(affiliateId);

    await pool.query(`UPDATE affiliates SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

    // If commission rate was updated, update the affiliate's promo code
    if (commissionRate !== undefined) {
      await pool.query(
        `
        UPDATE promo_codes SET 
          discount_amount = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE affiliate_id = ? AND type = 'affiliate'
      `,
        [commissionRate, affiliateId]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Affiliate settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating affiliate settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update affiliate settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get all promo codes with simplified query and better error handling
const getAllPromoCodes = async (req, res) => {
  try {
    const {
      type = 'all',
      status = 'all',
      page = 1,
      limit = 20,
      search = '',
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * pageSize;

    // WHERE
    const whereConditions = ['1=1'];
    const queryParams = [];

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
      const patt = `%${search.trim()}%`;
      whereConditions.push('(pc.code LIKE ? OR pc.name LIKE ?)');
      queryParams.push(patt, patt);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    const validOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const orderField = sortBy === 'owner_name' ? 'name' : sortBy;

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
      ORDER BY pc.${orderField} ${validOrder}
      LIMIT ? OFFSET ?
    `;

    const [basicCodes] = await pool.query(basicQuery, [...queryParams, pageSize, offset]);

    // Count
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM promo_codes pc ${whereClause}`,
      queryParams
    );
    const totalCodes = Number(countResult?.[0]?.total || 0);

    // Enhance with owner info + analytics
    const enhancedCodes = await Promise.all(
      basicCodes.map(async (code) => {
        let ownerName = 'System';
        let ownerEmail = null;
        let affiliateStatus = null;

        try {
          if (code.affiliate_id) {
            const [affiliateRows] = await pool.query(
              `
              SELECT u.name, u.email, a.status
              FROM affiliates a 
              JOIN users u ON a.user_id = u.id 
              WHERE a.id = ?
            `,
              [code.affiliate_id]
            );
            if (affiliateRows.length > 0) {
              ownerName = affiliateRows[0].name;
              ownerEmail = affiliateRows[0].email;
              affiliateStatus = affiliateRows[0].status;
            }
          } else if (code.created_by) {
            const [userRows] = await pool.query(
              `SELECT name, email FROM users WHERE id = ?`,
              [code.created_by]
            );
            if (userRows.length > 0) {
              ownerName = userRows[0].name;
              ownerEmail = userRows[0].email;
            }
          }
        } catch (e) {
          // ignore owner lookup errors
        }

        let totalClicks = 0;
        let totalConversions = 0;
        let totalRevenue = 0;
        let lastUsed = null;

        try {
          const [analyticsRows] = await pool.query(
            `
            SELECT 
              COUNT(DISTINCT CASE WHEN event_type = 'click' THEN id END) as clicks,
              COUNT(DISTINCT CASE WHEN event_type = 'purchase' THEN id END) as conversions,
              SUM(CASE WHEN event_type = 'purchase' THEN conversion_value ELSE 0 END) as revenue,
              MAX(created_at) as last_used
            FROM referral_events 
            WHERE code_id = ?
          `,
            [code.id]
          );

          if (analyticsRows.length > 0) {
            totalClicks = analyticsRows[0].clicks || 0;
            totalConversions = analyticsRows[0].conversions || 0;
            totalRevenue = analyticsRows[0].revenue || 0;
            lastUsed = analyticsRows[0].last_used;
          }
        } catch (e) {
          // ignore analytics errors
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
          last_used: lastUsed,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        codes: enhancedCodes,
        pagination: {
          page: pageNum,
          limit: pageSize,
          total: totalCodes,
          totalPages: Math.ceil(totalCodes / pageSize),
          hasNext: pageNum * pageSize < totalCodes,
          hasPrev: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error('Error getting promo codes:', error);
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
          hasPrev: false,
        },
      },
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Create discount code with better error handling
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
      expiresAt = null,
    } = req.body;

    if (!code || !name || !discountAmount) {
      return res.status(400).json({
        success: false,
        message: 'Code, name, and discount amount are required',
      });
    }

    // Check if code already exists
    const [existingCode] = await pool.query('SELECT id FROM promo_codes WHERE code = ?', [
      String(code).toUpperCase(),
    ]);
    if (existingCode.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A promo code with this code already exists',
      });
    }

    // Insert
    const insertData = {
      code: String(code).toUpperCase(),
      name,
      type: 'discount',
      created_by: req.user.id,
      discount_amount: parseFloat(discountAmount),
      is_percentage: isPercentage ? 1 : 0,
      max_uses: parseInt(maxUses, 10) || 0,
      max_uses_per_user: parseInt(maxUsesPerUser, 10) || 1,
      is_active: 1,
      current_uses: 0,
    };
    if (startsAt) insertData.starts_at = new Date(startsAt);
    if (expiresAt) insertData.expires_at = new Date(expiresAt);

    const [result] = await pool.query('INSERT INTO promo_codes SET ?', [insertData]);
    if (!result.affectedRows) throw new Error('Failed to create promo code');

    const [createdCode] = await pool.query('SELECT * FROM promo_codes WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Discount code created successfully!',
      data: {
        code: createdCode[0] || insertData,
      },
    });
  } catch (error) {
    console.error('Error creating discount code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create discount code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Update promo code
const updatePromoCode = async (req, res) => {
  try {
    const { codeId } = req.params;
    const updateData = req.body;

    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'name',
      'discount_amount',
      'is_percentage',
      'max_uses',
      'max_uses_per_user',
      'starts_at',
      'expires_at',
      'is_active',
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(updateData, field)) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updateData[field]);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(codeId);

    const [result] = await pool.query(
      `UPDATE promo_codes SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: 'Promo code not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Promo code updated successfully',
    });
  } catch (error) {
    console.error('Error updating promo code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update promo code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get affiliate analytics and performance metrics
const getAffiliateAnalytics = async (req, res) => {
  try {
    const { period = '30d', affiliateId } = req.query;

    // Date filter
    let dateFilter = '';
    if (period === '7d') dateFilter = 'AND DATE(a.created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    else if (period === '30d') dateFilter = 'AND DATE(a.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    else if (period === '90d') dateFilter = 'AND DATE(a.created_at) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)';
    else if (period === '1y') dateFilter = 'AND DATE(a.created_at) >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';

    // Overall stats
    const [overallStats] = await pool.query(
      `
      SELECT 
        COUNT(DISTINCT a.id) as total_affiliates,
        COUNT(DISTINCT CASE WHEN a.status = 'approved' THEN a.id END) as active_affiliates,
        COUNT(DISTINCT CASE WHEN a.status = 'pending' THEN a.id END) as pending_applications,
        SUM(a.balance) as total_unpaid_balance,
        SUM(a.total_paid) as total_paid_out
      FROM affiliates a
      WHERE 1=1 ${dateFilter}
      ${affiliateId ? 'AND a.id = ?' : ''}
    `,
      affiliateId ? [affiliateId] : []
    );

    // Performance by day
    const [performanceData] = await pool.query(
      `
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
    `,
      affiliateId ? [affiliateId] : []
    );

    res.status(200).json({
      success: true,
      data: {
        overview: overallStats[0],
        performance: performanceData,
        period,
      },
    });
  } catch (error) {
    console.error('Error getting affiliate analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get payout requests
const getPayoutRequests = async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * pageSize;

    let whereCondition = '';
    const queryParams = [];

    if (status !== 'all') {
      whereCondition = 'WHERE ap.status = ?';
      queryParams.push(status);
    }

    try {
      const [payouts] = await pool.query(
        `
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
      `,
        [...queryParams, pageSize, offset]
      );

      const [countResult] = await pool.query(
        `
        SELECT COUNT(*) as total
        FROM affiliate_payouts ap
        ${whereCondition}
      `,
        queryParams
      );

      res.status(200).json({
        success: true,
        data: {
          payouts,
          pagination: {
            page: pageNum,
            limit: pageSize,
            total: Number(countResult?.[0]?.total || 0),
            totalPages: Math.ceil((Number(countResult?.[0]?.total || 0)) / pageSize),
          },
        },
      });
    } catch (e) {
      console.log('Payout tables not available:', e.message);
      res.status(200).json({
        success: true,
        data: {
          payouts: [],
          pagination: {
            page: pageNum,
            limit: pageSize,
            total: 0,
            totalPages: 0,
          },
        },
        message: 'Payout system not yet fully implemented',
      });
    }
  } catch (error) {
    console.error('Error getting payout requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payout requests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Process payout (placeholder)
const processPayout = async (req, res) => {
  try {
    res.status(501).json({
      success: false,
      message: 'Payout processing system is not yet fully implemented',
    });
  } catch (error) {
    console.error('Error processing payout:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
  processPayout,
};
