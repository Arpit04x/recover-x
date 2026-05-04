const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  lostItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LostItem',
    required: true
  },
  foundItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoundItem',
    required: true
  },
  claimant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verificationAnswers: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    }
  }],
  additionalProof: {
    type: String,
    maxlength: [500, 'Additional proof cannot exceed 500 characters']
  },
  proofImages: [{
    type: String // Purchase receipts, photos, etc.
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewDate: {
    type: Date
  },
  reviewNotes: {
    type: String,
    maxlength: [500, 'Review notes cannot exceed 500 characters']
  },
  rejectionReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
claimSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
claimSchema.index({ claimant: 1, status: 1 });
claimSchema.index({ status: 1, createdAt: -1 });
claimSchema.index({ lostItem: 1 });
claimSchema.index({ foundItem: 1 });

module.exports = mongoose.model('Claim', claimSchema);
