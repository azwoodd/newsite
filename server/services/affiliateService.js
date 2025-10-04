// server/services/affiliateService.js
const { pool } = require('../config/db');
const crypto = require('crypto');

class AffiliateService {
  /**
   * Track a referral click event
   * @param {string} code - The affiliate code
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} Tracking result
   */
  async trackClick(code, req, res) {
    if (!process.env.FEATURE_AFFILIATES === 'true') {
      return { success: false, error: 'Affiliate feature is disabled' };
    }

    try {
      // Get affiliate code details
      const [codeRows] = await pool.query(`
        SELECT pc.id, pc.code, pc.affiliate_id, a.status
        FROM promo_codes pc
        JOIN affiliates a ON pc.affiliate_id = a.id
        WHERE pc.code = ? AND pc.type = 'affiliate' AND pc.is_active = 1
      `, [code.toUpperCase()]);

      if (codeRows.length === 0) {
        return { success: false, error: 'Invalid affiliate code' };
      }

      const promoCode = codeRows[0];

      if (promoCode.status !== 'approved') {
        return { success: false, error: 'Affiliate not approved' };
      }

      // Generate session ID if not exists
      let sessionId = req.session?.id || this.generateSessionId();
      
      // Hash IP and User Agent for privacy
      const ipHash = this.hashData(req.ip || 'unknown');
      const uaHash = this.hashData(req.get('User-Agent') || 'unknown');

      // Check for recent duplicate clicks (fraud prevention)
      const [recentClicks] = await pool.query(`
        SELECT COUNT(*) as count
        FROM referral_events
        WHERE code_id = ? 
          AND ip_address = ? 
          AND event_type = 'click'
          AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
      `, [promoCode.id, ipHash]);

      if (recentClicks[0].count > 10) {
        return { success: false, error: 'Too many clicks from this IP' };
      }

      // Record the click event
      await pool.query(`
        INSERT INTO referral_events 
        (code_id, ip_address, user_agent, referrer_url, event_type, session_id)
        VALUES (?, ?, ?, ?, 'click', ?)
      `, [
        promoCode.id,
        ipHash,
        uaHash,
        req.get('Referer') || null,
        sessionId
      ]);

      // Set tracking cookie
      this.setTrackingCookie(res, promoCode.id, sessionId);

      return { 
        success: true, 
        codeId: promoCode.id,
        sessionId 
      };

    } catch (error) {
      console.error('Error tracking affiliate click:', error);
      return { success: false, error: 'Failed to track click' };
    }
  }

  /**
   * Track a signup event
   * @param {number} userId - The new user ID
   * @param {Object} req - Express request object
   * @returns {Object} Tracking result
   */
  async trackSignup(userId, req) {
    if (!process.env.FEATURE_AFFILIATES === 'true') {
      return { success: false };
    }

    try {
      const trackingData = this.getTrackingFromCookie(req);
      
      if (!trackingData) {
        return { success: false, error: 'No tracking data found' };
      }

      // Record signup event
      await pool.query(`
        INSERT INTO referral_events 
        (code_id, user_id, ip_address, user_agent, event_type, session_id)
        VALUES (?, ?, ?, ?, 'signup', ?)
      `, [
        trackingData.codeId,
        userId,
        this.hashData(req.ip || 'unknown'),
        this.hashData(req.get('User-Agent') || 'unknown'),
        trackingData.sessionId
      ]);

      return { success: true, codeId: trackingData.codeId };

    } catch (error) {
      console.error('Error tracking signup:', error);
      return { success: false, error: 'Failed to track signup' };
    }
  }

