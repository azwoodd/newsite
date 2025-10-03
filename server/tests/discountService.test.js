// server/tests/discountService.test.js
const discountService = require('../services/discountService');
const { pool } = require('../config/db');

// Mock the database pool
jest.mock('../config/db', () => ({
  pool: {
    query: jest.fn(),
    getConnection: jest.fn()
  }
}));

describe('DiscountService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FEATURE_DISCOUNTS = 'true';
  });

  describe('validatePromoCode', () => {
    it('should validate a valid percentage discount code', async () => {
      const mockCode = {
        id: 1,
        code: 'WELCOME10',
        name: 'Welcome Discount',
        type: 'discount',
        discount_amount: 10.00,
        is_percentage: 1,
        min_order_value: 0.00,
        max_uses: 0,
        current_uses: 0,
        max_uses_per_user: 1,
        starts_at: null,
        expires_at: null,
        is_active: 1,
        affiliate_id: null
      };

      pool.query.mockResolvedValueOnce([[mockCode]]);
      pool.query.mockResolvedValueOnce([[{ usage_count: 0 }]]);

      const result = await discountService.validatePromoCode('WELCOME10', 1, 100.00);

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(10.00);
      expect(result.finalTotal).toBe(90.00);
    });

    it('should validate a valid fixed discount code', async () => {
      const mockCode = {
        id: 2,
        code: 'SAVE20',
        name: 'Save $20',
        type: 'discount',
        discount_amount: 20.00,
        is_percentage: 0,
        min_order_value: 50.00,
        max_uses: 100,
        current_uses: 10,
        max_uses_per_user: 1,
        starts_at: null,
        expires_at: null,
        is_active: 1,
        affiliate_id: null
      };

      pool.query.mockResolvedValueOnce([[mockCode]]);
      pool.query.mockResolvedValueOnce([[{ usage_count: 0 }]]);

      const result = await discountService.validatePromoCode('SAVE20', 1, 100.00);

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(20.00);
      expect(result.finalTotal).toBe(80.00);
    });

    it('should reject invalid promo code', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const result = await discountService.validatePromoCode('INVALID', 1, 100.00);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid promo code');
    });

    it('should reject inactive promo code', async () => {
      const mockCode = {
        id: 1,
        code: 'INACTIVE',
        is_active: 0
      };

      pool.query.mockResolvedValueOnce([[mockCode]]);

      const result = await discountService.validatePromoCode('INACTIVE', 1, 100.00);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('This promo code is no longer active');
    });

    it('should reject expired promo code', async () => {
      const mockCode = {
        id: 1,
        code: 'EXPIRED',
        is_active: 1,
        expires_at: new Date(Date.now() - 86400000) // Yesterday
      };

      pool.query.mockResolvedValueOnce([[mockCode]]);

      const result = await discountService.validatePromoCode('EXPIRED', 1, 100.00);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('This promo code has expired');
    });

    it('should reject code that does not meet minimum order value', async () => {
      const mockCode = {
        id: 1,
        code: 'MINORDER',
        is_active: 1,
        min_order_value: 150.00,
        expires_at: null
      };

      pool.query.mockResolvedValueOnce([[mockCode]]);

      const result = await discountService.validatePromoCode('MINORDER', 1, 100.00);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Minimum order value of $150 required');
    });

    it('should reject code that has reached usage limit', async () => {
      const mockCode = {
        id: 1,
        code: 'MAXUSED',
        is_active: 1,
        min_order_value: 0,
        max_uses: 10,
        current_uses: 10,
        expires_at: null
      };

      pool.query.mockResolvedValueOnce([[mockCode]]);

      const result = await discountService.validatePromoCode('MAXUSED', 1, 100.00);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('This promo code has reached its usage limit');
    });

    it('should reject code that user has already used maximum times', async () => {
      const mockCode = {
        id: 1,
        code: 'USERMAX',
        is_active: 1,
        min_order_value: 0,
        max_uses: 0,
        current_uses: 5,
        max_uses_per_user: 1,
        expires_at: null
      };

      pool.query.mockResolvedValueOnce([[mockCode]]);
      pool.query.mockResolvedValueOnce([[{ usage_count: 1 }]]);

      const result = await discountService.validatePromoCode('USERMAX', 1, 100.00);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('You have already used this promo code the maximum number of times');
    });

    it('should reject when discount feature is disabled', async () => {
      process.env.FEATURE_DISCOUNTS = 'false';

      const result = await discountService.validatePromoCode('TEST', 1, 100.00);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Discount feature is currently disabled');
    });
  });

  describe('calculateDiscount', () => {
    it('should calculate percentage discount correctly', () => {
      const result = discountService.calculateDiscount(15, true, 100.00);
      expect(result).toBe(15.00);
    });

    it('should calculate fixed discount correctly', () => {
      const result = discountService.calculateDiscount(25, false, 100.00);
      expect(result).toBe(25.00);
    });

    it('should not exceed order value for fixed discount', () => {
      const result = discountService.calculateDiscount(150, false, 100.00);
      expect(result).toBe(100.00);
    });

    it('should round percentage discount to 2 decimal places', () => {
      const result = discountService.calculateDiscount(33.33, true, 100.00);
      expect(result).toBe(33.33);
    });
  });

  describe('recordUsage', () => {
    it('should record promo code usage and increment counter', async () => {
      const mockConnection = {
        beginTransaction: jest.fn(),
        query: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
      };

      pool.getConnection.mockResolvedValue(mockConnection);

      await discountService.recordUsage(1, 2, 3, 15.00);

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalledTimes(2);
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const mockConnection = {
        beginTransaction: jest.fn(),
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
      };

      pool.getConnection.mockResolvedValue(mockConnection);

      await expect(discountService.recordUsage(1, 2, 3, 15.00)).rejects.toThrow('Database error');

      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });
});