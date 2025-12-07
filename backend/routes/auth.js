const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, nin } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { nin }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or NIN' });
    }

    // Create new user
    const user = new User({ name, email, password, nin });
    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    // Log registration
    const { logActivity, getRequestInfo } = require('../utils/logger');
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: user._id,
      action: 'register',
      resourceType: 'user',
      resourceId: user._id,
      resourceName: user.name,
      ...requestInfo
    });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        nin: user.nin,
        role: user.role,
        institutionId: user.institutionId
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    // Log login activity
    const { logActivity, getRequestInfo } = require('../utils/logger');
    const requestInfo = getRequestInfo(req);
    await logActivity({
      userId: user._id,
      action: 'login',
      resourceType: 'user',
      resourceId: user._id,
      resourceName: user.name,
      ...requestInfo
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        nin: user.nin,
        role: user.role,
        institutionId: user.institutionId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
const auth = require('../middleware/auth');
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      nin: req.user.nin
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

