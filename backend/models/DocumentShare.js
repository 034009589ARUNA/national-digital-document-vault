const mongoose = require('mongoose');

const documentShareSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  shareType: {
    type: String,
    enum: ['link', 'email', 'private'],
    default: 'private'
  },
  shareToken: {
    type: String
  },
  permissions: {
    type: String,
    enum: ['view', 'download', 'edit'],
    default: 'view'
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isExpired: {
    type: Boolean,
    default: false
  },
  accessCount: {
    type: Number,
    default: 0
  },
  lastAccessedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  revokedAt: {
    type: Date,
    default: null
  }
});

// Index for faster queries
documentShareSchema.index({ documentId: 1 });
documentShareSchema.index({ shareToken: 1 }, { unique: true, sparse: true });
documentShareSchema.index({ ownerId: 1, sharedWith: 1 });

module.exports = mongoose.model('DocumentShare', documentShareSchema);
