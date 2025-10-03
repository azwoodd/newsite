// server/tests/checkout.integration.test.js
const request = require('supertest');
const express = require('express');
const checkoutRoutes = require('../routes/checkout');
const { pool } = require('../config/db');

// Mock dependencies
jest.mock('../config/db');
jest.mock('../services/discountService');
jest.mock('../services/affiliateService');
jest.mock('../services/paymentService');

const discountService = require('../services/discountService');
const affiliateService = require('../services/affiliateService');
const paymentService = require('../services/paymentService');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/checkout', checkoutRoutes);

// Mock authentication middleware
jest.mock('../middleware/auth', () => ({
  authenticateUser: (req, res, next) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  },
  optionalAuth: (req, res, next) => {
    req.user = { id: 1, email: 'test@example.com' };
    next();
  }
}));

describe('Checkout API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/checkout/apply-promo', () => {
    it('should apply valid promo code', async () => {
      discountService.validatePromoCode.mockResolvedValue({
        valid: true,
        code: {
          code: 'WELCOME10',
          name: 'Welcome Discount',
          is_percentage: true,
          discount_amount: 10
        },
        discountAmount: 10.00,
        finalTotal: 90.00
      });

      const response = await request(app)
        .post('/api/checkout/apply-promo')
        .send({
          code: 'WELCOME10',
          orderValue: 100.00
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.breakdown.discountAmount).toBe(10.00);
      expect(response.body.breakdown.finalTotal).toBe(90.00);
    });

    it('should reject invalid promo code', async () => {
      discountService.validatePromoCode.mockResolvedValue({
        valid: false,
        error: 'Invalid promo code'
      });

      const response = await request(app)
        .post('/api/checkout/apply-promo')
        .send({
          code: 'INVALID',
          orderValue: 100.00
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid promo code');
    });

    it('should require code and order value', async () => {
      const response = await request(app)
        .post('/api/checkout/apply-promo')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Code and order value are required');
    });
  });

  describe('POST /api/checkout/confirm', () => {
    const mockOrderData = {
      packageType: 'signature',
      totalPrice: 199.99,
      songPurpose: 'wedding',
      recipientName: 'John Doe',
      emotion: 'happy',
      musicStyle: 'acoustic',
      customerName: 'Jane Smith',
      customerEmail: 'jane@example.com'
    };

    beforeEach(() => {
      // Mock database connection
      const mockConnection = {
        beginTransaction: jest.fn(),
        query: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
      };
      pool.getConnection.mockResolvedValue(mockConnection);
    });

    it('should confirm checkout without promo code', async () => {
      affiliateService.getAttribution.mockResolvedValue({
        affiliateId: null,
        codeId: null
      });

      paymentService.processPayment.mockResolvedValue({
        success: true,
        paymentId: 'pi_test123',
        status: 'paid',
        details: { provider: 'stripe' }
      });

      const mockConnection = await pool.getConnection();
      mockConnection.query.mockResolvedValueOnce([{ insertId: 123 }]);

      const response = await request(app)
        .post('/api/checkout/confirm')
        .send({
          orderData: mockOrderData,
          paymentMethodId: 'pm_test123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.order.id).toBe(123);
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should confirm checkout with valid promo code', async () => {
      discountService.validatePromoCode.mockResolvedValue({
        valid: true,
        code: {
          id: 1,
          code: 'SAVE20',
          name: 'Save $20'
        },
        discountAmount: 20.00,
        finalTotal: 179.99
      });

      discountService.recordUsage.mockResolvedValue();

      affiliateService.getAttribution.mockResolvedValue({
        affiliateId: null,
        codeId: null
      });

      paymentService.processPayment.mockResolvedValue({
        success: true,
        paymentId: 'pi_test123',
        status: 'paid',
        details: { provider: 'stripe' }
      });

      const mockConnection = await pool.getConnection();
      mockConnection.query.mockResolvedValueOnce([{ insertId: 123 }]);

      const response = await request(app)
        .post('/api/checkout/confirm')
        .send({
          orderData: mockOrderData,
          promoCode: 'SAVE20',
          paymentMethodId: 'pm_test123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.order.discountAmount).toBe(20.00);
      expect(discountService.recordUsage).toHaveBeenCalled();
    });

    it('should confirm checkout with affiliate attribution', async () => {
      affiliateService.getAttribution.mockResolvedValue({
        affiliateId: 1,
        codeId: 1
      });

      affiliateService.trackPurchase.mockResolvedValue({
        success: true,
        affiliateId: 1,
        commissionAmount: 20.00
      });

      paymentService.processPayment.mockResolvedValue({
        success: true,
        paymentId: 'pi_test123',
        status: 'paid',
        details: { provider: 'stripe' }
      });

      const mockConnection = await pool.getConnection();
      mockConnection.query.mockResolvedValueOnce([{ insertId: 123 }]);

      const response = await request(app)
        .post('/api/checkout/confirm')
        .send({
          orderData: mockOrderData,
          paymentMethodId: 'pm_test123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(affiliateService.trackPurchase).toHaveBeenCalled();
    });

    it('should handle payment failure', async () => {
      affiliateService.getAttribution.mockResolvedValue({
        affiliateId: null,
        codeId: null
      });

      paymentService.processPayment.mockResolvedValue({
        success: false,
        error: 'Payment declined'
      });

      const mockConnection = await pool.getConnection();
      mockConnection.query.mockResolvedValueOnce([{ insertId: 123 }]);

      const response = await request(app)
        .post('/api/checkout/confirm')
        .send({
          orderData: mockOrderData,
          paymentMethodId: 'pm_test123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Payment declined');
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('should handle invalid promo code during checkout', async () => {
      discountService.validatePromoCode.mockResolvedValue({
        valid: false,
        error: 'Promo code expired'
      });

      const mockConnection = await pool.getConnection();

      const response = await request(app)
        .post('/api/checkout/confirm')
        .send({
          orderData: mockOrderData,
          promoCode: 'EXPIRED',
          paymentMethodId: 'pm_test123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Promo code expired');
      expect(mockConnection.rollback).toHaveBeenCalled();
    });

    it('should require valid order data', async () => {
      const response = await request(app)
        .post('/api/checkout/confirm')
        .send({
          orderData: {},
          paymentMethodId: 'pm_test123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid order data');
    });
  });

  describe('GET /api/checkout/summary', () => {
    it('should return checkout summary without promo code', async () => {
      const response = await request(app)
        .get('/api/checkout/summary')
        .query({
          packageType: 'signature',
          addons: 'expedited,physical-cd'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary.packageType).toBe('signature');
      expect(response.body.summary.basePrice).toBe(199.99);
      expect(response.body.summary.addons).toHaveLength(2);
    });

    it('should return checkout summary with valid promo code', async () => {
      discountService.validatePromoCode.mockResolvedValue({
        valid: true,
        code: {
          code: 'WELCOME10'
        },
        discountAmount: 26.50,
        finalTotal: 238.48
      });

      const response = await request(app)
        .get('/api/checkout/summary')
        .query({
          packageType: 'signature',
          addons: 'expedited,physical-cd',
          promoCode: 'WELCOME10'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary.promoCode).toBe('WELCOME10');
      expect(response.body.summary.discountAmount).toBe(26.50);
      expect(response.body.summary.finalTotal).toBe(238.48);
    });

    it('should return checkout summary with invalid promo code error', async () => {
      discountService.validatePromoCode.mockResolvedValue({
        valid: false,
        error: 'Invalid promo code'
      });

      const response = await request(app)
        .get('/api/checkout/summary')
        .query({
          packageType: 'signature',
          promoCode: 'INVALID'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.summary.promoError).toBe('Invalid promo code');
      expect(response.body.summary.discountAmount).toBe(0);
    });
  });
});