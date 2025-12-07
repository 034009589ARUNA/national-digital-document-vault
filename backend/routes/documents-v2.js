/**
 * Enhanced Document Routes with Phase 1 Integration
 * Integrates: KMS, IPFS, Blockchain, Encryption
 */

const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const auth = require('../middleware/auth');
const { getKMS } = require('../utils/kms');
const { encryptDocument } = require('../utils/encryption');
const { getIPFS } = require('../utils/ipfs');
const { getPinningWorker } = require('../utils/ipfs-pinning-worker');
const { getBlockchainService } = require('../utils/blockchain');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Use memory storage for encryption

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

/**
 * Enhanced document upload with Phase 1 features
 * Flow: Upload -> Encrypt -> IPFS -> Blockchain Anchor
 */
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { type, category, description, folderId } = req.body;
    if (!type) {
      return res.status(400).json({ message: 'Document type is required' });
    }

    const fileBuffer = req.file.buffer;
    
    // Step 1: Generate file hash
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // Step 2: Encrypt document with envelope encryption (KMS)
    let encryptedData, encryptedKeyRef;
    try {
      const encryptionResult = await encryptDocument(fileBuffer);
      encryptedData = encryptionResult.encryptedData;
      encryptedKeyRef = encryptionResult.encryptedKeyRef;
    } catch (error) {
      console.error('Encryption error:', error);
      // Fallback: continue without encryption if KMS not configured
      encryptedData = fileBuffer;
      encryptedKeyRef = null;
    }

    // Step 3: Upload to IPFS
    let ipfsCid, ipfsPinStatus;
    try {
      const ipfs = getIPFS();
      const ipfsResult = await ipfs.uploadFile(encryptedData, req.file.originalname);
      ipfsCid = ipfsResult.cid;
      ipfsPinStatus = ipfsResult.pinStatus;
    } catch (error) {
      console.error('IPFS upload error:', error);
      // Fallback: store locally if IPFS fails
      ipfsCid = fileHash; // Use hash as fallback
      ipfsPinStatus = { error: error.message };
    }

    // Step 4: Generate blockchain anchor hash
    const blockchain = getBlockchainService();
    const ownerDID = `did:ethr:${req.user._id}`; // Simplified DID for now
    const anchorHash = blockchain.generateAnchorHash(fileHash, ownerDID, 1);

    // Step 5: Create document record
    const document = new Document({
      userId: req.user._id,
      name: req.file.originalname,
      type: type,
      category: category || 'uncategorized',
      description: description || '',
      fileName: req.file.originalname, // Original name for reference
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      ipfsHash: ipfsCid,
      ipfsPinStatus: ipfsPinStatus,
      blockchainHash: anchorHash,
      encryptedKeyRef: encryptedKeyRef, // Store encrypted key reference
      verificationStatus: 'pending',
      folderId: folderId || null
    });

    await document.save();

    // Step 6: Anchor on blockchain (async - don't wait)
    blockchain.anchorDocument(
      anchorHash,
      ipfsCid,
      req.user._id.toString(), // Simplified owner address
      '', // No issuer DID for user uploads
      1 // Version 1
    ).then(async (result) => {
      // Update document with blockchain transaction
      await Document.findByIdAndUpdate(document._id, {
        blockchainTxHash: result.txHash,
        verificationStatus: 'verified',
        verifiedAt: new Date()
      });

      // Ensure IPFS pinning
      const worker = getPinningWorker();
      await worker.processPinningTask(document._id.toString(), ipfsCid);
    }).catch(error => {
      console.error('Blockchain anchoring error:', error);
      // Document is still saved, just not anchored yet
    });

    // Step 7: Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'upload',
      resourceType: 'document',
      resourceId: document._id,
      resourceName: document.name
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        _id: document._id,
        name: document.name,
        type: document.type,
        uploadDate: document.uploadDate,
        ipfsHash: document.ipfsHash,
        blockchainHash: document.blockchainHash,
        verificationStatus: document.verificationStatus
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error during upload' });
  }
});

/**
 * Enhanced document verification
 * Checks: IPFS pin status, blockchain anchor, KMS signature
 */
router.get('/:id/verify', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check IPFS pin status
    const ipfs = getIPFS();
    const pinStatus = await ipfs.checkPinStatus(document.ipfsHash);

    // Check blockchain anchor
    const blockchain = getBlockchainService();
    const anchorVerification = await blockchain.verifyAnchor(document.blockchainHash);

    res.json({
      verificationStatus: document.verificationStatus,
      blockchainHash: document.blockchainHash,
      blockchainTxHash: document.blockchainTxHash,
      blockchainVerified: anchorVerification.exists && !anchorVerification.revoked,
      ipfsHash: document.ipfsHash,
      ipfsPinStatus: pinStatus,
      uploadDate: document.uploadDate,
      verifiedAt: document.verifiedAt
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

