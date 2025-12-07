const express = require('express');
const crypto = require('crypto');
const Document = require('../models/Document');
const DocumentShare = require('../models/DocumentShare');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const auth = require('../middleware/auth');
const router = express.Router();

// Share document
router.post('/share', auth, async (req, res) => {
  try {
    const { documentId, sharedWith, shareType, permissions, expiryDays } = req.body;

    if (!documentId || !shareType) {
      return res.status(400).json({ message: 'Document ID and share type are required' });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const shareData = {
      documentId,
      ownerId: req.user._id,
      shareType,
      permissions: permissions || 'view'
    };

    if (shareType === 'link') {
      shareData.shareToken = crypto.randomBytes(32).toString('hex');
      if (expiryDays) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(expiryDays));
        shareData.expiresAt = expiryDate;
      }
    } else if (shareType === 'email') {
      if (!sharedWith) {
        return res.status(400).json({ message: 'Email address is required for email sharing' });
      }
      // For email sharing, we need to find the user by email
      const User = require('../models/User');
      const targetUser = await User.findOne({ email: sharedWith });
      if (!targetUser) {
        return res.status(404).json({ message: 'User with this email not found' });
      }
      shareData.sharedWith = targetUser._id;
      if (expiryDays) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(expiryDays));
        shareData.expiresAt = expiryDate;
      }
    }

    const share = new DocumentShare(shareData);
    await share.save();

    // Create notification if shared with specific user
    if (shareType === 'email' && sharedWith) {
      await Notification.create({
        userId: sharedWith,
        type: 'document-shared',
        title: 'Document Shared',
        message: `${req.user.name} shared "${document.name}" with you`,
        relatedDocumentId: documentId,
        relatedUserId: req.user._id
      });
    }

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'share',
      resourceType: 'share',
      resourceId: share._id,
      resourceName: `Shared ${document.name}`
    });

    // Generate share link if link type
    let shareLink = null;
    if (shareType === 'link' && share.shareToken) {
      shareLink = `${req.protocol}://${req.get('host')}/shared/${share.shareToken}`;
    }

    res.status(201).json({
      message: 'Document shared successfully',
      share,
      shareLink
    });
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get shared documents
router.get('/shared/with-me', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const shares = await DocumentShare.find({ sharedWith: req.user._id })
      .populate('documentId')
      .populate('ownerId', 'name email profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await DocumentShare.countDocuments({ sharedWith: req.user._id });

    res.json({
      shares,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get shared documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get document shares (by owner)
router.get('/:documentId/shares', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const shares = await DocumentShare.find({ documentId: req.params.documentId })
      .populate('sharedWith', 'name email profileImage')
      .populate('ownerId', 'name email');

    res.json(shares);
  } catch (error) {
    console.error('Get shares error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Revoke document share
router.put('/:shareId/revoke', auth, async (req, res) => {
  try {
    const share = await DocumentShare.findById(req.params.shareId);

    if (!share) {
      return res.status(404).json({ message: 'Share not found' });
    }

    if (share.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    share.revokedAt = Date.now();
    await share.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'unshare',
      resourceType: 'share',
      resourceId: share._id,
      resourceName: 'Share revoked'
    });

    res.json({ message: 'Share revoked successfully' });
  } catch (error) {
    console.error('Revoke share error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Access shared document via token
router.get('/token/:token', async (req, res) => {
  try {
    const share = await DocumentShare.findOne({ shareToken: req.params.token })
      .populate('documentId')
      .populate('ownerId', 'name email');

    if (!share) {
      return res.status(404).json({ message: 'Share not found' });
    }

    // Check if link is expired
    if (share.expiresAt && share.expiresAt < Date.now()) {
      share.isExpired = true;
      await share.save();
      return res.status(403).json({ message: 'Share link has expired' });
    }

    if (share.revokedAt) {
      return res.status(403).json({ message: 'Share has been revoked' });
    }

    // Update access count
    share.accessCount += 1;
    share.lastAccessedAt = Date.now();
    await share.save();

    res.json({
      document: share.documentId,
      owner: share.ownerId,
      permissions: share.permissions,
      expiresAt: share.expiresAt
    });
  } catch (error) {
    console.error('Access shared document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
