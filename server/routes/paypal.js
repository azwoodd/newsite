// server/routes/paypal.js
const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');

// Initialize PayPal
const paypal = require('@paypal/checkout-server-sdk');

// Configure PayPal environment with better error handling
let environment;
let clientId = process.env.PAYPAL_CLIENT_ID;
let clientSecret = process.env.PAYPAL_CLIENT_SECRET;
let paypalClient;

try {
  if (!clientId || !clientSecret) {
    console.warn('⚠️ Warning: PayPal credentials not provided. Using sandbox credentials for development.');
    // Use sandbox credentials for development
    clientId = 'sb-test';
    clientSecret = 'test-secret';
  }

  if (process.env.PAYPAL_MODE === 'live') {
    console.log('🔄 Initializing PayPal LIVE environment');
    environment = new paypal.core.LiveEnvironment(clientId, clientSecret);
  } else {
    console.log('🔄 Initializing PayPal SANDBOX environment');
    environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
  }

  paypalClient = new paypal.core.PayPalHttpClient(environment);
  
  // Test PayPal connection
  (async () => {
    try {
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'GBP',
            value: '1.00'
          }
        }]
      });
      
      await paypalClient.execute(request);
      console.log('✅ PayPal connection successful');
    } catch (error) {
      console.error('❌ PayPal connection failed:', error.message);
    }
  })();
} catch (error) {
  console.error('❌ Failed to initialize PayPal:', error.message);
}

// Auth middleware for all routes
const authenticateUser = (req, res, next) => {
  // Check for Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For development, allow requests to proceed without auth
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Proceeding without authentication in development mode');
      return next();
    }
    
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  // In a real implementation, validate JWT token and set req.user
  req.user = { id: 1 }; // Temporary placeholder
  next();
};

// @route   POST api/paypal/create-order
// @desc    Create a PayPal order
// @access  Private
router.post('/create-order', [
  authenticateUser,
  [
    check('amount', 'Amount is required').not().isEmpty(),
    check('currency', 'Currency is required').not().isEmpty(),
    check('orderDetails', 'Order details are required').isObject()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  try {
    if (!paypalClient) {
      return res.status(500).json({ 
        success: false, 
        message: 'PayPal payment processing is not configured' 
      });
    }

    const { amount, currency = 'gbp', orderDetails } = req.body;
    
    console.log(`🔄 Creating PayPal order: ${amount} ${currency.toUpperCase()}`);
    
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency.toUpperCase(),
          value: amount.toString(),
          breakdown: {
            item_total: {
              currency_code: currency.toUpperCase(),
              value: amount.toString()
            }
          }
        },
        items: [
          {
            name: `SongSculptors ${orderDetails.package || 'Standard'} Package`,
            unit_amount: {
              currency_code: currency.toUpperCase(),
              value: amount.toString()
            },
            quantity: '1',
            description: `Custom song creation - ${orderDetails.package || 'Standard'} package`
          }
        ],
        custom_id: req.user.id.toString(),
        description: 'SongSculptors custom song creation service'
      }],
      application_context: {
        brand_name: 'SongSculptors',
        locale: 'en-GB', // UK locale
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: `${process.env.CLIENT_URL || 'https://songsculptors.com'}/payment-success`,
        cancel_url: `${process.env.CLIENT_URL || 'https://songsculptors.com'}/payment-cancel`,
        payment_method: {
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
          payer_selected: 'PAYPAL'
        }
      }
    });

    const order = await paypalClient.execute(request);
    console.log(`✅ PayPal order created: ${order.result.id}`);
    
    res.status(200).json({
      success: true,
      orderId: order.result.id,
      links: order.result.links
    });
  } catch (error) {
    console.error('❌ PayPal create order error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error processing PayPal order',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST api/paypal/capture-order
// @desc    Capture payment for an approved PayPal order
// @access  Private
router.post('/capture-order', [
  authenticateUser,
  [
    check('orderId', 'PayPal order ID is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }

  try {
    if (!paypalClient) {
      return res.status(500).json({ 
        success: false, 
        message: 'PayPal payment processing is not configured' 
      });
    }

    const { orderId } = req.body;
    
    console.log(`🔄 Capturing PayPal order: ${orderId}`);
    
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    
    const capture = await paypalClient.execute(request);
    
    // Process the captured payment
    const captureId = capture.result.purchase_units[0].payments.captures[0].id;
    console.log(`✅ PayPal payment captured: ${captureId}`);
    
    // In a real application, update your order in the database here
    // const order = await Order.findOneAndUpdate(
    //   { paypalOrderId: orderId },
    //   { 
    //     status: 'paid',
    //     paypalCaptureId: captureId,
    //     paymentStatus: capture.result.status
    //   },
    //   { new: true }
    // );

    res.status(200).json({
      success: true,
      captureId: captureId,
      status: capture.result.status
    });
  } catch (error) {
    console.error('❌ PayPal capture order error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error capturing PayPal payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST api/paypal/webhook
// @desc    Handle PayPal webhook events
// @access  Public
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    // Verify the webhook signature
    // In production, you should verify the webhook signature using PayPal's verification APIs
    // This is a simplified version for development
    
    const event = req.body;
    
    // Handle different webhook event types
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        const captureId = event.resource.id;
        console.log(`✅ Payment capture completed: ${captureId}`);
        
        // Update order status in database
        // const order = await Order.findOneAndUpdate(
        //   { paypalCaptureId: captureId },
        //   { status: 'paid' },
        //   { new: true }
        // );
        
        break;
        
      case 'PAYMENT.CAPTURE.DENIED':
        console.log(`❌ Payment capture denied: ${event.resource.id}`);
        // Handle failed payment
        break;
        
      default:
        console.log(`ℹ️ Unhandled PayPal event type: ${event.event_type}`);
    }
    
    // Return a 200 response to acknowledge receipt of the event
    res.status(200).send('Webhook received');
  } catch (error) {
    console.error('❌ PayPal webhook error:', error.message);
    res.status(500).send('Webhook error');
  }
});

module.exports = router;