// server/services/paymentService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

class PaymentService {
  constructor() {
    this.provider = process.env.PAYMENT_PROVIDER || 'stripe';
  }

  /**
   * Process payment using the configured provider
   * @param {Object} paymentData - Payment data
   * @returns {Object} Payment result
   */
  async processPayment(paymentData) {
    switch (this.provider) {
      case 'stripe':
        return this.processStripePayment(paymentData);
      case 'paypal':
        return this.processPayPalPayment(paymentData);
      default:
        throw new Error(`Unsupported payment provider: ${this.provider}`);
    }
  }

  /**
   * Process Stripe payment
   * @param {Object} paymentData - Payment data
   * @returns {Object} Payment result
   */
  async processStripePayment(paymentData) {
    try {
      const { amount, currency, paymentMethodId, orderId, userId, description } = paymentData;

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        description,
        metadata: {
          orderId: orderId.toString(),
          userId: userId.toString()
        }
      });

      // Handle different payment statuses
      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          paymentId: paymentIntent.id,
          status: 'paid',
          details: {
            provider: 'stripe',
            paymentIntentId: paymentIntent.id,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
          }
        };
      } else if (paymentIntent.status === 'requires_action') {
        return {
          success: false,
          requiresAction: true,
          clientSecret: paymentIntent.client_secret,
          error: 'Payment requires additional authentication'
        };
      } else {
        return {
          success: false,
          error: 'Payment failed',
          details: paymentIntent
        };
      }

    } catch (error) {
      console.error('Stripe payment error:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed'
      };
    }
  }

  /**
   * Process PayPal payment (placeholder)
   * @param {Object} paymentData - Payment data
   * @returns {Object} Payment result
   */
  async processPayPalPayment(paymentData) {
    // PayPal integration would go here
    // For now, return a placeholder
    return {
      success: false,
      error: 'PayPal integration not implemented yet'
    };
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} Verification result
   */
  verifyWebhookSignature(payload, signature) {
    switch (this.provider) {
      case 'stripe':
        return this.verifyStripeWebhook(payload, signature);
      case 'paypal':
        return this.verifyPayPalWebhook(payload, signature);
      default:
        return false;
    }
  }

  /**
   * Verify Stripe webhook signature
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} Verification result
   */
  verifyStripeWebhook(payload, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      return event;
    } catch (error) {
      console.error('Stripe webhook verification failed:', error);
      return false;
    }
  }

  /**
   * Verify PayPal webhook signature (placeholder)
   * @param {string} payload - Webhook payload
   * @param {string} signature - Webhook signature
   * @returns {boolean} Verification result
   */
  verifyPayPalWebhook(payload, signature) {
    // PayPal webhook verification would go here
    return false;
  }

  /**
   * Create refund
   * @param {string} paymentId - Payment ID to refund
   * @param {number} amount - Amount to refund (optional, full refund if not specified)
   * @returns {Object} Refund result
   */
  async createRefund(paymentId, amount = null) {
    switch (this.provider) {
      case 'stripe':
        return this.createStripeRefund(paymentId, amount);
      case 'paypal':
        return this.createPayPalRefund(paymentId, amount);
      default:
        throw new Error(`Unsupported payment provider: ${this.provider}`);
    }
  }

  /**
   * Create Stripe refund
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @param {number} amount - Amount to refund
   * @returns {Object} Refund result
   */
  async createStripeRefund(paymentIntentId, amount = null) {
    try {
      const refundData = { payment_intent: paymentIntentId };
      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await stripe.refunds.create(refundData);

      return {
        success: true,
        refundId: refund.id,
        amount: refund.amount / 100, // Convert back to dollars
        status: refund.status
      };

    } catch (error) {
      console.error('Stripe refund error:', error);
      return {
        success: false,
        error: error.message || 'Refund failed'
      };
    }
  }

  /**
   * Create PayPal refund (placeholder)
   * @param {string} paymentId - PayPal payment ID
   * @param {number} amount - Amount to refund
   * @returns {Object} Refund result
   */
  async createPayPalRefund(paymentId, amount = null) {
    // PayPal refund would go here
    return {
      success: false,
      error: 'PayPal refund not implemented yet'
    };
  }
}

module.exports = new PaymentService();