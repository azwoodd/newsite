// server/controllers/checkoutController.js
const { pool } = require('../config/db');
const discountService = require('../services/discountService');
const affiliateService = require('../services/affiliateService');
const paymentService = require('../services/paymentService');

class CheckoutController {
  /**
   * Apply promo code and return pricing breakdown
   * POST /api/checkout/apply-promo
   */
  async applyPromo(req, res) {
    try {
      const { code, orderValue } = req.body;
      const userId = req.user?.id;

      if (!code || !orderValue) {
        return res.status(400).json({
          success: false,
          error: 'Code and order value are required'
        });
      }

      // Validate the promo code
      const validation = await discountService.validatePromoCode(
        code,
        userId,
        parseFloat(orderValue)
      );

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error
        });
      }

      // Return pricing breakdown
      res.json({
        success: true,
        breakdown: {
          originalTotal: parseFloat(orderValue),
          discountCode: validation.code.code,
          discountName: validation.code.name,
          discountAmount: validation.discountAmount,
          discountType: validation.code.is_percentage ? 'percentage' : 'fixed',
          discountValue: validation.code.discount_amount,
          finalTotal: validation.finalTotal
        }
      });

    } catch (error) {
      console.error('Error applying promo code:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Confirm checkout and process payment
   * POST /api/checkout/confirm
   */
  async confirmCheckout(req, res) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        orderData,
        promoCode,
        paymentMethodId,
        paymentProvider = process.env.PAYMENT_PROVIDER || 'stripe'
      } = req.body;

      const userId = req.user.id;

      // Validate required fields
      if (!orderData || !orderData.packageType || !orderData.totalPrice) {
        return res.status(400).json({
          success: false,
          error: 'Invalid order data'
        });
      }

      let finalTotal = parseFloat(orderData.totalPrice);
      let discountAmount = 0;
      let promoCodeData = null;

      // Apply promo code if provided
      if (promoCode) {
        const validation = await discountService.validatePromoCode(
          promoCode,
          userId,
          finalTotal
        );

        if (!validation.valid) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            error: validation.error
          });
        }

        promoCodeData = validation.code;
        discountAmount = validation.discountAmount;
        finalTotal = validation.finalTotal;
      }

      // Get affiliate attribution
      const attribution = await affiliateService.getAttribution(userId, req);

      // Generate order number
      const orderNumber = this.generateOrderNumber();

      // Create order record
      const [orderResult] = await connection.query(`
        INSERT INTO orders (
          order_number, user_id, package_type, total_price,
          payment_method, payment_status, song_purpose, recipient_name,
          emotion, provide_lyrics, lyrics, song_theme, personal_story,
          music_style, show_in_gallery, additional_notes,
          used_promo_code, promo_discount_amount, referring_affiliate_id,
          customer_name, customer_email, customer_address,
          customer_city, customer_postcode, customer_country
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderNumber,
        userId,
        orderData.packageType,
        finalTotal,
        paymentProvider,
        orderData.songPurpose || null,
        orderData.recipientName || null,
        orderData.emotion || null,
        orderData.provideLyrics || 0,
        orderData.lyrics || null,
        orderData.songTheme || null,
        orderData.personalStory || null,
        orderData.musicStyle || null,
        orderData.showInGallery || 0,
        orderData.additionalNotes || null,
        promoCodeData?.code || null,
        discountAmount,
        attribution.affiliateId,
        orderData.customerName || null,
        orderData.customerEmail || null,
        orderData.customerAddress || null,
        orderData.customerCity || null,
        orderData.customerPostcode || null,
        orderData.customerCountry || null
      ]);

      const orderId = orderResult.insertId;

      // Add order addons if provided
      if (orderData.addons && orderData.addons.length > 0) {
        for (const addon of orderData.addons) {
          await connection.query(`
            INSERT INTO order_addons (order_id, addon_type, price)
            VALUES (?, ?, ?)
          `, [orderId, addon.type, addon.price]);
        }
      }

      // Record promo code usage if applicable
      if (promoCodeData) {
        await discountService.recordUsage(
          promoCodeData.id,
          userId,
          orderId,
          discountAmount
        );
      }

      // Process payment
      const paymentResult = await paymentService.processPayment({
        amount: Math.round(finalTotal * 100), // Convert to pence
        currency: 'gbp', // Changed from 'usd' to 'gbp'
        paymentMethodId,
        orderId,
        userId,
        description: `SongSculptors Order ${orderNumber}`
      });

      if (!paymentResult.success) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: paymentResult.error || 'Payment failed'
        });
      }

      // Update order with payment details
      await connection.query(`
        UPDATE orders 
        SET payment_id = ?, payment_status = ?, payment_details = ?
        WHERE id = ?
      `, [
        paymentResult.paymentId,
        paymentResult.status,
        JSON.stringify(paymentResult.details),
        orderId
      ]);
      if (attribution.affiliateId) {
        await affiliateService.trackPurchase(
          orderId,
          userId,
          parseFloat(orderData.totalPrice),
          discountAmount,
          req
        );
      }

      // Create commission if there's an affiliate and promo code
      // Create commission if there's an affiliate
      if (attribution.affiliateId) {
        try {
          // Get affiliate details to determine commission rate
          const [affiliateRows] = await connection.query(`
            SELECT a.id, a.commission_rate 
            FROM affiliates a
            WHERE a.id = ? AND a.status = 'approved'
          `, [attribution.affiliateId]);
          
          if (affiliateRows.length > 0) {
            const affiliate = affiliateRows[0];
            const commissionAmount = (finalTotal * affiliate.commission_rate) / 100;
            
            // Create commission record
            await connection.query(`
              INSERT INTO commissions 
              (affiliate_id, order_id, code_id, amount, rate, order_total, status)
              VALUES (?, ?, ?, ?, ?, ?, 'pending')
            `, [
              affiliate.id,
              orderId,
              attribution.codeId || null, // Use the code ID from attribution if available
              commissionAmount,
              affiliate.commission_rate,
              finalTotal
            ]);
            
            console.log(`Commission created: £${commissionAmount} for affiliate ${affiliate.id}`);
          }
        } catch (commissionError) {
          console.error('Error creating commission:', commissionError);
          // Don't fail the entire transaction for commission creation errors
        }
      }
      await connection.commit();

      // Send confirmation email (async, don't wait)
      this.sendOrderConfirmation(orderId).catch(console.error);

      res.json({
        success: true,
        order: {
          id: orderId,
          orderNumber,
          totalPrice: finalTotal,
          discountAmount,
          paymentStatus: paymentResult.status
        }
      });

    } catch (error) {
      await connection.rollback();
      console.error('Error confirming checkout:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process checkout'
      });
    } finally {
      connection.release();
    }
  }

  /**
   * Get checkout summary with applied discounts
   * GET /api/checkout/summary
   */
  async getCheckoutSummary(req, res) {
    try {
      const { packageType, addons, promoCode } = req.query;
      const userId = req.user?.id;

      // Calculate base pricing
      const pricing = await this.calculatePricing(packageType, addons);
      
      let summary = {
        packageType,
        basePrice: pricing.basePrice,
        addons: pricing.addons,
        subtotal: pricing.subtotal,
        discountAmount: 0,
        finalTotal: pricing.subtotal
      };

      // Apply promo code if provided
      if (promoCode) {
        const validation = await discountService.validatePromoCode(
          promoCode,
          userId,
          pricing.subtotal
        );

        if (validation.valid) {
          summary.promoCode = validation.code.code;
          summary.discountAmount = validation.discountAmount;
          summary.finalTotal = validation.finalTotal;
        } else {
          summary.promoError = validation.error;
        }
      }

      res.json({
        success: true,
        summary
      });

    } catch (error) {
      console.error('Error getting checkout summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get checkout summary'
      });
    }
  }

  /**
   * Calculate pricing for package and addons
   * @param {string} packageType - The package type
   * @param {string} addons - Comma-separated addon list
   * @returns {Object} Pricing breakdown
   */
  async calculatePricing(packageType, addons) {
    // Base package prices
    const packagePrices = {
      essential: 99.99,
      signature: 199.99,
      masterpiece: 359.99
    };

    // Addon prices
    const addonPrices = {
      expedited: 29.99,
      'physical-cd': 34.99,
      'physical-vinyl': 119.99,
      streaming: 34.99
    };

    const basePrice = packagePrices[packageType] || 0;
    const addonList = addons ? addons.split(',') : [];
    
    const addonDetails = addonList.map(addon => ({
      type: addon,
      price: addonPrices[addon] || 0
    }));

    const addonTotal = addonDetails.reduce((sum, addon) => sum + addon.price, 0);

    return {
      basePrice,
      addons: addonDetails,
      subtotal: basePrice + addonTotal
    };
  }

  /**
   * Generate a unique order number
   * @returns {string} Order number
   */
  generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Send order confirmation email
   * @param {number} orderId - The order ID
   */
  async sendOrderConfirmation(orderId) {
    try {
      // Get order details
      const [orderRows] = await pool.query(`
        SELECT o.*, u.name, u.email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `, [orderId]);

      if (orderRows.length === 0) return;

      const order = orderRows[0];

      // Send email using your existing email service
      // This would integrate with your SendGrid setup
      console.log(`Order confirmation email would be sent for order ${order.order_number}`);
      
    } catch (error) {
      console.error('Error sending order confirmation:', error);
    }
  }
}

module.exports = new CheckoutController();