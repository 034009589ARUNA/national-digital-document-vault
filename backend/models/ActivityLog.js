const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['upload', 'download', 'share', 'delete', 'restore', 'verify', 'view', 'unshare', 'folder-create', 'folder-delete'],
    required: true
  },
  resourceType: {
    type: String,
    enum: ['document', 'folder', 'share'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  resourceName: {
    type: String,
    required: true
  },
  details: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ userId: 1, action: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
