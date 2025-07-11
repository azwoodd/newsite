// client/src/services/affiliateService.js
import api from './api';

// Helper function to extract error message
const getErrorMessage = (error) => {
  if (error.response && error.response.data) {
    return error.response.data.message || 'An error occurred. Please try again.';
  }
  return error.message || 'Network error. Please check your connection.';
};

// User Affiliate Services
export const affiliateService = {
  // Get current user's affiliate status
  getStatus: async () => {
    try {
      console.log('[Affiliate Service] Getting affiliate status');
      return await api.get('/affiliate/status');
    } catch (error) {
      console.error('[Affiliate Service] Error getting status:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Submit affiliate application
  submitApplication: async (applicationData) => {
    try {
      console.log('[Affiliate Service] Submitting affiliate application');
      return await api.post('/affiliate/apply', applicationData);
    } catch (error) {
      console.error('[Affiliate Service] Error submitting application:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Get affiliate dashboard data
  getDashboard: async () => {
    try {
      console.log('[Affiliate Service] Getting affiliate dashboard data');
      return await api.get('/affiliate/dashboard');
    } catch (error) {
      console.error('[Affiliate Service] Error getting dashboard:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Get referral history
  getReferrals: async (page = 1, limit = 20) => {
    try {
      console.log(`[Affiliate Service] Getting referrals (page ${page})`);
      return await api.get('/affiliate/referrals', {
        params: { page, limit }
      });
    } catch (error) {
      console.error('[Affiliate Service] Error getting referrals:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Regenerate affiliate code
  regenerateCode: async () => {
    try {
      console.log('[Affiliate Service] Regenerating affiliate code');
      return await api.post('/affiliate/regenerate-code');
    } catch (error) {
      console.error('[Affiliate Service] Error regenerating code:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Request payout
  requestPayout: async (amount) => {
    try {
      console.log('[Affiliate Service] Requesting payout:', amount);
      return await api.post('/affiliate/request-payout', { amount });
    } catch (error) {
      console.error('[Affiliate Service] Error requesting payout:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Validate promo code
  validatePromoCode: async (code, orderTotal) => {
    try {
      console.log('[Affiliate Service] Validating promo code:', code);
      return await api.post('/affiliate/validate-code', { code, orderTotal });
    } catch (error) {
      console.error('[Affiliate Service] Error validating promo code:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Track referral event
  trackEvent: async (code, eventType, orderId = null, sessionId = null) => {
    try {
      console.log(`[Affiliate Service] Tracking event: ${eventType} for code: ${code}`);
      return await api.post('/affiliate/track', {
        code,
        eventType,
        orderId,
        sessionId
      });
    } catch (error) {
      console.error('[Affiliate Service] Error tracking event:', error);
      // Don't throw for tracking errors - they shouldn't break user experience
      return { success: false, error: getErrorMessage(error) };
    }
  },

  // Get affiliate link preview
  getLinkPreview: async (code) => {
    try {
      console.log('[Affiliate Service] Getting link preview for:', code);
      return await api.get(`/affiliate/link/${code}`);
    } catch (error) {
      console.error('[Affiliate Service] Error getting link preview:', error);
      throw new Error(getErrorMessage(error));
    }
  }
};

// Admin Affiliate Services
export const adminAffiliateService = {
  // Get all affiliates
  getAllAffiliates: async (params = {}) => {
    try {
      const {
        status = 'all',
        page = 1,
        limit = 20,
        search = '',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = params;

      console.log('[Admin Affiliate Service] Getting all affiliates');
      return await api.get('/affiliate/admin/affiliates', {
        params: { status, page, limit, search, sortBy, sortOrder }
      });
    } catch (error) {
      console.error('[Admin Affiliate Service] Error getting affiliates:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Get specific affiliate details
  getAffiliateDetails: async (affiliateId) => {
    try {
      console.log(`[Admin Affiliate Service] Getting affiliate details: ${affiliateId}`);
      return await api.get(`/affiliate/admin/affiliates/${affiliateId}`);
    } catch (error) {
      console.error('[Admin Affiliate Service] Error getting affiliate details:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Approve affiliate application
  approveAffiliate: async (affiliateId, data) => {
    try {
      console.log(`[Admin Affiliate Service] Approving affiliate: ${affiliateId}`);
      return await api.post(`/affiliate/admin/affiliates/${affiliateId}/approve`, data);
    } catch (error) {
      console.error('[Admin Affiliate Service] Error approving affiliate:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Deny affiliate application
  denyAffiliate: async (affiliateId, data) => {
    try {
      console.log(`[Admin Affiliate Service] Denying affiliate: ${affiliateId}`);
      return await api.post(`/affiliate/admin/affiliates/${affiliateId}/deny`, data);
    } catch (error) {
      console.error('[Admin Affiliate Service] Error denying affiliate:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Update affiliate settings
  updateAffiliate: async (affiliateId, data) => {
    try {
      console.log(`[Admin Affiliate Service] Updating affiliate: ${affiliateId}`);
      return await api.put(`/affiliate/admin/affiliates/${affiliateId}`, data);
    } catch (error) {
      console.error('[Admin Affiliate Service] Error updating affiliate:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Update affiliate status (suspend/activate)
  updateAffiliateStatus: async (affiliateId, status) => {
    try {
      console.log(`[Admin Affiliate Service] Updating affiliate status: ${affiliateId} -> ${status}`);
      return await api.put(`/affiliate/admin/affiliates/${affiliateId}/status`, { status });
    } catch (error) {
      console.error('[Admin Affiliate Service] Error updating affiliate status:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Get all promo codes
  getAllPromoCodes: async (params = {}) => {
    try {
      const {
        type = 'all',
        status = 'all',
        page = 1,
        limit = 20,
        search = '',
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = params;

      console.log('[Admin Affiliate Service] Getting all promo codes');
      return await api.get('/affiliate/admin/promo-codes', {
        params: { type, status, page, limit, search, sortBy, sortOrder }
      });
    } catch (error) {
      console.error('[Admin Affiliate Service] Error getting promo codes:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Create discount code
  createDiscountCode: async (codeData) => {
    try {
      console.log('[Admin Affiliate Service] Creating discount code');
      return await api.post('/affiliate/admin/promo-codes', codeData);
    } catch (error) {
      console.error('[Admin Affiliate Service] Error creating discount code:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Update promo code
  updatePromoCode: async (codeId, data) => {
    try {
      console.log(`[Admin Affiliate Service] Updating promo code: ${codeId}`);
      return await api.put(`/affiliate/admin/promo-codes/${codeId}`, data);
    } catch (error) {
      console.error('[Admin Affiliate Service] Error updating promo code:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Delete/deactivate promo code
  deletePromoCode: async (codeId) => {
    try {
      console.log(`[Admin Affiliate Service] Deleting promo code: ${codeId}`);
      return await api.delete(`/affiliate/admin/promo-codes/${codeId}`);
    } catch (error) {
      console.error('[Admin Affiliate Service] Error deleting promo code:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Get affiliate analytics
  getAnalytics: async (period = '30d', affiliateId = null) => {
    try {
      console.log('[Admin Affiliate Service] Getting affiliate analytics');
      return await api.get('/affiliate/admin/analytics', {
        params: { period, affiliateId }
      });
    } catch (error) {
      console.error('[Admin Affiliate Service] Error getting analytics:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  // Get performance overview
  getPerformanceOverview: async (startDate = null, endDate = null) => {
    try {
      console.log('[Admin Affiliate Service] Getting performance overview');
      return await api.get('/affiliate/admin/performance', {
        params: { startDate, endDate }
      });
    } catch (error) {
      console.error('[Admin Affiliate Service] Error getting performance overview:', error);
      throw new Error(getErrorMessage(error));
    }
  }
};

export default { affiliateService, adminAffiliateService };