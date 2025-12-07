const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const auth = require('../middleware/auth');
const router = express.Router();

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const uploadProfileImage = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('institutionId', 'name type status')
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    res.json({
      _id: user._id,
      id: user._id,
      name: user.name,
      email: user.email,
      nin: user.nin,
      role: user.role || 'user',
      institutionId: user.institutionId,
      isActive: user.isActive !== false,
      profileImage: user.profileImage,
      theme: user.theme,
      storageUsed: user.storageUsed,
      storageQuota: user.storageQuota,
      phone: user.phone,
      address: user.address,
      dateOfBirth: user.dateOfBirth,
      bio: user.bio,
      notificationsEnabled: user.notificationsEnabled,
      emailNotifications: user.emailNotifications,
      language: user.language
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, bio, phone, address, dateOfBirth, language, profileImage } = req.body;
    
    const updateData = {
      updatedAt: Date.now()
    };
    
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (language !== undefined) updateData.language = language;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'view',
      resourceType: 'document',
      resourceId: req.user._id,
      resourceName: 'Profile Updated'
    });

    // Return user data with proper format
    res.json({
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      nin: user.nin,
      phone: user.phone || '',
      address: user.address || '',
      dateOfBirth: user.dateOfBirth || null,
      bio: user.bio || '',
      profileImage: user.profileImage || null,
      theme: user.theme || 'auto',
      language: user.language || 'en',
      notificationsEnabled: user.notificationsEnabled !== false,
      emailNotifications: user.emailNotifications !== false,
      storageQuota: user.storageQuota || 10737418240,
      storageUsed: user.storageUsed || 0,
      isVerified: user.isVerified || false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload profile image
router.post('/profile-image', auth, uploadProfileImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    // Delete old profile image if exists
    if (req.user.profileImage) {
      const oldImagePath = path.join(__dirname, '../uploads/profiles', path.basename(req.user.profileImage));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    const profileImagePath = `/uploads/profiles/${req.file.filename}`;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: profileImagePath, updatedAt: Date.now() },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user data with proper format
    res.json({
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      nin: user.nin,
      phone: user.phone || '',
      address: user.address || '',
      dateOfBirth: user.dateOfBirth || null,
      bio: user.bio || '',
      profileImage: user.profileImage || null,
      theme: user.theme || 'auto',
      language: user.language || 'en',
      notificationsEnabled: user.notificationsEnabled !== false,
      emailNotifications: user.emailNotifications !== false,
      storageQuota: user.storageQuota || 10737418240,
      storageUsed: user.storageUsed || 0,
      isVerified: user.isVerified || false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user settings
router.put('/settings', auth, async (req, res) => {
  try {
    const { theme, notificationsEnabled, emailNotifications } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        theme,
        notificationsEnabled,
        emailNotifications,
        updatedAt: Date.now()
      },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get storage usage
router.get('/storage/usage', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const documents = await Document.find({ userId: req.user._id, isDeleted: false });

    const storageUsed = documents.reduce((sum, doc) => sum + doc.fileSize, 0);
    const storagePercentage = (storageUsed / user.storageQuota) * 100;

    res.json({
      storageQuota: user.storageQuota,
      storageUsed: storageUsed,
      storagePercentage: storagePercentage,
      storageAvailable: user.storageQuota - storageUsed,
      documentCount: documents.length
    });
  } catch (error) {
    console.error('Get storage usage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get activity logs
router.get('/activity-logs', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const logs = await ActivityLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments({ userId: req.user._id });

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