  /**
   * Determine attribution for an order
   * @param {number} userId - The user ID
   * @param {Object} req - Express request object
   * @returns {Object} Attribution result
   */
  async getAttribution(userId, req) {
    if (!process.env.FEATURE_AFFILIATES === 'true') {
      return { affiliateId: null, codeId: null };
    }

    try {
      const attributionMethod = process.env.AFFIL_ATTRIBUTION || 'LAST_CLICK';
      
      // Get tracking data from cookie (most recent)
      const cookieData = this.getTrackingFromCookie(req);
      
      // Get historical clicks for this user
      const [clickEvents] = await pool.query(`
        SELECT re.code_id, pc.affiliate_id, re.created_at
        FROM referral_events re
        JOIN promo_codes pc ON re.code_id = pc.id
        WHERE re.user_id = ? 
          AND re.event_type = 'click'
          AND re.created_at > DATE_SUB(NOW(), INTERVAL ? DAY)
        ORDER BY re.created_at ${attributionMethod === 'FIRST_CLICK' ? 'ASC' : 'DESC'}
        LIMIT 1
      `, [userId, parseInt(process.env.AFFIL_COOKIE_DAYS) || 30]);

      let selectedAttribution = null;

      if (attributionMethod === 'LAST_CLICK' && cookieData) {
        // Use cookie data for last click
        const [codeCheck] = await pool.query(`
          SELECT affiliate_id FROM promo_codes WHERE id = ?
        `, [cookieData.codeId]);
        
        if (codeCheck.length > 0) {
          selectedAttribution = {
            affiliateId: codeCheck[0].affiliate_id,
            codeId: cookieData.codeId
          };
        }
      } else if (clickEvents.length > 0) {
        // Use database record
        selectedAttribution = {
          affiliateId: clickEvents[0].affiliate_id,
          codeId: clickEvents[0].code_id
        };
      }

      return selectedAttribution || { affiliateId: null, codeId: null };

    } catch (error) {
      console.error('Error determining attribution:', error);
      return { affiliateId: null, codeId: null };
    }
  }

  /**
   * Track a purchase event and create commission
   * @param {number} orderId - The order ID
   * @param {number} userId - The user ID
   * @param {number} orderTotal - The order total
   * @param {number} discountAmount - Any discount applied
   * @param {Object} req - Express request object
   * @returns {Object} Tracking result
   */
  async trackPurchase(orderId, userId, orderTotal, discountAmount = 0, req) {
    if (!process.env.FEATURE_AFFILIATES === 'true') {
      return { success: false };
    }

    try {
      const attribution = await this.getAttribution(userId, req);
      
      if (!attribution.affiliateId) {
        return { success: false, error: 'No attribution found' };
      }

      // Check for self-referral fraud
      const [affiliateCheck] = await pool.query(`
        SELECT user_id FROM affiliates WHERE id = ?
      `, [attribution.affiliateId]);

      if (affiliateCheck.length > 0 && affiliateCheck[0].user_id === userId) {
        console.log('Self-referral blocked for user:', userId);
        return { success: false, error: 'Self-referral not allowed' };
      }

      // Calculate commission basis
      const commissionBasis = process.env.AFFIL_BASIS === 'pre_discount' 
        ? orderTotal 
        : Math.max(0, orderTotal - discountAmount);

      // Get commission rate
      const [affiliateData] = await pool.query(`
        SELECT commission_rate FROM affiliates WHERE id = ?
      `, [attribution.affiliateId]);

      const commissionRate = affiliateData[0]?.commission_rate || 10.00;
      const commissionAmount = Math.round((commissionBasis * commissionRate / 100) * 100) / 100;

      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();

        // Record purchase event
        await connection.query(`
          INSERT INTO referral_events 
          (code_id, user_id, order_id, event_type, conversion_value, session_id)
          VALUES (?, ?, ?, 'purchase', ?, ?)
        `, [
          attribution.codeId,
          userId,
          orderId,
          orderTotal,
          req.session?.id || 'unknown'
        ]);

        // Create commission record (idempotent)
await connection.query(`
  INSERT INTO commissions 
  (affiliate_id, order_id, code_id, amount, rate, order_total, status)
  VALUES (?, ?, ?, ?, ?, ?, 'approved')
  ON DUPLICATE KEY UPDATE
    amount = VALUES(amount),
    rate = VALUES(rate),
    order_total = VALUES(order_total),
    status = 'approved',
    updated_at = CURRENT_TIMESTAMP
`, [
  attribution.affiliateId,
  orderId,
  attribution.codeId,
  commissionAmount,
  commissionRate,
  orderTotal
]);

// ✅ NEW: Update affiliate balance
await connection.query(`
  UPDATE affiliates 
  SET balance = balance + ?
  WHERE id = ?
`, [commissionAmount, attribution.affiliateId]);

console.log(`✅ Commission £${commissionAmount} added to affiliate ${attribution.affiliateId} balance`);

        await connection.commit();

        return { 
          success: true, 
          affiliateId: attribution.affiliateId,
          commissionAmount 
        };

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('Error tracking purchase:', error);
      return { success: false, error: 'Failed to track purchase' };
    }
  }

