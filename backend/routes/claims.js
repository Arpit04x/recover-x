const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Claim = require('../models/Claim');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   POST /api/claims
// @desc    Create a new claim
// @access  Private
router.post('/', protect, upload.array('proofImages', 3), [
  body('lostItemId').notEmpty().withMessage('Lost item ID is required'),
  body('foundItemId').notEmpty().withMessage('Found item ID is required'),
  body('verificationAnswers').notEmpty().withMessage('Verification answers are required')
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
    const { lostItemId, foundItemId, verificationAnswers, additionalProof } = req.body;

    // Verify lost item exists and get verification questions
    const lostItem = await LostItem.findById(lostItemId);
    if (!lostItem) {
      return res.status(404).json({
        success: false,
        message: 'Lost item not found'
      });
    }

    // Verify found item exists and is available
    const foundItem = await FoundItem.findById(foundItemId);
    if (!foundItem) {
      return res.status(404).json({
        success: false,
        message: 'Found item not found'
      });
    }

    if (foundItem.status !== 'available') {
      return res.status(400).json({
        success: false,
        message: 'This item has already been claimed'
      });
    }

    // Parse verification answers
    let parsedAnswers = [];
    try {
      parsedAnswers = typeof verificationAnswers === 'string' 
        ? JSON.parse(verificationAnswers) 
        : verificationAnswers;
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification answers format'
      });
    }

    // Check if user already has a pending claim for this item
    const existingClaim = await Claim.findOne({
      foundItem: foundItemId,
      claimant: req.user.id,
      status: 'pending'
    });

    if (existingClaim) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending claim for this item'
      });
    }

    // Get uploaded proof images
    const proofImagePaths = req.files ? req.files.map(file => file.path) : [];

    // Create claim
    const claim = await Claim.create({
      lostItem: lostItemId,
      foundItem: foundItemId,
      claimant: req.user.id,
      verificationAnswers: parsedAnswers,
      additionalProof,
      proofImages: proofImagePaths
    });

    // Update found item status
    foundItem.status = 'claimed';
    await foundItem.save();

    // Populate claim details
    await claim.populate([
      { path: 'claimant', select: 'name email phone studentId' },
      { path: 'lostItem', populate: { path: 'user', select: 'name email' } },
      { path: 'foundItem', populate: { path: 'user', select: 'name email' } }
    ]);

    res.status(201).json({
      success: true,
      message: 'Claim submitted successfully. Awaiting admin review.',
      data: claim
    });
  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/claims
// @desc    Get all claims (Admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    
    const query = status ? { status } : {};

    const claims = await Claim.find(query)
      .populate('claimant', 'name email phone studentId')
      .populate({
        path: 'lostItem',
        populate: { path: 'user', select: 'name email phone' }
      })
      .populate({
        path: 'foundItem',
        populate: { path: 'user', select: 'name email phone' }
      })
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: claims.length,
      data: claims
    });
  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/claims/my-claims
// @desc    Get current user's claims
// @access  Private
router.get('/my-claims', protect, async (req, res) => {
  try {
    const claims = await Claim.find({ claimant: req.user.id })
      .populate('lostItem')
      .populate('foundItem')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: claims.length,
      data: claims
    });
  } catch (error) {
    console.error('Get my claims error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/claims/:id
// @desc    Get single claim
// @access  Private (Claimant, Item owner, or Admin)
router.get('/:id', protect, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate('claimant', 'name email phone studentId')
      .populate({
        path: 'lostItem',
        populate: { path: 'user', select: 'name email phone' }
      })
      .populate({
        path: 'foundItem',
        populate: { path: 'user', select: 'name email phone' }
      })
      .populate('reviewedBy', 'name email');

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    // Check authorization
    const isClaimant = claim.claimant._id.toString() === req.user.id;
    const isLostItemOwner = claim.lostItem.user._id.toString() === req.user.id;
    const isFoundItemOwner = claim.foundItem.user && claim.foundItem.user._id.toString() === req.user.id;
    const isAdmin = req.user.isAdmin;

    if (!isClaimant && !isLostItemOwner && !isFoundItemOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this claim'
      });
    }

    res.status(200).json({
      success: true,
      data: claim
    });
  } catch (error) {
    console.error('Get claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/claims/:id/approve
// @desc    Approve a claim
// @access  Private/Admin
router.put('/:id/approve', protect, authorize('admin'), [
  body('reviewNotes').optional().trim()
], async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    if (claim.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Claim has already been reviewed'
      });
    }

    // Update claim
    claim.status = 'approved';
    claim.reviewedBy = req.user.id;
    claim.reviewDate = Date.now();
    claim.reviewNotes = req.body.reviewNotes || '';
    await claim.save();

    // Update found item status
    await FoundItem.findByIdAndUpdate(claim.foundItem, {
      status: 'returned',
      claimedBy: claim.claimant
    });

    // Update lost item status
    await LostItem.findByIdAndUpdate(claim.lostItem, {
      status: 'returned'
    });

    // Populate claim
    await claim.populate([
      { path: 'claimant', select: 'name email phone studentId' },
      { path: 'lostItem' },
      { path: 'foundItem' },
      { path: 'reviewedBy', select: 'name email' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Claim approved successfully',
      data: claim
    });
  } catch (error) {
    console.error('Approve claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/claims/:id/reject
// @desc    Reject a claim
// @access  Private/Admin
router.put('/:id/reject', protect, authorize('admin'), [
  body('rejectionReason').trim().notEmpty().withMessage('Rejection reason is required')
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
    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    if (claim.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Claim has already been reviewed'
      });
    }

    // Update claim
    claim.status = 'rejected';
    claim.reviewedBy = req.user.id;
    claim.reviewDate = Date.now();
    claim.rejectionReason = req.body.rejectionReason;
    claim.reviewNotes = req.body.reviewNotes || '';
    await claim.save();

    // Reset found item status to available
    await FoundItem.findByIdAndUpdate(claim.foundItem, {
      status: 'available'
    });

    // Populate claim
    await claim.populate([
      { path: 'claimant', select: 'name email phone studentId' },
      { path: 'lostItem' },
      { path: 'foundItem' },
      { path: 'reviewedBy', select: 'name email' }
    ]);

    res.status(200).json({
      success: true,
      message: 'Claim rejected',
      data: claim
    });
  } catch (error) {
    console.error('Reject claim error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
