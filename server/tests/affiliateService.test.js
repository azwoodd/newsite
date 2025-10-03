// server/tests/affiliateService.test.js
const affiliateService = require('../services/affiliateService');
const { pool } = require('../config/db');

// Mock the database pool
jest.mock('../config/db', () => ({
  pool: {
    query: jest.fn(),
    getConnection: jest.fn()
  }
}));

describe('AffiliateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FEATURE_AFFILIATES = 'true';
    process.env.AFFIL_ATTRIBUTION = 'LAST_CLICK';
    process.env.AFFIL_BASIS = 'post_discount';
    process.env.AFFIL_COOKIE_DAYS = '30';
  });

  describe('trackClick', () => {
    const mockReq = {
      ip: '192.168.1.1',
      get: jest.fn(),
      session: { id: 'test-session' }
    };

    const mockRes = {
      cookie: jest.fn()
    };

    it('should track valid affiliate click', async () => {
      const mockCode = {
        id: 1,
        code: 'AFFILIATE1',
        affiliate_id: 1,
        status: 'approved'
      };

      pool.query.mockResolvedValueOnce([[mockCode]]);
      pool.query.mockResolvedValueOnce([[{ count: 0 }]]);
      pool.query.mockResolvedValueOnce([{ insertId: 1 }]);

      mockReq.get.mockReturnValue('Mozilla/5.0');

      const result = await affiliateService.trackClick('AFFILIATE1', mockReq, mockRes);

      expect(result.success).toBe(true);
      expect(result.codeId).toBe(1);
      expect(mockRes.cookie).toHaveBeenCalled();
    });

    it('should reject invalid affiliate code', async () => {
      pool.query.mockResolvedValueOnce([[]]);

      const result = await affiliateService.trackClick('INVALID', mockReq, mockRes);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid affiliate code');
    });

    it('should reject unapproved affiliate', async () => {
      const mockCode = {
        id: 1,
        code: 'PENDING',
        affiliate_id: 1,
        status: 'pending'
      };

      pool.query.mockResolvedValueOnce([[mockCode]]);

      const result = await affiliateService.trackClick('PENDING', mockReq, mockRes);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Affiliate not approved');
    });

    it('should prevent click spam', async () => {
      const mockCode = {
        id: 1,
        code: 'AFFILIATE1',
        affiliate_id: 1,
        status: 'approved'
      };

      pool.query.mockResolvedValueOnce([[mockCode]]);
      pool.query.mockResolvedValueOnce([[{ count: 15 }]]);

      const result = await affiliateService.trackClick('AFFILIATE1', mockReq, mockRes);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Too many clicks from this IP');
    });

    it('should reject when affiliate feature is disabled', async () => {
      process.env.FEATURE_AFFILIATES = 'false';

      const result = await affiliateService.trackClick('TEST', mockReq, mockRes);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Affiliate feature is disabled');
    });
  });

  describe('trackPurchase', () => {
    const mockReq = {
      ip: '192.168.1.1',
      get: jest.fn(),
      session: { id: 'test-session' },
      cookies: {
        ss_aff: 'signed-cookie-data'
      }
    };

    it('should track purchase and create commission', async () => {
      // Mock getAttribution
      jest.spyOn(affiliateService, 'getAttribution').mockResolvedValue({
        affiliateId: 1,
        codeId: 1
      });

      // Mock self-referral check
      pool.query.mockResolvedValueOnce([[{ user_id: 2 }]]); // Different user
      
      // Mock commission rate lookup
      pool.query.mockResolvedValueOnce([[{ commission_rate: 15.00 }]]);

      const mockConnection = {
        beginTransaction: jest.fn(),
        query: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
      };

      pool.getConnection.mockResolvedValue(mockConnection);

      const result = await affiliateService.trackPurchase(1, 1, 100.00, 10.00, mockReq);

      expect(result.success).toBe(true);
      expect(result.affiliateId).toBe(1);
      expect(result.commissionAmount).toBe(13.50); // 15% of $90 (post-discount)
      expect(mockConnection.commit).toHaveBeenCalled();
    });

    it('should prevent self-referral', async () => {
      jest.spyOn(affiliateService, 'getAttribution').mockResolvedValue({
        affiliateId: 1,
        codeId: 1
      });

      // Mock self-referral check - same user
      pool.query.mockResolvedValueOnce([[{ user_id: 1 }]]);

      const result = await affiliateService.trackPurchase(1, 1, 100.00, 10.00, mockReq);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Self-referral not allowed');
    });

    it('should handle no attribution', async () => {
      jest.spyOn(affiliateService, 'getAttribution').mockResolvedValue({
        affiliateId: null,
        codeId: null
      });

      const result = await affiliateService.trackPurchase(1, 1, 100.00, 10.00, mockReq);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No attribution found');
    });

    it('should calculate commission on pre-discount basis when configured', async () => {
      process.env.AFFIL_BASIS = 'pre_discount';

      jest.spyOn(affiliateService, 'getAttribution').mockResolvedValue({
        affiliateId: 1,
        codeId: 1
      });

      pool.query.mockResolvedValueOnce([[{ user_id: 2 }]]);
      pool.query.mockResolvedValueOnce([[{ commission_rate: 10.00 }]]);

      const mockConnection = {
        beginTransaction: jest.fn(),
        query: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
      };

      pool.getConnection.mockResolvedValue(mockConnection);

      const result = await affiliateService.trackPurchase(1, 1, 100.00, 10.00, mockReq);

      expect(result.success).toBe(true);
      expect(result.commissionAmount).toBe(10.00); // 10% of $100 (pre-discount)
    });
  });

  describe('getAttribution', () => {
    it('should return last click attribution', async () => {
      const mockReq = {
        cookies: {
          ss_aff: affiliateService.signData(JSON.stringify({
            codeId: 1,
            sessionId: 'test',
            timestamp: Date.now()
          }))
        }
      };

      pool.query.mockResolvedValueOnce([[{ affiliate_id: 1 }]]);

      const result = await affiliateService.getAttribution(1, mockReq);

      expect(result.affiliateId).toBe(1);
      expect(result.codeId).toBe(1);
    });

    it('should return first click attribution when configured', async () => {
      process.env.AFFIL_ATTRIBUTION = 'FIRST_CLICK';

      const mockReq = { cookies: {} };

      pool.query.mockResolvedValueOnce([[{
        code_id: 2,
        affiliate_id: 2,
        created_at: new Date()
      }]]);

      const result = await affiliateService.getAttribution(1, mockReq);

      expect(result.affiliateId).toBe(2);
      expect(result.codeId).toBe(2);
    });

    it('should return null attribution when no tracking found', async () => {
      const mockReq = { cookies: {} };
      pool.query.mockResolvedValueOnce([[]]);

      const result = await affiliateService.getAttribution(1, mockReq);

      expect(result.affiliateId).toBe(null);
      expect(result.codeId).toBe(null);
    });
  });

  describe('processCommissionApproval', () => {
    it('should approve commission and update affiliate balance', async () => {
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
      pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const result = await affiliateService.processCommissionApproval(1);

      expect(result.success).toBe(true);
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should handle no commission found', async () => {
      pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const result = await affiliateService.processCommissionApproval(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No commission found to approve');
    });
  });

  describe('Cookie handling', () => {
    it('should sign and verify cookie data correctly', () => {
      const testData = 'test-data';
      const signed = affiliateService.signData(testData);
      const verified = affiliateService.verifySignedData(signed);

      expect(verified).toBe(testData);
    });

    it('should reject tampered cookie data', () => {
      const testData = 'test-data';
      const signed = affiliateService.signData(testData);
      const tampered = signed.replace('test', 'hack');
      const verified = affiliateService.verifySignedData(tampered);

      expect(verified).toBe(null);
    });

    it('should handle malformed cookie data', () => {
      const verified = affiliateService.verifySignedData('malformed-data');
      expect(verified).toBe(null);
    });
  });

  describe('Data hashing', () => {
    it('should hash data consistently', () => {
      const data = 'test-data';
      const hash1 = affiliateService.hashData(data);
      const hash2 = affiliateService.hashData(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
    });

    it('should produce different hashes for different data', () => {
      const hash1 = affiliateService.hashData('data1');
      const hash2 = affiliateService.hashData('data2');

      expect(hash1).not.toBe(hash2);
    });
  });
});