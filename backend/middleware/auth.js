const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logActivity, getRequestInfo } = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    if (!user.isActive) {
      // Log suspended account access attempt
      const requestInfo = getRequestInfo(req);
      await logActivity({
        userId: user._id,
        action: 'unauthorized-access',
        resourceType: 'security',
        severity: 'warning',
        isSuspicious: true,
        details: { reason: 'Suspended account access attempt' },
        ...requestInfo
      });
      return res.status(403).json({ message: 'Account is suspended' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;

