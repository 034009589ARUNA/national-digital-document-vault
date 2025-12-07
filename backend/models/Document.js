const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    required: true,
    enum: ['birth-certificate', 'passport', 'driver-license', 'property-deed', 'degree', 'contract', 'invoice', 'other']
  },
  category: {
    type: String,
    default: 'uncategorized'
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  ipfsHash: {
    type: String,
    required: true
  },
  ipfsPinStatus: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  blockchainHash: {
    type: String,
    default: ''
  },
  blockchainTxHash: {
    type: String,
    default: ''
  },
  encryptedKeyRef: {
    type: String,
    default: null
  },
  verificationStatus: {
    type: String,
    enum: ['verified', 'pending', 'unverified'],
    default: 'unverified'
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isIssued: {
    type: Boolean,
    default: false
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  issuerInstitutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    default: null
  },
  issuedAt: {
    type: Date,
    default: null
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentRequest',
    default: null
  },
  expiryDate: {
    type: Date,
    default: null
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  tags: [{
    type: String
  }],
  accessCount: {
    type: Number,
    default: 0
  },
  lastAccessedAt: {
    type: Date,
    default: null
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  updatedDate: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
documentSchema.index({ userId: 1, isDeleted: 1 });
documentSchema.index({ userId: 1, folderId: 1 });
documentSchema.index({ userId: 1, uploadDate: -1 });

module.exports = mongoose.model('Document', documentSchema);

