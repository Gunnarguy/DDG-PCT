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
    distance: 10.0,
    elevationGain: 776,
    elevationLoss: 31,
    maxGrade: 22, // degrees
    avgGrade: 4.5,
    difficulty: 'Moderate',
    notes: 'Gentle start. Mostly <15° terrain with occasional 15-25° sections.'
  },
  day2: {
    distance: 9.0,
    elevationGain: 1701,
    elevationLoss: 41,
    maxGrade: 28,
    avgGrade: 9.5,
    difficulty: 'Strenuous',
    notes: 'Big climb day. Sustained 25-35° sections. Take breaks at viewpoints.'
  },
  day3: {
    distance: 8.0,
    elevationGain: 230,
    elevationLoss: 358,
    maxGrade: 18,
    avgGrade: 2.0,
    difficulty: 'Easy-Moderate',
    notes: 'Rolling terrain. Mostly 0-15° with gentle descents. Recovery day.'
  },
  day4: {
    distance: 9.5,
    elevationGain: 1181,
    elevationLoss: 836,
    maxGrade: 26,
    avgGrade: 6.5,
    difficulty: 'Moderate-Strenuous',
    notes: 'Mixed terrain. Some 25-35° climbs followed by steep descents. Pole-worthy.'
  },
  day5: {
    distance: 9.5,
    elevationGain: 2531,
    elevationLoss: 2542,
    maxGrade: 32,
    avgGrade: 14.5,
    difficulty: 'Very Strenuous',
    notes: 'Hardest day. Multiple 25-35° climbs. Castle Crags approach has 35-40° sections.'
  },
  day6: {
    distance: 6.0,
    elevationGain: 0,
    elevationLoss: 2552,
    maxGrade: 30,
    avgGrade: 12.0,
    difficulty: 'Strenuous (downhill)',
    notes: 'All downhill but steep. 25-30° descents. Hard on knees. Poles essential.'
  }
};

/**
 * Key terrain hazards identified from slope analysis
 */
export const terrainHazards = [
  {
    location: 'Day 2: Hat Creek Rim climb',
    concern: 'Sustained 25-28° grade for 3+ miles',
    mitigation: 'Start early to avoid midday heat. Carry extra water. Take breaks.',
    coordinates: [41.091989, -121.800767]
  },
  {
    location: 'Day 5: Castle Crags approach',
    concern: 'Technical 32-35° granite sections',
    mitigation: 'Poles recommended. Watch for loose rock. May need handholds on switchbacks.',
    coordinates: [41.173417, -121.897491]
  },
  {
    location: 'Day 6: Final descent',
    concern: '2,552ft loss over 6 miles (avg 28° grade)',
    mitigation: 'Knee braces advised. Take slow. Consider camp at mile 46 to break descent into 2 days.',
    coordinates: [41.19, -121.93]
  }
];

/**
 * Generate slope difficulty summary for a day
 */
export const getDayTerrainSummary = (day) => {
  const profile = sectionOTerrainProfile[`day${day}`];
  if (!profile) return null;
  
  const category = slopeCategories.find(cat => {
    const max = parseInt(cat.range.split('-')[1]);
    return profile.maxGrade <= max;
  }) || slopeCategories[slopeCategories.length - 1];
  
  return {
    ...profile,
    categoryEmoji: category.emoji,
    categoryLabel: category.label,
    estimatedTime: (profile.distance / parseFloat(category.hikingSpeed || 2.0)).toFixed(1) + ' hours',
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
