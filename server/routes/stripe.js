// server/routes/stripe.js
// ============================================================
// Stripe Payments + Webhook (Affiliate Commission Integrated)
// Matches DB schema: commissions.eligible_for_payout_date, required code_id/rate/order_total
// ============================================================

'use strict';

const express = require('express');
const router = express.Router();

// ---------- Config toggles ----------
const COMMISSION_HOLD_DAYS = parseInt(process.env.COMMISSION_HOLD_DAYS || '14', 10);
const TEST_PAYMENTS_OPEN = String(process.env.TEST_PAYMENTS_OPEN || 'false').toLowerCase() === 'true';

// ---------- Stripe initialization ----------
if (!process.env.STRIPE_SECRET_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('STRIPE_SECRET_KEY is required in production');
  } else {
    console.warn('⚠️ STRIPE_SECRET_KEY not set — running in dummy mode (development only).');
  }
}

let stripe;
try {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  (async () => {
    try {
      await stripe.paymentIntents.list({ limit: 1 });
      console.log('✅ Stripe connection successful');
    } catch (e) {
      console.error('❌ Stripe connection failed:', e.message);
    }
  })();
} catch (err) {
  console.error('❌ Failed to initialize Stripe:', err.message);
  if (process.env.NODE_ENV === 'development') {
    // very small shim for local dev only
    stripe = {
      paymentIntents: {
        create: async () => ({ client_secret: 'pi_dummy_secret', id: 'pi_dummy', amount: 0, status: 'requires_payment_method' }),
        retrieve: async () => ({ id: 'pi_dummy', amount: 0, status: 'succeeded', currency: 'gbp' }),
        list: async () => ({ data: [] })
      },
      webhooks: {
        constructEvent: (_body, _sig, _secret) => ({ type: 'dummy_event', data: { object: {} } })
      }
    };
  } else {
    throw err;
  }
}

// ---------- Auth (toggleable) ----------
let fullAuth = null;
try {
  ({ authenticateUser: fullAuth } = require('../middleware/auth'));
} catch {
  /* no-op */
}

const headerAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Proceeding without authentication in development mode');
      return next();
    }
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  next();
};

const requireAuth = TEST_PAYMENTS_OPEN ? (_req, _res, next) => next() : (fullAuth || headerAuth);

// ---------- Utilities ----------
const isValidAmountPence = (amt) => Number.isInteger(amt) && amt >= 100 && amt <= 1_000_000; // £1–£10,000

// ============================================================
// Create Payment Intent
// POST /api/payment/create-intent
// Body: { amount (pence), currency?, orderId, metadata? }
// ============================================================
router.post('/create-intent', requireAuth, async (req, res) => {
  try {
    const { amount, currency = 'gbp', metadata = {}, orderId } = req.body || {};

    if (!amount) return res.status(400).json({ success: false, message: 'Amount is required' });
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId is required for payment tracking' });
    if (!isValidAmountPence(amount)) {
      return res.status(400).json({ success: false, message: 'Amount must be between £1 and £10,000 (in pence)' });
    }

    const normalizedCurrency = 'gbp';
    console.log(`🔄 Creating PI: £${(amount / 100).toFixed(2)} ${normalizedCurrency.toUpperCase()} for order ${orderId}`);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: normalizedCurrency,
      metadata: {
        ...metadata,
        orderId: String(orderId),
        environment: process.env.NODE_ENV || 'development',
      },
      automatic_payment_methods: { enabled: true },
    });

    console.log(`✅ Payment intent created: ${paymentIntent.id}`);

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
      },
    });
  } catch (error) {
    console.error('❌ Stripe payment intent error:', error);
    if (error?.type && String(error.type).toLowerCase().includes('stripe')) {
      return res.status(400).json({ success: false, message: error.message, code: error.code, type: error.type });
    }
    res.status(500).json({ success: false, message: 'Error creating payment intent' });
  }
});

// ============================================================
// Verify Payment Intent
// GET /api/payment/verify/:paymentIntentId
// ============================================================
router.get('/verify/:paymentIntentId', requireAuth, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    if (!paymentIntentId || paymentIntentId === 'undefined') {
      return res.status(400).json({ success: false, message: 'Payment intent ID is required' });
    }

    console.log(`🔄 Verifying payment intent: ${paymentIntentId}`);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log(`✅ Payment status: ${paymentIntent.status}`);

    res.status(200).json({
      success: true,
      status: paymentIntent.status,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        status: paymentIntent.status,
        currency: paymentIntent.currency,
      },
    });
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    if (error?.code === 'resource_missing') {
      return res.status(404).json({ success: false, message: 'Payment intent not found', code: error.code });
    }
    res.status(500).json({ success: false, message: 'Error verifying payment' });
  }
});

