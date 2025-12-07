/**
 * Update Existing User to Admin Script
 * 
 * This script updates an existing user to admin role
 * 
 * Usage: node scripts/updateUserToAdmin.js <email>
 * Or run without arguments for interactive mode
 */

require('dotenv').config();
const mongoose = require('mongoose');
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

async function updateToAdmin() {
  try {
    const email = process.argv[2]; // Get email from command line argument

    console.log('🔐 Update User to Admin\n');
    console.log('📡 Connecting to MongoDB Atlas...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB Atlas successfully!\n');

    let userEmail = email;

    // If no email provided, ask for it
    if (!userEmail) {
      userEmail = await question('Enter user email to update to admin: ');
    }

    if (!userEmail.trim()) {
      console.error('❌ Email is required!');
      process.exit(1);
    }

    // Find user
    const user = await User.findOne({ email: userEmail.toLowerCase().trim() });

    if (!user) {
      console.error(`❌ User with email "${userEmail}" not found!`);
      console.log('\n💡 Available users:');
      const allUsers = await User.find().select('name email role').limit(10);
      allUsers.forEach(u => {
        console.log(`   - ${u.email} (${u.name}) - Role: ${u.role || 'user'}`);
      });
      await mongoose.connection.close();
      rl.close();
      process.exit(1);
    }

    // Show current user info
    console.log('\n📋 Current User Info:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Role: ${user.role || 'user'}`);
    console.log(`   Status: ${user.isActive ? 'Active' : 'Inactive'}`);

    // Confirm update
    if (!email) {
      const confirm = await question('\n⚠️  Update this user to admin? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
        console.log('❌ Operation cancelled.');
        await mongoose.connection.close();
        rl.close();
        process.exit(0);
      }
    }

    // Update user
    user.role = 'admin';
    user.isActive = true;
    await user.save();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ User updated to admin successfully!\n');
    console.log('📋 Updated User Info:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Status: ${user.isActive ? 'Active' : 'Inactive'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🚀 User can now login as admin at: http://localhost:3000/login\n');

    await mongoose.connection.close();
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error updating user:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check your MONGODB_URI in .env file');
      console.error('   2. Verify network access in MongoDB Atlas');
      console.error('   3. Ensure your IP is whitelisted');
    }
    
    await mongoose.connection.close();
    rl.close();
    process.exit(1);
  }
}

// Run the script
updateToAdmin();

