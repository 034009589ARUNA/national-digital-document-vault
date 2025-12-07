const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const { requireIssuer } = require('../middleware/rbac');
const User = require('../models/User');
const Institution = require('../models/Institution');
const Document = require('../models/Document');
const { logActivity, getRequestInfo } = require('../utils/logger');
const { verifyOnBlockchain, generateBlockchainHash } = require('../blockchain/verification');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

// All issuer routes require authentication and issuer role
router.use(auth);
router.use(requireIssuer);

// Get issuer institution profile
router.get('/profile', async (req, res) => {
  try {
    const institution = await Institution.findById(req.user.institutionId)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

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
    console.error('Get issuer profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update institution profile
router.put('/profile', async (req, res) => {
  try {
    const { name, description, address, contactPhone, website } = req.body;
    const institution = await Institution.findById(req.user.institutionId);

    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    if (name) institution.name = name;
    if (description !== undefined) institution.description = description;
    if (address !== undefined) institution.address = address;
    if (contactPhone !== undefined) institution.contactPhone = contactPhone;
    if (website !== undefined) institution.website = website;
    institution.updatedAt = new Date();

    await institution.save();

    // Log activity
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      institutionId: institution._id,
      action: 'profile-update',
      resourceType: 'institution',
      resourceId: institution._id,
      resourceName: institution.name,
      ...requestInfo
    });

    res.json({
      message: 'Profile updated successfully',
      institution
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Issue document to user
router.post('/documents/issue', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { userId, type, description, expiryDate } = req.body;

    if (!userId || !type) {
      return res.status(400).json({ message: 'User ID and document type are required' });
    }

    // Verify user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get institution
    const institution = await Institution.findById(req.user.institutionId);
    if (!institution || institution.status !== 'approved') {
      return res.status(403).json({ message: 'Institution not approved' });
    }

    // Read file and generate hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const blockchainHash = generateBlockchainHash(fileHash, userId);

    // Create document
    const document = new Document({
      userId: targetUser._id,
      name: req.file.originalname,
      type: type,
      description: description || '',
      fileName: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      ipfsHash: fileHash,
      blockchainHash: blockchainHash,
      verificationStatus: 'verified', // Issued documents are automatically verified
      verifiedAt: new Date(),
      verifiedBy: req.user._id,
      isIssued: true,
      issuedBy: req.user._id,
      issuerInstitutionId: institution._id,
      issuedAt: new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null
    });

    await document.save();

    // Log activity
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: req.user._id,
      institutionId: institution._id,
      action: 'document-issue',
      resourceType: 'document',
      resourceId: document._id,
      resourceName: document.name,
      details: {
        issuedTo: targetUser._id,
        documentType: type
      },
      ...requestInfo
    });

    // Verify on blockchain (async)
    verifyOnBlockchain(document._id.toString(), blockchainHash).catch(console.error);

    res.status(201).json({
      message: 'Document issued successfully',
      document: {
        _id: document._id,
        name: document.name,
        type: document.type,
        issuedAt: document.issuedAt,
        blockchainHash: document.blockchainHash,
        verificationStatus: document.verificationStatus
      }
    });
  } catch (error) {
    console.error('Issue document error:', error);
    res.status(500).json({ message: 'Server error during document issuance' });
  }
});

// Get all documents issued by this institution
router.get('/documents', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, userId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      issuerInstitutionId: req.user.institutionId,
      isDeleted: false
    };

    if (type) filter.type = type;
    if (userId) filter.userId = userId;

    const documents = await Document.find(filter)
      .populate('userId', 'name email nin')
      .sort({ issuedAt: -1 })
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
    console.error('Get issued documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get issuer dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const institution = await Institution.findById(req.user.institutionId);
    if (!institution) {
      return res.status(404).json({ message: 'Institution not found' });
    }

    const [
      totalIssued,
      issuedToday,
      issuedThisMonth
    ] = await Promise.all([
      Document.countDocuments({ issuerInstitutionId: institution._id, isDeleted: false }),
      Document.countDocuments({
        issuerInstitutionId: institution._id,
        issuedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        isDeleted: false
      }),
      Document.countDocuments({
        issuerInstitutionId: institution._id,
        issuedAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        isDeleted: false
      })
    ]);

    res.json({
      institution: {
        name: institution.name,
        status: institution.status
      },
      documents: {
        totalIssued,
        issuedToday,
        issuedThisMonth
      }
    });
  } catch (error) {
    console.error('Get issuer stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get issuer logs
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      institutionId: req.user.institutionId
    };
    if (action) filter.action = action;

    const SystemLog = require('../models/SystemLog');
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
    console.error('Get issuer logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

