const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 📥 ${req.method} ${req.path} - IP: ${req.ip}`);
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const bodyStr = JSON.stringify(req.body || {}, null, 2);
      const bodyPreview = bodyStr.length > 200 ? bodyStr.substring(0, 200) + '...' : bodyStr;
      if (bodyPreview && bodyPreview !== '{}') {
        console.log(`  📦 Body:`, bodyPreview);
      }
    } catch (err) {
      // Skip body logging if JSON.stringify fails
    }
  }
  if (req.headers.authorization && typeof req.headers.authorization === 'string' && req.headers.authorization.length > 7) {
    console.log(`  🔑 Auth: Bearer ${req.headers.authorization.substring(7, 27)}...`);
  }

  // Log response
  const originalSend = res.send;
  res.send = function(data) {
    const timestamp = new Date().toISOString();
    const statusColor = res.statusCode >= 400 ? '❌' : res.statusCode >= 300 ? '⚠️' : '✅';
    console.log(`[${timestamp}] ${statusColor} ${req.method} ${req.path} - Status: ${res.statusCode}`);
    return originalSend.call(this, data);
  };

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/user', require('./routes/user'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/sharing', require('./routes/sharing'));
app.use('/api/folders', require('./routes/folders'));

// Role-based routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/issuer', require('./routes/issuer'));
app.use('/api/requester', require('./routes/requester'));
app.use('/api/auditor', require('./routes/auditor'));
app.use('/api/document-requests', require('./routes/documentRequests'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Sierra Vault API is running' });
});

// Connect to MongoDB (Atlas or local)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sierra-vault';

// MongoDB connection options (optimized for Atlas)
const mongooseOptions = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  // Atlas-specific options
  retryWrites: true, // Enable retryable writes
  w: 'majority', // Write concern
};

mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Initialize Phase 1 features if enabled
    if (process.env.BACKUP_ENABLED === 'true') {
      try {
        const { getScheduler } = require('./utils/scheduler');
        getScheduler().start();
        console.log('✅ Backup scheduler started');
      } catch (error) {
        console.warn('⚠️  Backup scheduler failed to start:', error.message);
      }
    }
    
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('📋 Phase 1 Features:');
      console.log('   - KMS Integration: ' + (process.env.KMS_PROVIDER || 'not configured'));
      console.log('   - IPFS Integration: ' + (process.env.IPFS_PROVIDER || 'not configured'));
      console.log('   - Blockchain: ' + (process.env.BLOCKCHAIN_NETWORK || 'not configured'));
      console.log('   - Backup Scheduler: ' + (process.env.BACKUP_ENABLED === 'true' ? 'enabled' : 'disabled'));
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
    console.error('Please check your MongoDB connection string in backend/.env');
    console.error('Make sure MongoDB is running or your Atlas connection string is correct');
    // Don't exit immediately - allow server to start and show error
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (MongoDB not connected)`);
    });
  });

module.exports = app;

