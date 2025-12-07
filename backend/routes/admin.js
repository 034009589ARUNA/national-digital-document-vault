const express = require('express');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const User = require('../models/User');
const Institution = require('../models/Institution');
const Document = require('../models/Document');
const SystemLog = require('../models/SystemLog');
const { logActivity, getRequestInfo } = require('../utils/logger');
const { generateAPIKey, hashAPIKey } = require('../utils/apiKey');
const router = express.Router();

// All admin routes require authentication and admin role
router.use(auth);
router.use(requireAdmin);

// ==================== INSTITUTION MANAGEMENT ====================

// Create institution
router.post('/institutions', async (req, res) => {
  try {
    const { name, type, description, address, contactEmail, contactPhone, website, registrationNumber } = req.body;

    if (!name || !type || !contactEmail) {
      return res.status(400).json({ message: 'Name, type, and contact email are required' });
    }

    const institution = new Institution({
      name,
      type,
      description: description || '',
      address: address || '',
      contactEmail,
      contactPhone: contactPhone || '',
      website: website || '',
      registrationNumber: registrationNumber || '',
      createdBy: req.user._id,
      status: 'pending'
    });

    await institution.save();

    // Log activity
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      action: 'institution-create',
      resourceType: 'institution',
      resourceId: institution._id,
      resourceName: institution.name,
      details: { type: institution.type },
      ...requestInfo
    });

    res.status(201).json({
      message: 'Institution created successfully',
      institution
    });
  } catch (error) {
    console.error('Create institution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all institutions
router.get('/institutions', async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;

    const institutions = await Institution.find(filter)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Institution.countDocuments(filter);

    res.json({
      institutions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get institutions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve institution
router.put('/institutions/:id/approve', async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    institution.status = 'approved';
    institution.approvedBy = req.user._id;
    institution.approvedAt = new Date();
    await institution.save();

    // Log activity
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      institutionId: institution._id,
      action: 'institution-approve',
      resourceType: 'institution',
      resourceId: institution._id,
      resourceName: institution.name,
      ...requestInfo
    });

    res.json({
      message: 'Institution approved successfully',
      institution
    });
  } catch (error) {
    console.error('Approve institution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Suspend institution
router.put('/institutions/:id/suspend', async (req, res) => {
  try {
    const { reason } = req.body;
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    institution.status = 'suspended';
    institution.suspendedBy = req.user._id;
    institution.suspendedAt = new Date();
    institution.suspensionReason = reason || '';

    // Suspend all users associated with this institution
    await User.updateMany(
      { institutionId: institution._id },
      { isActive: false, suspendedAt: new Date(), suspendedBy: req.user._id }
    );

    await institution.save();

    // Log activity
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      institutionId: institution._id,
      action: 'institution-suspend',
      resourceType: 'institution',
      resourceId: institution._id,
      resourceName: institution.name,
      details: { reason },
      severity: 'warning',
      ...requestInfo
    });

    res.json({
      message: 'Institution suspended successfully',
      institution
    });
  } catch (error) {
    console.error('Suspend institution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete institution
router.delete('/institutions/:id', async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    // Log before deletion
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      institutionId: institution._id,
      action: 'institution-delete',
      resourceType: 'institution',
      resourceId: institution._id,
      resourceName: institution.name,
      severity: 'warning',
      ...requestInfo
    });

    await Institution.findByIdAndDelete(req.params.id);

    res.json({ message: 'Institution deleted successfully' });
  } catch (error) {
    console.error('Delete institution error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== API KEY MANAGEMENT ====================

// Generate API key for institution
router.post('/institutions/:id/api-key', async (req, res) => {
  try {
    const { expiresInDays } = req.body;
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    if (institution.status !== 'approved') {
      return res.status(400).json({ message: 'Institution must be approved to generate API key' });
    }

    const apiKey = generateAPIKey();
    const hashedKey = hashAPIKey(apiKey);

    institution.apiKey = hashedKey;
    if (expiresInDays) {
      institution.apiKeyExpiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
    }
    await institution.save();

    // Log activity
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      institutionId: institution._id,
      action: 'api-key-generate',
      resourceType: 'api',
      resourceId: institution._id,
      resourceName: institution.name,
      details: { expiresInDays },
      ...requestInfo
    });

    // Return the plain API key only once
    res.json({
      message: 'API key generated successfully',
      apiKey, // Only returned once
      institution: {
        _id: institution._id,
        name: institution.name,
        apiKeyExpiresAt: institution.apiKeyExpiresAt
      }
    });
  } catch (error) {
    console.error('Generate API key error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Revoke API key
router.delete('/institutions/:id/api-key', async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    institution.apiKey = null;
    institution.apiKeyExpiresAt = null;
    await institution.save();

    // Log activity
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      institutionId: institution._id,
      action: 'api-key-revoke',
      resourceType: 'api',
      resourceId: institution._id,
      resourceName: institution.name,
      severity: 'warning',
      ...requestInfo
    });

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== USER MANAGEMENT ====================

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { nin: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('institutionId', 'name type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Suspend user
router.put('/users/:id/suspend', async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = false;
    user.suspendedAt = new Date();
    user.suspendedBy = req.user._id;
    await user.save();

    // Log activity
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      action: 'user-suspend',
      resourceType: 'user',
      resourceId: user._id,
      resourceName: user.name,
      details: { reason, suspendedUserId: user._id },
      severity: 'warning',
      ...requestInfo
    });

    res.json({ message: 'User suspended successfully', user });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Restore user
router.put('/users/:id/restore', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isActive = true;
    user.suspendedAt = null;
    user.suspendedBy = null;
    await user.save();

    // Log activity
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      action: 'user-restore',
      resourceType: 'user',
      resourceId: user._id,
      resourceName: user.name,
      ...requestInfo
    });

    res.json({ message: 'User restored successfully', user });
  } catch (error) {
    console.error('Restore user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user (soft delete - mark as inactive)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log before deletion
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      action: 'user-delete',
      resourceType: 'user',
      resourceId: user._id,
      resourceName: user.name,
      severity: 'warning',
      ...requestInfo
    });

    // Soft delete - mark as inactive
    user.isActive = false;
    user.suspendedAt = new Date();
    user.suspendedBy = req.user._id;
    await user.save();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== DOCUMENT MANAGEMENT ====================

// Get all documents
router.get('/documents', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, isIssued } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { isDeleted: false };
    if (type) filter.type = type;
    if (isIssued !== undefined) filter.isIssued = isIssued === 'true';

    const documents = await Document.find(filter)
      .populate('userId', 'name email nin')
      .populate('issuedBy', 'name email')
      .populate('issuerInstitutionId', 'name type')
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Document.countDocuments(filter);

    res.json({
      documents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ==================== SYSTEM LOGS ====================

// Get system logs
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

// ==================== DASHBOARD STATS ====================

// Get admin dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalInstitutions,
      pendingInstitutions,
      totalDocuments,
      issuedDocuments,
      totalLogs,
      suspiciousLogs
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Institution.countDocuments(),
      Institution.countDocuments({ status: 'pending' }),
      Document.countDocuments({ isDeleted: false }),
      Document.countDocuments({ isIssued: true, isDeleted: false }),
      SystemLog.countDocuments(),
      SystemLog.countDocuments({ isSuspicious: true, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } })
    ]);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: totalUsers - activeUsers
      },
      institutions: {
        total: totalInstitutions,
        pending: pendingInstitutions,
        approved: await Institution.countDocuments({ status: 'approved' }),
        suspended: await Institution.countDocuments({ status: 'suspended' })
      },
      documents: {
        total: totalDocuments,
        issued: issuedDocuments,
        uploaded: totalDocuments - issuedDocuments
      },
      security: {
        totalLogs: totalLogs,
        suspiciousLogs: suspiciousLogs
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

