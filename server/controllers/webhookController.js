// server/controllers/webhookController.js
const { pool } = require('../config/db');
const paymentService = require('../services/paymentService');
const affiliateService = require('../services/affiliateService');

class WebhookController {
  /**
   * Handle payment webhooks from providers
   * POST /api/webhooks/payments
   */
  async handlePaymentWebhook(req, res) {
    try {
      const signature = req.get('stripe-signature') || req.get('paypal-signature');
      const payload = req.body;

      // Verify webhook signature
      const event = paymentService.verifyWebhookSignature(
        JSON.stringify(payload),
        signature
      );

      if (!event) {
        console.error('Webhook signature verification failed');
        return res.status(400).json({ error: 'Invalid signature' });
      }

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        case 'charge.dispute.created':
          await this.handleChargeDispute(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });

    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Handle successful payment
   * @param {Object} paymentIntent - Stripe payment intent object
   */
  async handlePaymentSucceeded(paymentIntent) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const orderId = parseInt(paymentIntent.metadata.orderId);
      
      if (!orderId) {
        throw new Error('Order ID not found in payment metadata');
      }

      // Update order payment status
      await connection.query(`
        UPDATE orders 
        SET payment_status = 'paid', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND payment_id = ?
      `, [orderId, paymentIntent.id]);

      // Process affiliate commission if applicable
      const [orderData] = await connection.query(`
        SELECT referring_affiliate_id, total_price, promo_discount_amount
        FROM orders 
        WHERE id = ?
      `, [orderId]);

      if (orderData.length > 0 && orderData[0].referring_affiliate_id) {
        await affiliateService.processCommissionApproval(orderId);
      }

      // Send order confirmation email (async)
      this.sendOrderConfirmationEmail(orderId).catch(console.error);

      await connection.commit();
      console.log(`Payment succeeded for order ${orderId}`);

    } catch (error) {
      await connection.rollback();
      console.error('Error handling payment success:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Handle failed payment
   * @param {Object} paymentIntent - Stripe payment intent object
   */
  async handlePaymentFailed(paymentIntent) {
    try {
      const orderId = parseInt(paymentIntent.metadata.orderId);
      
      if (!orderId) {
        throw new Error('Order ID not found in payment metadata');
      }

      // Update order payment status
      await pool.query(`
        UPDATE orders 
        SET payment_status = 'failed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND payment_id = ?
      `, [orderId, paymentIntent.id]);

      // Send payment failure notification
      this.sendPaymentFailureEmail(orderId).catch(console.error);

      console.log(`Payment failed for order ${orderId}`);

    } catch (error) {
      console.error('Error handling payment failure:', error);
      throw error;
    }
  }

  /**
   * Handle charge dispute
   * @param {Object} dispute - Stripe dispute object
   */
  async handleChargeDispute(dispute) {
    try {
      // Find the order associated with this charge
      const [orderData] = await pool.query(`
        SELECT id, order_number, user_id
        FROM orders 
        WHERE payment_id = ?
      `, [dispute.payment_intent]);

      if (orderData.length === 0) {
        console.error('Order not found for disputed charge:', dispute.payment_intent);
        return;
      }

      const order = orderData[0];

      // Log the dispute
      console.log(`Dispute created for order ${order.order_number}:`, {
        disputeId: dispute.id,
        amount: dispute.amount / 100,
        reason: dispute.reason,
        status: dispute.status
      });

      // Notify admin about the dispute
      this.notifyAdminOfDispute(order, dispute).catch(console.error);

    } catch (error) {
      console.error('Error handling charge dispute:', error);
      throw error;
    }
  }

  /**
   * Send order confirmation email
   * @param {number} orderId - Order ID
   */
  async sendOrderConfirmationEmail(orderId) {
    try {
      const [orderData] = await pool.query(`
        SELECT o.*, u.name, u.email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `, [orderId]);

      if (orderData.length === 0) return;

      const order = orderData[0];

      // Integration with your email service would go here
      console.log(`Order confirmation email sent for order ${order.order_number}`);

    } catch (error) {
      console.error('Error sending order confirmation email:', error);
    }
  }

  /**
   * Send payment failure email
   * @param {number} orderId - Order ID
   */
  async sendPaymentFailureEmail(orderId) {
    try {
      const [orderData] = await pool.query(`
        SELECT o.*, u.name, u.email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `, [orderId]);

      if (orderData.length === 0) return;

      const order = orderData[0];

      // Integration with your email service would go here
      console.log(`Payment failure email sent for order ${order.order_number}`);

    } catch (error) {
      console.error('Error sending payment failure email:', error);
    }
  }

  /**
   * Notify admin of dispute
   * @param {Object} order - Order data
   * @param {Object} dispute - Dispute data
   */
  async notifyAdminOfDispute(order, dispute) {
    try {
      // Integration with your notification system would go here
      console.log(`Admin notified of dispute for order ${order.order_number}`);

    } catch (error) {
      console.error('Error notifying admin of dispute:', error);
    }
  }
}

module.exports = new WebhookController();