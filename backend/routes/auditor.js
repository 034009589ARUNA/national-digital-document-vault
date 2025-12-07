const express = require('express');
const auth = require('../middleware/auth');
const { requireAuditor } = require('../middleware/rbac');
const SystemLog = require('../models/SystemLog');
const Document = require('../models/Document');
const DocumentRequest = require('../models/DocumentRequest');
const Institution = require('../models/Institution');
const User = require('../models/User');
const { logActivity, getRequestInfo } = require('../utils/logger');
const router = express.Router();

// All auditor routes require authentication and auditor role
router.use(auth);
router.use(requireAuditor);

// Get all system logs (read-only)
router.get('/logs', async (req, res) => {
  try {
    const { 
      action, 
      resourceType, 
      severity, 
      isSuspicious, 
      userId, 
      institutionId,
      startDate, 
      endDate,
      page = 1, 
      limit = 50 
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (action) filter.action = action;
    if (resourceType) filter.resourceType = resourceType;
    if (severity) filter.severity = severity;
    if (isSuspicious !== undefined) filter.isSuspicious = isSuspicious === 'true';
    if (userId) filter.userId = userId;
    if (institutionId) filter.institutionId = institutionId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const logs = await SystemLog.find(filter)
      .populate('userId', 'name email role')
      .populate('institutionId', 'name type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SystemLog.countDocuments(filter);

    // Log audit view
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      action: 'audit-view',
      resourceType: 'system',
      details: { filter },
      ...requestInfo
    });

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get suspicious activities
router.get('/logs/suspicious', async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      isSuspicious: true,
      severity: { $in: ['warning', 'error', 'critical'] }
    };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const logs = await SystemLog.find(filter)
      .populate('userId', 'name email role')
      .populate('institutionId', 'name type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SystemLog.countDocuments(filter);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get suspicious logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark activity as fraud
router.post('/logs/:id/fraud', async (req, res) => {
  try {
    const { reason } = req.body;
    const log = await SystemLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }

    log.isSuspicious = true;
    log.severity = 'critical';
    if (log.details) {
      log.details.set('fraudMarkedBy', req.user._id);
      log.details.set('fraudReason', reason);
      log.details.set('fraudMarkedAt', new Date());
    }
    await log.save();

    // Log fraud detection
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      action: 'fraud-detected',
      resourceType: 'security',
      resourceId: log._id,
      details: { reason, originalLogId: log._id },
      severity: 'critical',
      isSuspicious: true,
      ...requestInfo
    });

    res.json({
      message: 'Activity marked as fraud',
      log
    });
  } catch (error) {
    console.error('Mark fraud error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get compliance statistics
router.get('/compliance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [
      totalLogs,
      suspiciousLogs,
      failedLogins,
      unauthorizedAccess,
      documentIssues,
      accessRequests,
      apiCalls
    ] = await Promise.all([
      SystemLog.countDocuments({ ...dateFilter }),
      SystemLog.countDocuments({ ...dateFilter, isSuspicious: true }),
      SystemLog.countDocuments({ ...dateFilter, action: 'failed-login' }),
      SystemLog.countDocuments({ ...dateFilter, action: 'unauthorized-access' }),
      SystemLog.countDocuments({ ...dateFilter, action: 'document-issue' }),
      SystemLog.countDocuments({ ...dateFilter, action: 'access-request' }),
      SystemLog.countDocuments({ ...dateFilter, action: 'api-call' })
    ]);

    res.json({
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      activities: {
        total: totalLogs,
        suspicious: suspiciousLogs,
        failedLogins,
        unauthorizedAccess
      },
      documentOperations: {
        issues: documentIssues,
        accessRequests
      },
      api: {
        calls: apiCalls
      }
    });
  } catch (error) {
    console.error('Get compliance stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get auditor dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalLogs,
      suspiciousLogs7d,
      suspiciousLogs30d,
      failedLogins7d,
      unauthorizedAccess7d
    ] = await Promise.all([
      SystemLog.countDocuments(),
      SystemLog.countDocuments({ isSuspicious: true, createdAt: { $gte: last7Days } }),
      SystemLog.countDocuments({ isSuspicious: true, createdAt: { $gte: last30Days } }),
      SystemLog.countDocuments({ action: 'failed-login', createdAt: { $gte: last7Days } }),
      SystemLog.countDocuments({ action: 'unauthorized-access', createdAt: { $gte: last7Days } })
    ]);

    res.json({
      logs: {
        total: totalLogs,
        suspicious7d: suspiciousLogs7d,
        suspicious30d: suspiciousLogs30d
      },
      security: {
        failedLogins7d,
        unauthorizedAccess7d
      }
    });
  } catch (error) {
    console.error('Get auditor stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

