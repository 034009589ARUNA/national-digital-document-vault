const mongoose = require('mongoose');

const documentRequestSchema = new mongoose.Schema({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requesterInstitutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    required: true
  },
  documentOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  purpose: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  accessGrantedAt: {
    type: Date,
    default: null
  },
  accessExpiresAt: {
    type: Date,
    default: null
  },
  verificationResult: {
    verified: {
      type: Boolean,
      default: false
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    verificationNotes: {
      type: String,
      default: ''
    }
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
documentRequestSchema.index({ requesterId: 1, status: 1 });
documentRequestSchema.index({ documentOwnerId: 1, status: 1 });
documentRequestSchema.index({ documentId: 1 });
documentRequestSchema.index({ requesterInstitutionId: 1 });
documentRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DocumentRequest', documentRequestSchema);

