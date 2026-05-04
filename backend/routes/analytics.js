const express = require('express');
const router = express.Router();
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics
// @access  Private/Admin
router.get('/dashboard', protect, authorize('admin'), async (req, res) => {
  try {
    // Total counts
    const totalLostItems = await LostItem.countDocuments();
    const totalFoundItems = await FoundItem.countDocuments();
    const totalClaims = await Claim.countDocuments();
    const activeLostItems = await LostItem.countDocuments({ status: 'active' });
    const activeFoundItems = await FoundItem.countDocuments({ status: 'available' });
    const pendingClaims = await Claim.countDocuments({ status: 'pending' });
    const successfulReturns = await LostItem.countDocuments({ status: 'returned' });

    // Success rate
    const successRate = totalLostItems > 0 
      ? ((successfulReturns / totalLostItems) * 100).toFixed(2) 
      : 0;

    // Most commonly lost item categories
    const categoryStats = await LostItem.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Most common locations
    const locationStats = await LostItem.aggregate([
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLost = await LostItem.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const recentFound = await FoundItem.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const recentReturns = await LostItem.countDocuments({
      status: 'returned',
      updatedAt: { $gte: thirtyDaysAgo }
    });

    // Claims statistics
    const approvedClaims = await Claim.countDocuments({ status: 'approved' });
    const rejectedClaims = await Claim.countDocuments({ status: 'rejected' });

    // Average resolution time (in days)
    const resolvedItems = await LostItem.find({ 
      status: 'returned' 
    }).select('createdAt updatedAt');

    let avgResolutionTime = 0;
    if (resolvedItems.length > 0) {
      const totalDays = resolvedItems.reduce((sum, item) => {
        const days = (item.updatedAt - item.createdAt) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      avgResolutionTime = (totalDays / resolvedItems.length).toFixed(1);
    }

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await LostItem.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          lost: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Add found items to monthly trend
    const monthlyFoundTrend = await FoundItem.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          found: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalLostItems,
          totalFoundItems,
          totalClaims,
          activeLostItems,
          activeFoundItems,
          pendingClaims,
          successfulReturns,
          successRate: parseFloat(successRate)
        },
        categories: categoryStats,
        locations: locationStats,
        recentActivity: {
          lost: recentLost,
          found: recentFound,
          returned: recentReturns
        },
        claims: {
          total: totalClaims,
          pending: pendingClaims,
          approved: approvedClaims,
          rejected: rejectedClaims
        },
        performance: {
          avgResolutionTime: parseFloat(avgResolutionTime)
        },
        trends: {
          monthly: monthlyTrend,
          monthlyFound: monthlyFoundTrend
        }
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/categories
// @desc    Get category-wise statistics
// @access  Private/Admin
router.get('/categories', protect, authorize('admin'), async (req, res) => {
  try {
    const categoryData = await LostItem.aggregate([
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          returned: {
            $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: categoryData
    });
  } catch (error) {
    console.error('Get category analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/analytics/locations
// @desc    Get location-wise statistics (hotspots)
// @access  Private/Admin
router.get('/locations', protect, authorize('admin'), async (req, res) => {
  try {
    const locationData = await LostItem.aggregate([
      {
        $group: {
          _id: '$location',
          count: { $sum: 1 },
          categories: { $addToSet: '$category' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.status(200).json({
      success: true,
      data: locationData
    });
  } catch (error) {
    console.error('Get location analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
