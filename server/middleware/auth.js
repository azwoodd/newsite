// server/middleware/auth.js
const passport = require('passport');
const { pool } = require('../config/db');

// Helper function to get affiliate information for a user
const getAffiliateInfo = async (userId) => {
  try {
    const [affiliateRows] = await pool.query(`
      SELECT 
        a.id as affiliate_id,
        a.status as affiliate_status,
        a.commission_rate,
        a.balance,
        a.total_paid,
        a.tour_completed,
        pc.code as affiliate_code
      FROM affiliates a
      LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id AND pc.type = 'affiliate' AND pc.is_active = TRUE
      WHERE a.user_id = ?
    `, [userId]);

    if (affiliateRows.length > 0) {
      const affiliate = affiliateRows[0];
      return {
        isAffiliate: true,
        affiliateId: affiliate.affiliate_id,
        affiliateStatus: affiliate.affiliate_status,
        affiliateCode: affiliate.affiliate_code,
        commissionRate: affiliate.commission_rate,
        balance: affiliate.balance,
        totalPaid: affiliate.total_paid,
        tourCompleted: affiliate.tour_completed
      };
    }

    return {
      isAffiliate: false,
      affiliateId: null,
      affiliateStatus: null,
      affiliateCode: null,
      commissionRate: null,
      balance: null,
      totalPaid: null,
      tourCompleted: false
    };
  } catch (error) {
    console.error('Error getting affiliate info:', error);
    // Return default values on error to prevent auth failure
    return {
      isAffiliate: false,
      affiliateId: null,
      affiliateStatus: null,
      affiliateCode: null,
      commissionRate: null,
      balance: null,
      totalPaid: null,
      tourCompleted: false
    };
  }
};

// Middleware to authenticate with JWT and authorize regular users
exports.authenticateUser = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, async (err, user, info) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No valid token provided'
      });
    }
    
    try {
      // Get affiliate information for the user
      const affiliateInfo = await getAffiliateInfo(user.id);
      
      // Set user info with affiliate data in the request
      req.user = {
        ...user,
        ...affiliateInfo
      };
      
      next();
    } catch (error) {
      console.error('Error enriching user with affiliate info:', error);
      // Continue with basic user info if affiliate lookup fails
      req.user = {
        ...user,
        isAffiliate: false,
        affiliateId: null,
        affiliateStatus: null,
        affiliateCode: null,
        commissionRate: null,
        balance: null,
        totalPaid: null,
        tourCompleted: false
      };
      next();
    }
  })(req, res, next);
};

// Middleware to authenticate and authorize admin users
exports.authenticateAdmin = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, async (err, user, info) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No valid token provided'
      });
    }
    
    // Check if user is an admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - Admin access required'
      });
    }
    
    try {
      // Get affiliate information for the admin user (admins can also be affiliates)
      const affiliateInfo = await getAffiliateInfo(user.id);
      
      // Set user info with affiliate data in the request
      req.user = {
        ...user,
        ...affiliateInfo
      };
      
      next();
    } catch (error) {
      console.error('Error enriching admin with affiliate info:', error);
      // Continue with basic user info if affiliate lookup fails
      req.user = {
        ...user,
        isAffiliate: false,
        affiliateId: null,
        affiliateStatus: null,
        affiliateCode: null,
        commissionRate: null,
        balance: null,
        totalPaid: null,
        tourCompleted: false
      };
      next();
    }
  })(req, res, next);
};

// Optional middleware for routes that may have affiliate tracking but don't require authentication
exports.optionalAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, async (err, user, info) => {
    // Don't return error for optional auth - just continue without user
    if (err || !user) {
      req.user = null;
      return next();
    }
    
    try {
      // Get affiliate information for the user
      const affiliateInfo = await getAffiliateInfo(user.id);
      
      // Set user info with affiliate data in the request
      req.user = {
        ...user,
        ...affiliateInfo
      };
      
      next();
    } catch (error) {
      console.error('Error enriching user with affiliate info in optional auth:', error);
      // Continue with basic user info if affiliate lookup fails
      req.user = {
        ...user,
        isAffiliate: false,
        affiliateId: null,
        affiliateStatus: null,
        affiliateCode: null,
        commissionRate: null,
        balance: null,
        totalPaid: null,
        tourCompleted: false
      };
      next();
    }
  })(req, res, next);
};

// Middleware specifically for affiliate-only routes
exports.authenticateAffiliate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, async (err, user, info) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No valid token provided'
      });
    }
    
    try {
      // Get affiliate information for the user
      const affiliateInfo = await getAffiliateInfo(user.id);
      
      // Check if user is an approved affiliate
      if (!affiliateInfo.isAffiliate || affiliateInfo.affiliateStatus !== 'approved') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden - Approved affiliate status required'
        });
      }
      
      // Set user info with affiliate data in the request
      req.user = {
        ...user,
        ...affiliateInfo
      };
      
      next();
    } catch (error) {
      console.error('Error checking affiliate status:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verifying affiliate status'
      });
    }
  })(req, res, next);
};

// Middleware for routes that require either admin or affiliate access
exports.authenticateAdminOrAffiliate = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, async (err, user, info) => {
    if (err) {
      return next(err);
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - No valid token provided'
      });
    }
    
    try {
      // Get affiliate information for the user
      const affiliateInfo = await getAffiliateInfo(user.id);
      
      // Check if user is admin or approved affiliate
      const isAdmin = user.role === 'admin';
      const isApprovedAffiliate = affiliateInfo.isAffiliate && affiliateInfo.affiliateStatus === 'approved';
      
      if (!isAdmin && !isApprovedAffiliate) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden - Admin or approved affiliate access required'
        });
      }
      
      // Set user info with affiliate data in the request
      req.user = {
        ...user,
        ...affiliateInfo
      };
      
      next();
    } catch (error) {
      console.error('Error checking user permissions:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verifying user permissions'
      });
    }
  })(req, res, next);
};

// Rate limiting helper - can be used with affiliate tracking
exports.createRateLimitKeyGenerator = (type = 'ip') => {
  return (req) => {
    switch (type) {
      case 'user':
        return req.user ? `user_${req.user.id}` : req.ip;
      case 'affiliate':
        return req.user && req.user.isAffiliate ? `affiliate_${req.user.affiliateId}` : req.ip;
      case 'ip':
      default:
        return req.ip;
    }
  };
};