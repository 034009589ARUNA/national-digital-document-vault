const User = require('../models/User');

/**
 * Role-Based Access Control Middleware
 * Usage: requireRole(['admin', 'issuer'])
 */
const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Get fresh user data to ensure role is current
      const user = await User.findById(req.user._id).select('role isActive');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: 'Account is suspended' });
      }

      // Check if user has required role
      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          message: 'Access denied. Insufficient permissions.',
          required: allowedRoles,
          current: user.role
        });
      }

      // Attach role to request for use in routes
      req.userRole = user.role;
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({ message: 'Authorization check failed' });
    }
  };
};

/**
 * Admin only middleware
 */
const requireAdmin = requireRole('admin');

/**
 * Issuer only middleware
 */
const requireIssuer = requireRole('issuer');

/**
 * Requester only middleware
 */
const requireRequester = requireRole('requester');

/**
 * Auditor only middleware
 */
const requireAuditor = requireRole('auditor');

/**
 * Institution or Admin middleware
 */
const requireInstitution = requireRole('issuer', 'requester', 'auditor', 'admin');

module.exports = {
  requireRole,
  requireAdmin,
  requireIssuer,
  requireRequester,
  requireAuditor,
  requireInstitution
};

