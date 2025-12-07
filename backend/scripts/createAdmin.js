/**
 * Create Admin User Script
 * 
 * This script creates an admin user in MongoDB Atlas
 * 
 * Usage: node scripts/createAdmin.js
 * 
 * The script will prompt you for:
 * - Name
 * - Email
 * - Password
 * - NIN (National Identification Number)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');
const User = require('../models/User');

const MONGODB_URI = process.env.MONGODB_URI;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('🔐 Creating Admin User for Sierra Vault\n');
    console.log('📡 Connecting to MongoDB Atlas...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB Atlas successfully!\n');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Get user input
    const name = await question('Enter admin name: ');
    if (!name.trim()) {
      console.error('❌ Name is required!');
      process.exit(1);
    }

    const email = await question('Enter admin email: ');
    if (!email.trim()) {
      console.error('❌ Email is required!');
      process.exit(1);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format!');
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('\n⚠️  User with this email already exists!');
      const update = await question('Do you want to update this user to admin? (yes/no): ');
      if (update.toLowerCase() === 'yes' || update.toLowerCase() === 'y') {
        existingUser.role = 'admin';
        existingUser.isActive = true;
        await existingUser.save();
        console.log('\n✅ User updated to admin successfully!');
        console.log(`   Name: ${existingUser.name}`);
        console.log(`   Email: ${existingUser.email}`);
        console.log(`   Role: ${existingUser.role}`);
        await mongoose.connection.close();
        rl.close();
        process.exit(0);
      } else {
        console.log('❌ Operation cancelled.');
        await mongoose.connection.close();
        rl.close();
        process.exit(0);
      }
    }

    const nin = await question('Enter NIN (National ID Number): ');
    if (!nin.trim()) {
      console.error('❌ NIN is required!');
      process.exit(1);
    }

    // Check if NIN already exists
    const existingNIN = await User.findOne({ nin: nin.trim() });
    if (existingNIN) {
      console.error('❌ User with this NIN already exists!');
      process.exit(1);
    }

    // Get password (hidden input simulation)
    const password = await question('Enter password (min 6 characters): ');
    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters!');
      process.exit(1);
    }

    const confirmPassword = await question('Confirm password: ');
    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match!');
      process.exit(1);
    }

    console.log('\n⏳ Creating admin user...\n');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const adminUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      nin: nin.trim(),
      role: 'admin',
      isActive: true,
      isVerified: true,
      verificationDate: new Date()
    });

    await adminUser.save();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Admin user created successfully!\n');
    console.log('📋 User Details:');
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   NIN: ${adminUser.nin}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Status: ${adminUser.isActive ? 'Active' : 'Inactive'}`);
    console.log(`   User ID: ${adminUser._id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🚀 You can now login at: http://localhost:3000/login');
    console.log('   Email:', adminUser.email);
    console.log('   Password: [the password you entered]\n');

    await mongoose.connection.close();
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    
    if (error.code === 11000) {
      console.error('   This email or NIN is already registered!');
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check your MONGODB_URI in .env file');
      console.error('   2. Verify network access in MongoDB Atlas');
      console.error('   3. Ensure your IP is whitelisted');
      console.error('   4. Check database user credentials');
    }
    
    await mongoose.connection.close();
    rl.close();
    process.exit(1);
  }
}

// Run the script
createAdmin();

