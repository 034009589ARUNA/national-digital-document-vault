const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  institutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    default: null
  },
  action: {
    type: String,
    required: true,
    enum: [
      // User actions
      'login', 'logout', 'register', 'password-change', 'profile-update',
      // Document actions
      'document-upload', 'document-download', 'document-delete', 'document-share', 'document-view',
      // Issuer actions
      'document-issue', 'document-verify', 'api-call',
      // Requester actions
      'access-request', 'access-granted', 'access-denied', 'verification-check',
      // Admin actions
      'institution-create', 'institution-approve', 'institution-suspend', 'institution-delete',
      'user-suspend', 'user-delete', 'user-restore', 'api-key-generate', 'api-key-revoke',
      'settings-update', 'system-backup',
      // Security events
      'failed-login', 'suspicious-activity', 'unauthorized-access', 'rate-limit-exceeded',
      // Auditor actions
      'audit-view', 'fraud-detected', 'compliance-check'
    ]
  },
  resourceType: {
    type: String,
    enum: ['user', 'document', 'institution', 'api', 'system', 'security'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  resourceName: {
    type: String,
    default: ''
  },
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  },
  isSuspicious: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
systemLogSchema.index({ userId: 1, createdAt: -1 });
systemLogSchema.index({ institutionId: 1, createdAt: -1 });
systemLogSchema.index({ action: 1, createdAt: -1 });
systemLogSchema.index({ resourceType: 1, resourceId: 1 });
systemLogSchema.index({ severity: 1, createdAt: -1 });
systemLogSchema.index({ isSuspicious: 1, createdAt: -1 });
systemLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);

