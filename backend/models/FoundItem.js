const mongoose = require('mongoose');

const foundItemSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return !this.isAnonymous;
    }
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  anonymousContact: {
    type: String, // Email or phone for anonymous reporters
    required: function() {
      return this.isAnonymous;
    }
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
    required: [true, 'Please specify where you found the item'],
    trim: true
  },
  dateFound: {
    type: Date,
    required: [true, 'Please specify when you found the item'],
    validate: {
      validator: function(value) {
        return value <= new Date();
      },
      message: 'Date found cannot be in the future'
    }
  },
  timeFound: {
    type: String, // Storing as string (e.g., "14:30")
    required: false
  },
  images: [{
    type: String // Store image paths
  }],
  currentLocation: {
    type: String, // Where the item is currently stored
    required: [true, 'Please specify where the item is currently kept']
  },
  status: {
    type: String,
    enum: ['available', 'claimed', 'returned'],
    default: 'available'
  },
  claimedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
foundItemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
foundItemSchema.index({ status: 1 });
foundItemSchema.index({ category: 1, status: 1 });
foundItemSchema.index({ dateFound: -1 });

module.exports = mongoose.model('FoundItem', foundItemSchema);