  /**
   * Process commission approval (called by payment webhook)
   * @param {number} orderId - The order ID
   * @returns {Object} Processing result
   */
  async processCommissionApproval(orderId) {
    if (!process.env.FEATURE_AFFILIATES === 'true') {
      return { success: false };
    }

    try {
      // Update commission status to approved
      const [result] = await pool.query(`
        UPDATE commissions 
        SET status = 'approved', approved_at = CURRENT_TIMESTAMP
        WHERE order_id = ? AND status = 'pending'
      `, [orderId]);

      if (result.affectedRows > 0) {
        // Update affiliate balance
        await pool.query(`
          UPDATE affiliates a
          JOIN commissions c ON a.id = c.affiliate_id
          SET a.balance = a.balance + c.amount
          WHERE c.order_id = ? AND c.status = 'approved'
        `, [orderId]);

        return { success: true };
      }

      return { success: false, error: 'No commission found to approve' };

    } catch (error) {
      console.error('Error processing commission approval:', error);
      return { success: false, error: 'Failed to process commission' };
    }
  }

  /**
   * Set tracking cookie
   * @param {Object} res - Express response object
   * @param {number} codeId - The promo code ID
   * @param {string} sessionId - The session ID
   */
  setTrackingCookie(res, codeId, sessionId) {
    const cookieData = {
      codeId,
      sessionId,
      timestamp: Date.now()
    };

    const cookieValue = this.signData(JSON.stringify(cookieData));
    const maxAge = (parseInt(process.env.AFFIL_COOKIE_DAYS) || 30) * 24 * 60 * 60 * 1000;

    res.cookie('ss_aff', cookieValue, {
      maxAge,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }

  /**
   * Get tracking data from cookie
   * @param {Object} req - Express request object
   * @returns {Object|null} Tracking data or null
   */
  getTrackingFromCookie(req) {
    try {
      const cookieValue = req.cookies?.ss_aff;
      if (!cookieValue) return null;

      const data = this.verifySignedData(cookieValue);
      if (!data) return null;

      const parsed = JSON.parse(data);
      
      // Check if cookie is expired
      const maxAge = (parseInt(process.env.AFFIL_COOKIE_DAYS) || 30) * 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > maxAge) {
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Error reading tracking cookie:', error);
      return null;
    }
  }

  /**
   * Generate a unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Hash sensitive data for privacy
   * @param {string} data - Data to hash
   * @returns {string} Hashed data
   */
  hashData(data) {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Sign data for cookie integrity
   * @param {string} data - Data to sign
   * @returns {string} Signed data
   */
  signData(data) {
    const secret = process.env.COOKIE_SECRET || 'default-secret';
    const signature = crypto.createHmac('sha256', secret).update(data).digest('hex');
    return `${data}.${signature}`;
  }

  /**
   * Verify signed data
   * @param {string} signedData - Signed data to verify
   * @returns {string|null} Original data or null if invalid
   */
  verifySignedData(signedData) {
    try {
      const [data, signature] = signedData.split('.');
      const secret = process.env.COOKIE_SECRET || 'default-secret';
      const expectedSignature = crypto.createHmac('sha256', secret).update(data).digest('hex');
      
      if (signature === expectedSignature) {
        return data;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

module.exports = new AffiliateService();