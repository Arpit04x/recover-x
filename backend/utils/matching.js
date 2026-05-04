/**
 * Smart Matching Algorithm for Lost and Found Items
 * 
 * This algorithm matches lost items with found items based on:
 * 1. Category (40% weight)
 * 2. Color (25% weight)
 * 3. Location proximity (20% weight)
 * 4. Date/Time range (15% weight)
 * 
 * Match Score >= 60% is considered a potential match
 */

const FoundItem = require('../models/FoundItem');

// Common location mappings (can be expanded based on campus)
const locationProximity = {
  'Library': ['Library Entrance', 'Reading Room', 'Study Hall', 'Library Cafe'],
  'Cafeteria': ['Food Court', 'Dining Hall', 'Canteen'],
  'Hostel': ['Hostel Block A', 'Hostel Block B', 'Hostel Block C', 'Boys Hostel', 'Girls Hostel'],
  'Classroom': ['Academic Block', 'Lecture Hall', 'Lab', 'Computer Lab'],
  'Sports': ['Sports Complex', 'Gymnasium', 'Playground', 'Stadium'],
  'Parking': ['Parking Lot', 'Bike Stand', 'Vehicle Parking']
};

// Calculate category match (40% weight)
const calculateCategoryMatch = (lostCategory, foundCategory) => {
  return lostCategory.toLowerCase() === foundCategory.toLowerCase() ? 1 : 0;
};

// Calculate color similarity (25% weight)
const calculateColorMatch = (lostColor, foundColor) => {
  const lostColorLower = lostColor.toLowerCase().trim();
  const foundColorLower = foundColor.toLowerCase().trim();
  
  // Exact match
  if (lostColorLower === foundColorLower) {
    return 1;
  }
  
  // Partial match (e.g., "dark blue" vs "blue")
  if (lostColorLower.includes(foundColorLower) || foundColorLower.includes(lostColorLower)) {
    return 0.7;
  }
  
  // Similar colors mapping
  const colorSimilarities = {
    'black': ['dark', 'charcoal', 'gray'],
    'white': ['light', 'cream', 'ivory'],
    'blue': ['navy', 'azure', 'sky blue'],
    'red': ['maroon', 'crimson', 'scarlet'],
    'green': ['olive', 'lime', 'emerald'],
    'yellow': ['golden', 'amber'],
    'brown': ['tan', 'beige', 'coffee']
  };
  
  for (const [baseColor, variants] of Object.entries(colorSimilarities)) {
    if ((lostColorLower === baseColor && variants.some(v => foundColorLower.includes(v))) ||
        (foundColorLower === baseColor && variants.some(v => lostColorLower.includes(v)))) {
      return 0.5;
    }
  }
  
  return 0;
};

// Calculate location proximity (20% weight)
const calculateLocationMatch = (lostLocation, foundLocation) => {
  const lostLoc = lostLocation.toLowerCase().trim();
  const foundLoc = foundLocation.toLowerCase().trim();
  
  // Exact match
  if (lostLoc === foundLoc) {
    return 1;
  }
  
  // Check if locations are in the same proximity group
  for (const [area, locations] of Object.entries(locationProximity)) {
    const lostInGroup = locations.some(loc => lostLoc.includes(loc.toLowerCase()));
    const foundInGroup = locations.some(loc => foundLoc.includes(loc.toLowerCase()));
    
    if (lostInGroup && foundInGroup) {
      return 0.7;
    }
  }
  
  // Partial match (contains similar keywords)
  if (lostLoc.includes(foundLoc) || foundLoc.includes(lostLoc)) {
    return 0.5;
  }
  
  return 0;
};

// Calculate date/time proximity (15% weight)
const calculateDateMatch = (lostDate, lostTime, foundDate, foundTime) => {
  const lostDateTime = new Date(lostDate);
  const foundDateTime = new Date(foundDate);
  
  // Calculate difference in hours
  const diffInHours = Math.abs(foundDateTime - lostDateTime) / (1000 * 60 * 60);
  
  // Same day
  if (diffInHours < 24) {
    return 1;
  }
  
  // Within 3 days
  if (diffInHours < 72) {
    return 0.7;
  }
  
  // Within a week
  if (diffInHours < 168) {
    return 0.5;
  }
  
  // Within two weeks
  if (diffInHours < 336) {
    return 0.3;
  }
  
  return 0;
};

// Main matching function
const findMatches = async (lostItem) => {
  try {
    // Get all available found items
    const foundItems = await FoundItem.find({ status: 'available' })
      .populate('user', 'name email phone');
    
    const matches = [];
    
    // Weights for each factor
    const weights = {
      category: 0.40,
      color: 0.25,
      location: 0.20,
      date: 0.15
    };
    
    for (const foundItem of foundItems) {
      // Calculate individual match scores
      const categoryScore = calculateCategoryMatch(lostItem.category, foundItem.category);
      const colorScore = calculateColorMatch(lostItem.color, foundItem.color);
      const locationScore = calculateLocationMatch(lostItem.location, foundItem.location);
      const dateScore = calculateDateMatch(
        lostItem.dateLost,
        lostItem.timeLost,
        foundItem.dateFound,
        foundItem.timeFound
      );
      
      // Calculate weighted total score
      const totalScore = (
        categoryScore * weights.category +
        colorScore * weights.color +
        locationScore * weights.location +
        dateScore * weights.date
      ) * 100;
      
      // Only include matches with score >= 60%
      if (totalScore >= 60) {
        matches.push({
          foundItem: foundItem,
          matchScore: Math.round(totalScore),
          breakdown: {
            category: Math.round(categoryScore * 100),
            color: Math.round(colorScore * 100),
            location: Math.round(locationScore * 100),
            date: Math.round(dateScore * 100)
          }
        });
      }
    }
    
    // Sort by match score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    return matches;
  } catch (error) {
    console.error('Error in matching algorithm:', error);
    throw error;
  }
};

module.exports = {
  findMatches,
  calculateCategoryMatch,
  calculateColorMatch,
  calculateLocationMatch,
  calculateDateMatch
};