// ============================================================
// Webhook Handler (exported)
// NOTE: In server.js you already mounted:
// app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), stripeWebhook)
// Keep the raw() ONLY in server.js (not here).
// ============================================================
const stripeWebhookHandler = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.warn('⚠️ STRIPE_WEBHOOK_SECRET not configured');
      return res.status(400).json({ success: false, message: 'Webhook secret not configured' });
    }

    let event;
    try {
      // req.body is raw Buffer because server.js applied express.raw(...)
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`✅ Webhook received: ${event.type}`);

    switch (event.type) {
      // -----------------------------
      // Payment Succeeded
      // -----------------------------
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log(`💰 PaymentIntent succeeded: ${paymentIntent.id}`);

        try {
          const { pool } = require('../config/db');
          const orderId = paymentIntent.metadata?.orderId;

          if (!orderId) {
            console.warn('⚠️ No orderId in payment metadata');
            break;
          }

          // Update order as paid (and optionally advance workflow if still pending)
          await pool.query(
            `UPDATE orders 
               SET payment_status='paid',
                   payment_id=?,
                   payment_details=?,
                   status = CASE WHEN status = 'pending' THEN 'in_production' ELSE status END,
                   updated_at=NOW()
             WHERE id=?`,
            [
              paymentIntent.id,
              JSON.stringify({
                provider: 'stripe',
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                status: paymentIntent.status,
                payment_method: paymentIntent.payment_method,
                charges:
                  paymentIntent.charges?.data?.map((c) => ({
                    id: c.id,
                    status: c.status,
                    paid: c.paid,
                  })) || [],
              }),
              orderId,
            ]
          );
          console.log(`✅ Order ${orderId} marked paid`);

          // Load order affiliate context
          const [orderData] = await pool.query(
            `SELECT id, total_price, referring_affiliate_id, used_promo_code
               FROM orders
              WHERE id = ?`,
            [orderId]
          );

          if (!orderData.length || !orderData[0].referring_affiliate_id) {
            console.log('ℹ️ No referring affiliate for this order');
            break;
          }

          const order = orderData[0];
          const affiliateId = order.referring_affiliate_id;

          // Affiliate must be approved
          const [affInfo] = await pool.query(
            `SELECT commission_rate, status
               FROM affiliates
              WHERE id = ?`,
            [affiliateId]
          );

          if (!affInfo.length || affInfo[0].status !== 'approved') {
            console.log(`⚠️ Affiliate ${affiliateId} not approved or not found`);
            break;
          }

          const rate = Number(affInfo[0].commission_rate || 0);      // e.g., 10.00
          const orderTotal = Number(order.total_price || 0);          // pounds, post-discount
          const amount = Number((orderTotal * rate / 100).toFixed(2));// pounds, 2dp

          // Resolve promo code id (FK requirement)
          let codeId = null;
          if (order.used_promo_code) {
            const [codeRow] = await pool.query(
              `SELECT id FROM promo_codes WHERE code = ?`,
              [order.used_promo_code]
            );
            if (codeRow.length) codeId = codeRow[0].id;
          }

          if (!codeId) {
            console.log(`⚠️ Order ${orderId} has no matching promo code id; skipping commission insert`);
            break;
          }

          const holdDays = Number.isFinite(COMMISSION_HOLD_DAYS) ? COMMISSION_HOLD_DAYS : 14;

          // Transaction: commission insert (idempotent via UNIQUE (affiliate_id, order_id))
          await pool.query('START TRANSACTION');
          try {
            await pool.query(
              `INSERT INTO commissions
                 (affiliate_id, order_id, code_id, amount, rate, order_total, status, eligible_for_payout_date)
               VALUES
                 (?, ?, ?, ?, ?, ?, 'approved', DATE_ADD(NOW(), INTERVAL ? DAY))
               ON DUPLICATE KEY UPDATE
                 amount = amount,
                 rate = rate,
                 order_total = order_total,
                 status = status,
                 eligible_for_payout_date = eligible_for_payout_date`,
              [affiliateId, orderId, codeId, amount, rate, orderTotal, holdDays]
            );

            await pool.query('COMMIT');
            console.log(
              `✅ Commission £${amount.toFixed(2)} recorded (rate ${rate}%) for affiliate ${affiliateId}, order ${orderId} (hold ${holdDays}d)`
            );
          } catch (e) {
            await pool.query('ROLLBACK');
            if (e?.code === 'ER_DUP_ENTRY') {
              console.log(`ℹ️ Commission already exists for order ${orderId}, original values preserved`);
            } else {
              console.error('❌ Commission insert failed:', e);
            }
          }
        } catch (err) {
          console.error('❌ Error processing payment webhook:', err);
          // swallow to still ACK below
        }

        break;
      }

      // -----------------------------
      // Payment Failed
      // -----------------------------
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        console.log(`❌ Payment failed: ${paymentIntent.id}`);
        const { pool } = require('../config/db');

        const orderId = paymentIntent.metadata?.orderId;
        if (orderId) {
          try {
            await pool.query(
              `UPDATE orders SET payment_status='failed', updated_at=NOW() WHERE id=?`,
              [orderId]
            );
          } catch (e) {
            console.error('❌ Failed to mark order failed:', e);
          }
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    // Always ACK
    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error (outer):', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// ---------- Exports ----------
module.exports = {
  router,                   // /create-intent, /verify
  stripeWebhook: stripeWebhookHandler // mount with express.raw(...) in server.js
};
