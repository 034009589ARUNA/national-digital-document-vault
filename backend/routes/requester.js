const express = require('express');
const auth = require('../middleware/auth');
const { requireRequester } = require('../middleware/rbac');
const User = require('../models/User');
const Institution = require('../models/Institution');
const Document = require('../models/Document');
const DocumentRequest = require('../models/DocumentRequest');
const SystemLog = require('../models/SystemLog');
const { logActivity, getRequestInfo } = require('../utils/logger');
const router = express.Router();

// All requester routes require authentication and requester role
router.use(auth);
router.use(requireRequester);

// Get requester institution profile
router.get('/profile', async (req, res) => {
  try {
    const institution = await Institution.findById(req.user.institutionId);

    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    if (institution.status !== 'approved') {
      return res.status(403).json({ 
        message: 'Institution is not approved',
        status: institution.status 
      });
    }

    res.json(institution);
  } catch (error) {
    console.error('Get requester profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request document access from user
router.post('/documents/request', async (req, res) => {
  try {
    const { documentId, purpose, expiresInDays } = req.body;

    if (!documentId || !purpose) {
      return res.status(400).json({ message: 'Document ID and purpose are required' });
    }

    // Verify document exists
    const document = await Document.findById(documentId);
    if (!document || document.isDeleted) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Get institution
    const institution = await Institution.findById(req.user.institutionId);
    if (!institution || institution.status !== 'approved') {
      return res.status(403).json({ message: 'Institution not approved' });
    }

    // Check if request already exists
    const existingRequest = await DocumentRequest.findOne({
      requesterId: req.user._id,
      documentId: documentId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Request already pending for this document' });
    }

    // Create request
    const request = new DocumentRequest({
      requesterId: req.user._id,
      requesterInstitutionId: institution._id,
      documentOwnerId: document.userId,
      documentId: documentId,
      purpose: purpose,
      status: 'pending',
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null
    });

    await request.save();

    // Log activity
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      institutionId: institution._id,
      action: 'access-request',
      resourceType: 'document',
      resourceId: documentId,
      resourceName: document.name,
      details: {
        purpose,
        requestId: request._id
      },
      ...requestInfo
    });

    res.status(201).json({
      message: 'Document access request created successfully',
      request
    });
  } catch (error) {
    console.error('Request document access error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all requests made by this requester
router.get('/requests', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      requesterId: req.user._id
    };
    if (status) filter.status = status;

    const requests = await DocumentRequest.find(filter)
      .populate('documentId', 'name type verificationStatus')
      .populate('documentOwnerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DocumentRequest.countDocuments(filter);

    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify document authenticity (after access granted)
router.post('/documents/:id/verify', async (req, res) => {
  try {
    const { notes } = req.body;
    const document = await Document.findById(req.params.id);

    if (!document || document.isDeleted) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if requester has access to this document
    const request = await DocumentRequest.findOne({
      documentId: document._id,
      requesterId: req.user._id,
      status: 'approved'
    });

    if (!request) {
      return res.status(403).json({ message: 'Access not granted to this document' });
    }

    // Verify blockchain hash
    const isVerified = document.blockchainHash && document.verificationStatus === 'verified';

    // Update request with verification result
    request.verificationResult = {
      verified: isVerified,
      verifiedAt: new Date(),
      verificationNotes: notes || ''
    };
    await request.save();

    // Log activity
    const institution = await Institution.findById(req.user.institutionId);
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      institutionId: institution._id,
      action: 'verification-check',
      resourceType: 'document',
      resourceId: document._id,
      resourceName: document.name,
      details: {
        verified: isVerified,
        notes: notes || ''
      },
      ...requestInfo
    });

    res.json({
      message: 'Document verification completed',
      verification: {
        verified: isVerified,
        blockchainHash: document.blockchainHash,
        verificationStatus: document.verificationStatus,
        notes: notes || ''
      }
    });
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get requester dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const institution = await Institution.findById(req.user.institutionId);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      verifiedDocuments
    ] = await Promise.all([
      DocumentRequest.countDocuments({ requesterId: req.user._id }),
      DocumentRequest.countDocuments({ requesterId: req.user._id, status: 'pending' }),
      DocumentRequest.countDocuments({ requesterId: req.user._id, status: 'approved' }),
      DocumentRequest.countDocuments({ 
        requesterId: req.user._id, 
        status: 'approved',
        'verificationResult.verified': true
      })
    ]);

    res.json({
      institution: {
        name: institution.name,
        status: institution.status
      },
      requests: {
        total: totalRequests,
        pending: pendingRequests,
        approved: approvedRequests
      },
      verifications: {
        verified: verifiedDocuments
      }
    });
  } catch (error) {
    console.error('Get requester stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get requester logs
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      institutionId: req.user.institutionId
    };
    if (action) filter.action = action;

    const logs = await SystemLog.find(filter)
      .populate('userId', 'name email')
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
    console.error('Get requester logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

