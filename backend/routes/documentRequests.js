const express = require('express');
const auth = require('../middleware/auth');
const DocumentRequest = require('../models/DocumentRequest');
const Document = require('../models/Document');
const { logActivity, getRequestInfo } = require('../utils/logger');
const router = express.Router();

// All routes require authentication
router.use(auth);

// Get document requests for current user (as document owner)
router.get('/my-requests', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      documentOwnerId: req.user._id
    };
    if (status) filter.status = status;

    const requests = await DocumentRequest.find(filter)
      .populate('requesterId', 'name email')
      .populate('requesterInstitutionId', 'name type')
      .populate('documentId', 'name type verificationStatus')
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
    console.error('Get my requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve document request
router.put('/:id/approve', async (req, res) => {
  try {
    const { accessExpiresInDays } = req.body;
    const request = await DocumentRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.documentOwnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    request.status = 'approved';
    request.approvedAt = new Date();
    if (accessExpiresInDays) {
      request.accessExpiresAt = new Date(Date.now() + accessExpiresInDays * 24 * 60 * 60 * 1000);
    }
    request.accessGrantedAt = new Date();
    await request.save();

    // Log activity
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      action: 'access-granted',
      resourceType: 'document',
      resourceId: request.documentId,
      details: {
        requestId: request._id,
        requesterId: request.requesterId,
        institutionId: request.requesterInstitutionId
      },
      ...requestInfo
    });

    res.json({
      message: 'Document access request approved',
      request
    });
  } catch (error) {
    console.error('Approve request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject document request
router.put('/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const request = await DocumentRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.documentOwnerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request is not pending' });
    }

    request.status = 'rejected';
    request.rejectedAt = new Date();
    request.rejectionReason = reason || '';
    await request.save();

    // Log activity
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      action: 'access-denied',
      resourceType: 'document',
      resourceId: request.documentId,
      details: {
        requestId: request._id,
        requesterId: request.requesterId,
        reason: reason || ''
      },
      ...requestInfo
    });

    res.json({
      message: 'Document access request rejected',
      request
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

