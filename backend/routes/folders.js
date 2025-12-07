const express = require('express');
const Folder = require('../models/Folder');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const auth = require('../middleware/auth');
const router = express.Router();

// Create folder
router.post('/', auth, async (req, res) => {
  try {
    const { name, parentFolderId, color } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    const folder = new Folder({
      userId: req.user._id,
      name,
      parentFolderId: parentFolderId || null,
      color: color || '#3B82F6'
    });

    await folder.save();

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'folder-create',
      resourceType: 'folder',
      resourceId: folder._id,
      resourceName: name
    });

    res.status(201).json({
      message: 'Folder created successfully',
      folder
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all folders for user
router.get('/', auth, async (req, res) => {
  try {
    const folders = await Folder.find({
      userId: req.user._id,
      isDeleted: false
    }).sort({ createdAt: -1 });

    res.json(folders);
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get folder contents (documents and subfolders)
router.get('/:folderId/contents', auth, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId);

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    if (folder.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const subFolders = await Folder.find({
      parentFolderId: req.params.folderId,
      isDeleted: false
    });

    const documents = await Document.find({
      folderId: req.params.folderId,
      isDeleted: false
    });

    res.json({
      folder,
      subFolders,
      documents
    });
  } catch (error) {
    console.error('Get folder contents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update folder
router.put('/:folderId', auth, async (req, res) => {
  try {
    const { name, color } = req.body;

    const folder = await Folder.findById(req.params.folderId);

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    if (folder.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (name) folder.name = name;
    if (color) folder.color = color;
    folder.updatedAt = Date.now();

    await folder.save();

    res.json(folder);
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete folder (soft delete)
router.delete('/:folderId', auth, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.folderId);

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    if (folder.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    folder.isDeleted = true;
    folder.deletedAt = Date.now();
    await folder.save();

    // Also soft delete all documents in this folder
    await Document.updateMany(
      { folderId: req.params.folderId },
      { isDeleted: true, deletedAt: Date.now() }
    );

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      action: 'folder-delete',
      resourceType: 'folder',
      resourceId: folder._id,
      resourceName: folder.name
    });

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
