// server/services/discountService.js
const { pool } = require('../config/db');

class DiscountService {
  /**
   * Validate a promo code for discount application
   * @param {string} code - The promo code to validate
   * @param {number} userId - The user ID applying the code
   * @param {number} orderValue - The order subtotal before discount
   * @param {number} orderId - Optional order ID for usage tracking
   * @returns {Object} Validation result with discount details
   */
  async validatePromoCode(code, userId, orderValue, orderId = null) {
    if (!process.env.FEATURE_DISCOUNTS === 'true') {
      return {
        valid: false,
        error: 'Discount feature is currently disabled'
      };
    }

    try {
      // Get promo code details
      const [codeRows] = await pool.query(`
        SELECT 
          id, code, name, type, discount_amount, is_percentage,
          min_order_value, max_uses, current_uses, max_uses_per_user,
          starts_at, expires_at, is_active, affiliate_id
        FROM promo_codes 
        WHERE code = ? AND type IN ('discount', 'affiliate')
      `, [code.toUpperCase()]);

      if (codeRows.length === 0) {
        return {
          valid: false,
          error: 'Invalid promo code'
        };
      }

      const promoCode = codeRows[0];

      // Check if code is active
      if (!promoCode.is_active) {
        return {
          valid: false,
          error: 'This promo code is no longer active'
        };
      }

      // Check date validity
      const now = new Date();
      if (promoCode.starts_at && new Date(promoCode.starts_at) > now) {
        return {
          valid: false,
          error: 'This promo code is not yet valid'
        };
      }

      if (promoCode.expires_at && new Date(promoCode.expires_at) < now) {
        return {
          valid: false,
          error: 'This promo code has expired'
        };
      }

      // Check minimum order value
      if (orderValue < promoCode.min_order_value) {
        return {
          valid: false,
          error: `Minimum order value of $${promoCode.min_order_value} required`
        };
      }

      // Check global usage limit
      if (promoCode.max_uses > 0 && promoCode.current_uses >= promoCode.max_uses) {
        return {
          valid: false,
          error: 'This promo code has reached its usage limit'
        };
      }

      // Check per-user usage limit
      if (userId && promoCode.max_uses_per_user > 0) {
        const [usageRows] = await pool.query(`
          SELECT COUNT(*) as usage_count 
          FROM promo_code_usage 
          WHERE code_id = ? AND user_id = ?
        `, [promoCode.id, userId]);

        if (usageRows[0].usage_count >= promoCode.max_uses_per_user) {
          return {
            valid: false,
            error: 'You have already used this promo code the maximum number of times'
          };
        }
      }

      // Calculate discount amount
      const discountAmount = this.calculateDiscount(
        promoCode.discount_amount,
        promoCode.is_percentage,
        orderValue
      );

      return {
        valid: true,
        code: promoCode,
        discountAmount,
        finalTotal: Math.max(0, orderValue - discountAmount)
      };

    } catch (error) {
      console.error('Error validating promo code:', error);
      return {
        valid: false,
        error: 'An error occurred while validating the promo code'
      };
    }
  }

  /**
   * Calculate discount amount based on type and value
   * @param {number} discountValue - The discount value from database
   * @param {boolean} isPercentage - Whether the discount is percentage-based
   * @param {number} orderValue - The order subtotal
   * @returns {number} The calculated discount amount
   */
  calculateDiscount(discountValue, isPercentage, orderValue) {
    if (isPercentage) {
      return Math.round((orderValue * discountValue / 100) * 100) / 100;
    } else {
      return Math.min(discountValue, orderValue);
    }
  }

  /**
   * Apply multiple promo codes with stacking rules
   * @param {Array} codes - Array of promo codes to apply
   * @param {number} userId - The user ID
   * @param {number} orderValue - The original order value
   * @returns {Object} Combined discount result
   */
  async applyMultipleCodes(codes, userId, orderValue) {
    if (!process.env.ALLOW_STACKING === 'true' && codes.length > 1) {
      return {
        valid: false,
        error: 'Only one promo code can be applied per order'
      };
    }

    const validCodes = [];
    let totalDiscount = 0;
    let currentOrderValue = orderValue;

    // Apply fixed discounts first, then percentage discounts
    const sortedCodes = [...codes].sort((a, b) => {
      // This would need the actual code data, simplified for now
      return 0;
    });

    for (const code of codes) {
      const validation = await this.validatePromoCode(code, userId, currentOrderValue);
      
      if (validation.valid) {
        validCodes.push(validation);
        totalDiscount += validation.discountAmount;
        currentOrderValue = Math.max(0, currentOrderValue - validation.discountAmount);
      }
    }

    return {
      valid: validCodes.length > 0,
      codes: validCodes,
      totalDiscount,
      finalTotal: Math.max(0, orderValue - totalDiscount)
    };
  }

  /**
   * Record promo code usage in the database
   * @param {number} codeId - The promo code ID
   * @param {number} userId - The user ID
   * @param {number} orderId - The order ID
   * @param {number} discountApplied - The discount amount applied
   */
  async recordUsage(codeId, userId, orderId, discountApplied) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Insert usage record
      await connection.query(`
        INSERT INTO promo_code_usage (code_id, user_id, order_id, discount_applied)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE discount_applied = VALUES(discount_applied)
      `, [codeId, userId, orderId, discountApplied]);

      // Increment usage count
      await connection.query(`
        UPDATE promo_codes 
        SET current_uses = current_uses + 1 
        WHERE id = ?
      `, [codeId]);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get discount breakdown for order display
   * @param {string} code - The promo code
   * @param {number} orderValue - The order value
   * @returns {Object} Discount breakdown
   */
  async getDiscountBreakdown(code, orderValue) {
    const validation = await this.validatePromoCode(code, null, orderValue);
    
    if (!validation.valid) {
      return validation;
    }

    return {
      valid: true,
      breakdown: {
        originalTotal: orderValue,
        discountCode: validation.code.code,
        discountName: validation.code.name,
        discountAmount: validation.discountAmount,
        finalTotal: validation.finalTotal
      }
    };
  }
}

module.exports = new DiscountService();