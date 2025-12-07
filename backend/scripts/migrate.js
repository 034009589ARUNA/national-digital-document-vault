/**
 * Database Migration Script for MongoDB Atlas
 * 
 * This script migrates existing data to support the new admin system:
 * - Adds 'role' field to existing users (defaults to 'user')
 * - Sets 'isActive' to true for all existing users
 * 
 * Usage: node scripts/migrate.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Institution = require('../models/Institution');
const SystemLog = require('../models/SystemLog');
const DocumentRequest = require('../models/DocumentRequest');

const MONGODB_URI = process.env.MONGODB_URI;

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');
    console.log('📡 Connecting to MongoDB Atlas...');
    
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB successfully!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);

    // Migration 1: Add role field to existing users
    console.log('\n📝 Migration 1: Adding role field to existing users...');
    const userResult = await User.updateMany(
      { role: { $exists: false } },
      { 
        $set: { 
          role: 'user',
          isActive: true
        } 
      }
    );
    console.log(`   ✅ Updated ${userResult.modifiedCount} users with role field`);

    // Migration 2: Ensure all users have isActive set
    console.log('\n📝 Migration 2: Ensuring isActive field for all users...');
    const activeResult = await User.updateMany(
      { isActive: { $exists: false } },
      { $set: { isActive: true } }
    );
    console.log(`   ✅ Updated ${activeResult.modifiedCount} users with isActive field`);

    // Migration 3: Verify collections exist
    console.log('\n📝 Migration 3: Verifying collections...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const requiredCollections = ['users', 'institutions', 'systemlogs', 'documentrequests', 'documents'];
    const missingCollections = requiredCollections.filter(name => !collectionNames.includes(name));
    
    if (missingCollections.length > 0) {
      console.log(`   ⚠️  Missing collections (will be created on first use): ${missingCollections.join(', ')}`);
    } else {
      console.log('   ✅ All required collections exist');
    }

    // Migration 4: Create indexes (if needed)
    console.log('\n📝 Migration 4: Creating indexes...');
    try {
      await User.collection.createIndex({ email: 1 }, { unique: true, background: true });
      await User.collection.createIndex({ nin: 1 }, { unique: true, background: true });
      await User.collection.createIndex({ role: 1 }, { background: true });
      await User.collection.createIndex({ institutionId: 1 }, { background: true });
      console.log('   ✅ User indexes created');
    } catch (error) {
      if (error.code !== 85) { // Index already exists
        console.log('   ⚠️  Index creation:', error.message);
      }
    }

    // Summary
    const userCount = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const issuerCount = await User.countDocuments({ role: 'issuer' });
    const requesterCount = await User.countDocuments({ role: 'requester' });
    const auditorCount = await User.countDocuments({ role: 'auditor' });
    const activeUserCount = await User.countDocuments({ isActive: true });

    console.log('\n📊 Migration Summary:');
    console.log(`   Total Users: ${userCount}`);
    console.log(`   Active Users: ${activeUserCount}`);
    console.log(`   Admins: ${adminCount}`);
    console.log(`   Issuers: ${issuerCount}`);
    console.log(`   Requesters: ${requesterCount}`);
    console.log(`   Auditors: ${auditorCount}`);

    if (adminCount === 0) {
      console.log('\n⚠️  WARNING: No admin users found!');
      console.log('   To create an admin user:');
      console.log('   1. Register a user normally');
      console.log('   2. Update in MongoDB Atlas:');
      console.log('      db.users.updateOne({ email: "your-email@example.com" }, { $set: { role: "admin" } })');
      console.log('   3. Or use MongoDB Compass to update the user document');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('🚀 You can now start your server with: npm start');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    console.error('Stack:', error.stack);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check your MONGODB_URI in .env file');
      console.error('   2. Verify network access in MongoDB Atlas');
      console.error('   3. Ensure your IP is whitelisted');
      console.error('   4. Check database user credentials');
    }
    
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run migration
migrate();

