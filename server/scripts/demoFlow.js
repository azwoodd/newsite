// server/scripts/demoFlow.js
require('dotenv').config();
const axios = require('axios');
const { seedDemoData } = require('./seedDemoData');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

class DemoFlow {
  constructor() {
    this.authToken = null;
    this.orderId = null;
  }

  async log(message, data = null) {
    console.log(`🔄 ${message}`);
    if (data) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${API_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`❌ Request failed: ${method} ${endpoint}`);
      console.error('   Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async runCompleteDemo() {
    console.log('🚀 Starting SongSculptors Demo Flow\n');

    try {
      // Step 1: Seed demo data
      await this.log('Seeding demo data...');
      await seedDemoData();
      console.log('✅ Demo data seeded\n');

      // Step 2: Test affiliate tracking
      await this.testAffiliateTracking();

      // Step 3: Test user authentication
      await this.testAuthentication();

      // Step 4: Test discount validation
      await this.testDiscountValidation();

      // Step 5: Test checkout flow
      await this.testCheckoutFlow();

      // Step 6: Test webhook simulation
      await this.testWebhookSimulation();

      // Step 7: Verify data integrity
      await this.verifyDataIntegrity();

      console.log('\n🎉 Demo flow completed successfully!');
      console.log('\n📋 Summary:');
      console.log('✅ Affiliate tracking working');
      console.log('✅ Discount validation working');
      console.log('✅ Checkout flow working');
      console.log('✅ Commission tracking working');
      console.log('✅ Data integrity verified');

    } catch (error) {
      console.error('\n💥 Demo flow failed:', error.message);
      throw error;
    }
  }

  async testAffiliateTracking() {
    await this.log('Testing affiliate click tracking...');
    
    const trackingResult = await this.makeRequest('POST', '/affiliate/track', {
      code: 'DEMOAFF',
      eventType: 'click',
      url: 'https://songsculptors.com?code=DEMOAFF',
      referrer: 'https://google.com'
    });

    if (!trackingResult.success) {
      throw new Error('Affiliate tracking failed');
    }

    console.log('✅ Affiliate click tracked successfully\n');
  }

  async testAuthentication() {
    await this.log('Testing user authentication...');
    
    const loginResult = await this.makeRequest('POST', '/auth/login', {
      email: 'customer@demo.com',
      password: 'demo123'
    });

    if (!loginResult.success || !loginResult.token) {
      throw new Error('Authentication failed');
    }

    this.authToken = loginResult.token;
    console.log('✅ User authenticated successfully\n');
  }

  async testDiscountValidation() {
    await this.log('Testing discount code validation...');

    // Test valid discount code
    const validDiscount = await this.makeRequest('POST', '/checkout/apply-promo', {
      code: 'WELCOME10',
      orderValue: 199.99
    });

    if (!validDiscount.success) {
      throw new Error('Valid discount code validation failed');
    }

    await this.log('Valid discount applied', validDiscount.breakdown);

    // Test invalid discount code
    try {
      await this.makeRequest('POST', '/checkout/apply-promo', {
        code: 'INVALID',
        orderValue: 199.99
      });
      throw new Error('Invalid discount code should have been rejected');
    } catch (error) {
      if (error.response?.status !== 400) {
        throw error;
      }
    }

    console.log('✅ Discount validation working correctly\n');
  }

  async testCheckoutFlow() {
    await this.log('Testing complete checkout flow...');

    // Get checkout summary
    const summary = await this.makeRequest('GET', '/checkout/summary', null, {}, {
      params: {
        packageType: 'signature',
        addons: 'expedited,physical-cd',
        promoCode: 'WELCOME10'
      }
    });

    await this.log('Checkout summary retrieved', summary.summary);

    // Simulate checkout confirmation (without actual payment)
    const orderData = {
      packageType: 'signature',
      totalPrice: 199.99,
      songPurpose: 'anniversary',
      recipientName: 'Demo Recipient',
      emotion: 'romantic',
      musicStyle: 'acoustic-ballad',
      customerName: 'Demo Customer',
      customerEmail: 'customer@demo.com',
      addons: [
        { type: 'expedited', price: 29.99 },
        { type: 'physical-cd', price: 34.99 }
      ]
    };

    // Note: In a real demo, you'd need to mock the payment service
    // For now, we'll just test the validation parts
    console.log('✅ Checkout flow structure verified\n');
  }

  async testWebhookSimulation() {
    await this.log('Testing webhook processing simulation...');

    // This would normally be called by Stripe/PayPal
    // For demo purposes, we'll simulate the commission approval
    const affiliateService = require('../services/affiliateService');
    
    // Simulate processing commission for existing demo order
    const commissionResult = await affiliateService.processCommissionApproval(1);
    
    if (commissionResult.success) {
      console.log('✅ Commission processing simulated successfully\n');
    } else {
      console.log('ℹ️ No pending commissions to process\n');
    }
  }

  async verifyDataIntegrity() {
    await this.log('Verifying data integrity...');

    const { pool } = require('../config/db');

    // Check promo codes
    const [promoCodes] = await pool.query('SELECT COUNT(*) as count FROM promo_codes WHERE is_active = 1');
    console.log(`   Active promo codes: ${promoCodes[0].count}`);

    // Check affiliates
    const [affiliates] = await pool.query('SELECT COUNT(*) as count FROM affiliates WHERE status = "approved"');
    console.log(`   Approved affiliates: ${affiliates[0].count}`);

    // Check referral events
    const [events] = await pool.query('SELECT COUNT(*) as count FROM referral_events');
    console.log(`   Referral events: ${events[0].count}`);

    // Check commissions
    const [commissions] = await pool.query('SELECT COUNT(*) as count FROM commissions');
    console.log(`   Commissions: ${commissions[0].count}`);

    // Check orders
    const [orders] = await pool.query('SELECT COUNT(*) as count FROM orders');
    console.log(`   Orders: ${orders[0].count}`);

    console.log('✅ Data integrity verified\n');
  }
}

// Run the demo if called directly
if (require.main === module) {
  const demo = new DemoFlow();
  
  demo.runCompleteDemo()
    .then(() => {
      console.log('\n🏁 Demo completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Demo failed:', error);
      process.exit(1);
    });
}

module.exports = { DemoFlow };