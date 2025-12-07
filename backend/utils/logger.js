const SystemLog = require('../models/SystemLog');

/**
 * Comprehensive logging utility
 */
const logActivity = async (options) => {
  try {
    const {
      userId = null,
      institutionId = null,
      action,
      resourceType,
      resourceId = null,
      resourceName = '',
      details = {},
      ipAddress = null,
      userAgent = null,
      severity = 'info',
      isSuspicious = false,
      metadata = {}
    } = options;

    const log = new SystemLog({
      userId,
      institutionId,
      action,
      resourceType,
      resourceId,
      resourceName,
      details,
      ipAddress,
      userAgent,
      severity,
      isSuspicious,
      metadata
    });

    await log.save();
    return log;
  } catch (error) {
    console.error('Logging error:', error);
    // Don't throw - logging should never break the application
    return null;
  }
};

/**
 * Extract IP and User Agent from request
 */
const getRequestInfo = (req) => {
  return {
    ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown'
  };
};

module.exports = {
  logActivity,
  getRequestInfo
};

