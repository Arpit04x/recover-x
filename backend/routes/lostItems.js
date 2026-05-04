const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const LostItem = require('../models/LostItem');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { findMatches } = require('../utils/matching');

// @route   GET /api/lost-items
// @desc    Get all lost items (with optional filters)
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, status, location, userId } = req.query;
    
    // Build query
    const query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    else query.status = { $ne: 'closed' }; // Exclude closed items by default
    if (location) query.location = new RegExp(location, 'i'); // Case-insensitive search
    if (userId) query.user = userId;

    const lostItems = await LostItem.find(query)
      .populate('user', 'name email phone studentId')
      .sort({ createdAt: -1 })
      .lean();

    // Remove verification questions and answers from response
    const sanitizedItems = lostItems.map(item => {
      const { verificationQuestions, ...rest } = item;
      return rest;
    });

    res.status(200).json({
      success: true,
      count: sanitizedItems.length,
      data: sanitizedItems
    });
  } catch (error) {
    console.error('Get lost items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/lost-items/:id
// @desc    Get single lost item
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const lostItem = await LostItem.findById(req.params.id)
      .populate('user', 'name email phone studentId')
      .populate('matchedFoundItems.foundItem');

    if (!lostItem) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found'
      });
    }

    // Remove verification answers if not the owner
    let itemData = lostItem.toObject();
    if (!req.user || lostItem.user._id.toString() !== req.user.id.toString()) {
      // Only show questions, not answers
      if (itemData.verificationQuestions) {
        itemData.verificationQuestions = itemData.verificationQuestions.map(q => ({
          question: q.question
        }));
      }
    }

    res.status(200).json({
      success: true,
      data: itemData
    });
  } catch (error) {
    console.error('Get lost item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/lost-items
// @desc    Report a lost item
// @access  Public
router.post('/', optionalAuth, upload.single('image'), [
  body('category').notEmpty().withMessage('Category is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('color').trim().notEmpty().withMessage('Color is required'),
  body('location').trim().notEmpty().withMessage('Location is required')
], async (req, res) => {
  // Validate request
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    const {
      category,
      itemName,
      description,
      color,
      location,
      date,
      dateLost,
      timeLost,
      verificationQuestions
    } = req.body;

    // Parse verification questions if sent as JSON string
    let parsedQuestions = [];
    if (verificationQuestions) {
      try {
        parsedQuestions = typeof verificationQuestions === 'string' 
          ? JSON.parse(verificationQuestions) 
          : verificationQuestions;
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification questions format'
        });
      }
    }

    // Get uploaded image paths
    const imagePaths = req.file ? [req.file.path] : [];

    // Create lost item
    const lostItem = await LostItem.create({
      user: req.user ? req.user.id : null,
      category,
      itemName: itemName || category, // use category if itemName is missing
      description,
      color,
      location,
      dateLost: date || dateLost || new Date(),
      timeLost,
      images: imagePaths,
      verificationQuestions: parsedQuestions
    });

    // Find matching found items
    const matches = await findMatches(lostItem);
    
    // Save matches to the lost item
    if (matches.length > 0) {
      lostItem.matchedFoundItems = matches.map(m => ({
        foundItem: m.foundItem._id,
        matchScore: m.matchScore
      }));
      await lostItem.save();
    }

    // Populate user info
    await lostItem.populate('user', 'name email phone studentId');

    res.status(201).json({
      success: true,
      message: 'Lost item reported successfully',
      data: lostItem,
      matches: matches.length > 0 ? {
        count: matches.length,
        items: matches
      } : null
    });
  } catch (error) {
    console.error('Report lost item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/lost-items/:id/matches
// @desc    Get matching found items for a lost item
// @access  Public
router.get('/:id/matches', async (req, res) => {
  try {
    const lostItem = await LostItem.findById(req.params.id);

    if (!lostItem) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found'
      });
    }

    // Run matching algorithm
    const matches = await findMatches(lostItem);

    res.status(200).json({
      success: true,
      count: matches.length,
      data: matches
    });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/lost-items/:id
// @desc    Update lost item
// @access  Private (Owner only)
router.put('/:id', protect, upload.array('images', 3), async (req, res) => {
  try {
    let lostItem = await LostItem.findById(req.params.id);

    if (!lostItem) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found'
      });
    }

    // Check ownership
    if (lostItem.user.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this item'
      });
    }

    // Prepare update fields
    const updateFields = { ...req.body };
    
    // Add new images if uploaded
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path);
      updateFields.images = [...lostItem.images, ...newImages];
    }

    // Parse verification questions if updated
    if (updateFields.verificationQuestions && typeof updateFields.verificationQuestions === 'string') {
      updateFields.verificationQuestions = JSON.parse(updateFields.verificationQuestions);
    }

    lostItem = await LostItem.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    ).populate('user', 'name email phone studentId');

    res.status(200).json({
      success: true,
      message: 'Lost item updated successfully',
      data: lostItem
    });
  } catch (error) {
    console.error('Update lost item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/lost-items/:id
// @desc    Delete lost item
// @access  Private (Owner or Admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const lostItem = await LostItem.findById(req.params.id);

    if (!lostItem) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found'
      });
    }

    // Check ownership or admin
    if (lostItem.user.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this item'
      });
    }

    await lostItem.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Lost item deleted successfully'
    });
  } catch (error) {
    console.error('Delete lost item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/lost-items/user/my-items
// @desc    Get current user's lost items
// @access  Private
router.get('/user/my-items', protect, async (req, res) => {
  try {
    const lostItems = await LostItem.find({ user: req.user.id })
      .populate('matchedFoundItems.foundItem')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: lostItems.length,
      data: lostItems
    });
  } catch (error) {
    console.error('Get my lost items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
