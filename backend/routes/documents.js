const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');
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

// Upload document
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { type, category, description, folderId } = req.body;
    if (!type) {
      return res.status(400).json({ message: 'Document type is required' });
    }

    // Read file and generate hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // Generate blockchain hash (simplified - in production, use actual blockchain)
    const blockchainHash = generateBlockchainHash(fileHash, req.user._id.toString());

    // Store file info (in production, upload to IPFS or cloud storage)
    const ipfsHash = fileHash; // Simplified - replace with actual IPFS hash

    // Create document record
    const document = new Document({
      userId: req.user._id,
      name: req.file.originalname,
      type: type,
      category: category || 'uncategorized',
      description: description || '',
      fileName: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      ipfsHash: ipfsHash,
      blockchainHash: blockchainHash,
      verificationStatus: 'pending',
      folderId: folderId || null
    });

    await document.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'upload',
      resourceType: 'document',
      resourceId: document._id,
      resourceName: document.name
    });

    // Verify on blockchain (async - don't wait)
    verifyOnBlockchain(document._id.toString(), blockchainHash).catch(console.error);

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        _id: document._id,
        name: document.name,
        type: document.type,
        uploadDate: document.uploadDate,
        blockchainHash: document.blockchainHash,
        verificationStatus: document.verificationStatus
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error during upload' });
  }
});

// Get all documents for user
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type || null;

    const query = { userId: req.user._id, isDeleted: false };
    if (type) {
      query.type = type;
    }

    const documents = await Document.find(query)
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(limit)
      .select('-fileName');

    const total = await Document.countDocuments(query);

    res.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard statistics
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const DocumentShare = require('../models/DocumentShare');
    
    const activeDocuments = await Document.find({ userId: req.user._id, isDeleted: false });
    const issuedDocuments = await Document.find({ userId: req.user._id, isIssued: true, isDeleted: false });
    const verifiedDocuments = await Document.find({ userId: req.user._id, verificationStatus: 'verified', isDeleted: false });
    const trashDocuments = await Document.countDocuments({ userId: req.user._id, isDeleted: true });
    const sharedWithMe = await DocumentShare.countDocuments({ 
      sharedWith: req.user._id,
      revokedAt: null,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: Date.now() } }
      ]
    });

    const totalSize = activeDocuments.reduce((sum, doc) => sum + doc.fileSize, 0);
    const recentlyAccessed = await Document.find({ userId: req.user._id, isDeleted: false })
      .sort({ lastAccessedAt: -1 })
      .limit(5);

    res.json({
      totalDocuments: activeDocuments.length,
      issuedDocuments: issuedDocuments.length,
      uploadedDocuments: activeDocuments.length - issuedDocuments.length,
      verifiedDocuments: verifiedDocuments.length,
      sharedWithMe: sharedWithMe,
      storageUsed: totalSize,
      trashCount: trashDocuments,
      recentlyAccessed
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Download document
router.get('/:id/download', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const filePath = path.join(__dirname, '../uploads', document.fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Update access stats
    document.accessCount += 1;
    document.lastAccessedAt = Date.now();
    await document.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'download',
      resourceType: 'document',
      resourceId: document._id,
      resourceName: document.name
    });

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${document.name}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Server error during download' });
  }
});

// Delete document (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    document.isDeleted = true;
    document.deletedAt = Date.now();
    await document.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'delete',
      resourceType: 'document',
      resourceId: document._id,
      resourceName: document.name
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server error during deletion' });
  }
});

// Restore document from trash
router.put('/:id/restore', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    document.isDeleted = false;
    document.deletedAt = null;
    await document.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'restore',
      resourceType: 'document',
      resourceId: document._id,
      resourceName: document.name
    });

    res.json({ message: 'Document restored successfully' });
  } catch (error) {
    console.error('Restore error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get trash documents
router.get('/trash/list', auth, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id, isDeleted: true })
      .sort({ deletedAt: -1 })
      .select('-fileName');

    res.json(documents);
  } catch (error) {
    console.error('Get trash error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Permanently delete document
router.delete('/:id/permanent', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete file from filesystem
    const filePath = path.join(__dirname, '../uploads', document.fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Document.findByIdAndDelete(req.params.id);

    res.json({ message: 'Document permanently deleted' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify document
router.get('/:id/verify', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
      verificationStatus: document.verificationStatus,
      blockchainHash: document.blockchainHash,
      blockchainTxHash: document.blockchainTxHash,
      uploadDate: document.uploadDate,
      verifiedAt: document.verifiedAt
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle favorite
router.put('/:id/favorite', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    document.isFavorite = !document.isFavorite;
    await document.save();

    res.json({ message: `Document ${document.isFavorite ? 'added to' : 'removed from'} favorites`, isFavorite: document.isFavorite });
  } catch (error) {
    console.error('Favorite toggle error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get issued documents (read-only verified)
router.get('/issued/list', auth, async (req, res) => {
  try {
    const documents = await Document.find({
      userId: req.user._id,
      isIssued: true,
      verificationStatus: 'verified',
      isDeleted: false
    }).sort({ issuedAt: -1 });

    res.json(documents);
  } catch (error) {
    console.error('Get issued documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

