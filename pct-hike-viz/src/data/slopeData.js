/**
 * Slope Angle Shading Configuration
 * 
 * Defines terrain difficulty visualization layers.
 * Based on nst.guide slope-angle methodology using color scheme matching CalTopo.
 * 
 * Color scheme indicates steepness:
 * - Green: 0-15° (easy walking)
 * - Yellow: 15-25° (moderate, some exertion)
 * - Orange: 25-35° (steep, significant effort)
 * - Red: 35-45° (very steep, challenging)
 * - Purple: 45-50° (extreme, scrambling territory)
 * - Black: 50°+ (technical climbing)
 */

export const slopeColorScheme = [
  { angle: 0, color: [76, 167, 35, 0], label: 'Flat (0-15°)' },       // Transparent green
  { angle: 15, color: [248, 253, 85, 180], label: 'Moderate (15-25°)' }, // Yellow
  { angle: 25, color: [241, 184, 64, 200], label: 'Steep (25-35°)' },    // Orange
  { angle: 35, color: [238, 128, 49, 220], label: 'Very Steep (35-40°)' }, // Dark orange
  { angle: 40, color: [235, 51, 35, 240], label: 'Extreme (40-45°)' },  // Red
  { angle: 45, color: [122, 41, 217, 255], label: 'Scrambling (45-50°)' }, // Purple
  { angle: 50, color: [0, 38, 245, 255], label: 'Technical (50°+)' }   // Blue/black
];

/**
 * Slope angle categories with hiking implications
 */
export const slopeCategories = [
  {
    range: '0-15°',
    label: 'Easy Walking',
    color: '#4CA723',
    emoji: '🟢',
    description: 'Comfortable terrain. Normal hiking pace. Good for recovery days.',
    hikingSpeed: '3.0 mph',
    difficulty: 'Easy'
  },
  {
    range: '15-25°',
    label: 'Moderate Grade',
    color: '#F8FD55',
    emoji: '🟡',
    description: 'Noticeable uphill. Reduced pace. Standard PCT climbing.',
    hikingSpeed: '2.0-2.5 mph',
    difficulty: 'Moderate'
  },
  {
    range: '25-35°',
    label: 'Steep Climb',
    color: '#F1B840',
    emoji: '🟠',
    description: 'Sustained steep sections. Frequent breaks. Trekking poles helpful.',
    hikingSpeed: '1.5-2.0 mph',
    difficulty: 'Strenuous'
  },
  {
    range: '35-45°',
    label: 'Very Steep',
    color: '#EE3323',
    emoji: '🔴',
    description: 'Hands-on-knees territory. Slow pace. Full exertion.',
    hikingSpeed: '1.0-1.5 mph',
    difficulty: 'Very Strenuous'
  },
  {
    range: '45-50°',
    label: 'Extreme Grade',
    color: '#7A29D9',
    emoji: '🟣',
    description: 'Scrambling may be required. Use handholds. Consider pack hoisting.',
    hikingSpeed: '<1.0 mph',
    difficulty: 'Extreme'
  },
  {
    range: '50°+',
    label: 'Technical',
    color: '#0026F5',
    emoji: '⚫',
    description: 'Climbing skills required. Not typical PCT terrain. Avoid if possible.',
    hikingSpeed: 'N/A',
    difficulty: 'Technical'
  }
];

/**
 * Section O terrain profile (from GPS analysis)
 * Based on calculate_day_elevations.py output
 */
