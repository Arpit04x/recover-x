const mongoose = require('mongoose');

const lostItemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  category: {
    type: String,
    required: [true, 'Please specify item category'],
    enum: [
      'Electronics',
      'Clothing',
      'Accessories',
      'Books',
      'Keys',
      'IDs',
      'Bags',
      'Bag',
      'Sports Equipment',
      'Stationery',
      'Books/Stationery',
      'IDs/Wallets',
      'Others',
      'Other'
    ]
  },
  itemName: {
    type: String,
    required: [true, 'Please provide item name'],
    trim: true,
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide item description'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  color: {
    type: String,
    required: [true, 'Please specify item color'],
    trim: true
  },
  location: {
    type: String,
    required: [true, 'Please specify where you lost the item'],
    trim: true
  },
  dateLost: {
    type: Date,
    required: [true, 'Please specify when you lost the item'],
    validate: {
      validator: function(value) {
        return value <= new Date();
      },
      message: 'Date lost cannot be in the future'
    }
  },
  timeLost: {
    type: String, // Storing as string for simplicity (e.g., "14:30")
    required: false
  },
  images: [{
    type: String // Store image paths
  }],
  verificationQuestions: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    }
  }],
  status: {
    type: String,
    enum: ['active', 'claimed', 'returned', 'closed'],
    default: 'active'
  },
  matchedFoundItems: [{
    foundItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoundItem'
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100
    }
  }],
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
lostItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
lostItemSchema.index({ user: 1, status: 1 });
lostItemSchema.index({ category: 1, status: 1 });
lostItemSchema.index({ dateLost: -1 });

module.exports = mongoose.model('LostItem', lostItemSchema);