export const sectionOTerrainProfile = {
  day1: {
    distance: 5.609,
    elevationGain: 608,
    elevationLoss: 514,
    maxGrade: 8.5,
    difficulty: 'Moderate',
    notes: 'Shorter opening leg after the early drive from SJC; rolling terrain to Rock Creek.'
  },
  day2: {
    distance: 8.027,
    elevationGain: 2006,
    elevationLoss: 276,
    maxGrade: 7.1,
    difficulty: 'Strenuous',
    notes: 'Largest early climb; start before the heat and pace conservatively.'
  },
  day3: {
    distance: 14.529,
    elevationGain: 1824,
    elevationLoss: 1313,
    maxGrade: 7.3,
    difficulty: 'Very Strenuous',
    notes: 'Longest leg and largest total vertical load; this is the full-pack capability gate.'
  },
  day4: {
    distance: 4.082,
    elevationGain: 987,
    elevationLoss: 146,
    maxGrade: 8.9,
    difficulty: 'Strenuous',
    notes: 'Short steep climb to the route high point and a planned dry camp.'
  },
  day5: {
    distance: 3.789,
    elevationGain: 85,
    elevationLoss: 818,
    maxGrade: 9.6,
    difficulty: 'Strenuous',
    notes: 'Short but predominantly downhill from the high saddle.'
  },
  day6: {
    distance: 6.350,
    elevationGain: 884,
    elevationLoss: 1075,
    maxGrade: 6.2,
    difficulty: 'Strenuous (downhill)',
    notes: 'Nearly 2,000 vertical feet of mixed terrain to Deer Creek Spring.'
  },
  day7: {
    distance: 5.604,
    elevationGain: 0,
    elevationLoss: 1828,
    maxGrade: 8.3,
    difficulty: 'Strenuous',
    notes: 'The knee-intensive sustained descent to Butcherknife Creek.'
  },
  day8: {
    distance: 3.854,
    elevationGain: 0,
    elevationLoss: 912,
    maxGrade: 10.2,
    difficulty: 'Very Strenuous',
    notes: 'Short final descent to the Ash Camp pickup.'
  }
};

/**
 * Key terrain hazards identified from slope analysis
 */
export const terrainHazards = [
  {
    location: 'Day 2: major climb',
    concern: 'Approximately 2,006 ft of gain in 8.027 miles',
    mitigation: 'Start early, use a sustainable pace, and leave the last confirmed source with enough water.',
    coordinates: [-121.798667, 41.085022]
  },
  {
    location: 'Day 7: Butcherknife Creek descent',
    concern: 'Approximately 1,828 ft of loss in 5.604 miles',
    mitigation: 'Use poles, shorten stride, manage hotspots early, and allow more time than flat mileage suggests.',
    coordinates: [-122.026677, 41.129422]
  }
];

// Pre-compute the maximum grade for each category to avoid parsing strings during lookup
const categoryMaxGrades = slopeCategories.map(cat => {
  const max = parseInt(cat.range.split('-')[1]);
  return isNaN(max) ? Infinity : max;
});

/**
 * Generate slope difficulty summary for a day
 */
export const getDayTerrainSummary = (day) => {
  const profile = sectionOTerrainProfile[`day${day}`];
  if (!profile) return null;
  
  const category = slopeCategories.find((_, index) => {
    return profile.maxGrade <= categoryMaxGrades[index];
  }) || slopeCategories[slopeCategories.length - 1];
  
  return {
    ...profile,
    categoryEmoji: category.emoji,
    categoryLabel: category.label,
    estimatedTime: (
      profile.distance / 2.2 +
      profile.elevationGain / 1500
    ).toFixed(1) + ' hours',
    terrainBreakdown: estimateTerrainBreakdown(profile)
  };
};

/**
 * Estimate terrain difficulty breakdown
 */
const estimateTerrainBreakdown = (profile) => {
  // Simplified model based on elevation gain/loss and distance
  const gainRatio = profile.elevationGain / profile.distance / 100;
  const lossRatio = Math.abs(profile.elevationLoss) / profile.distance / 100;
  
  return {
    easy: Math.max(0, 100 - (gainRatio + lossRatio) * 20),
    moderate: Math.min(50, (gainRatio + lossRatio) * 15),
    steep: Math.min(30, (gainRatio + lossRatio) * 5),
    verysteep: Math.min(20, Math.max(0, (gainRatio + lossRatio) - 10) * 2)
  };
};

/**
 * MapLibre GL style for slope angle overlay
 * Compatible with terrain RGB tiles
 */
export const getSlopeAngleStyle = (visible = true) => ({
  id: 'slope-angle-shading',
  type: 'hillshade',
  source: 'terrain-rgb',
  layout: {
    visibility: visible ? 'visible' : 'none'
  },
  paint: {
    // Use hillshade to approximate slope visualization
    // In production, would use actual slope-angle raster tiles like nst.guide
    'hillshade-exaggeration': 0.6,
    'hillshade-shadow-color': 'rgba(238, 128, 49, 0.3)', // Orange tint for steep areas
    'hillshade-highlight-color': 'rgba(248, 253, 85, 0.2)', // Yellow tint for moderate
    'hillshade-illumination-direction': 315
  }
});

export default {
  slopeColorScheme,
  slopeCategories,
  sectionOTerrainProfile,
  terrainHazards,
  getDayTerrainSummary,
  getSlopeAngleStyle
};
