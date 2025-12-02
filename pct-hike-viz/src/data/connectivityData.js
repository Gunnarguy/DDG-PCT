// Cell coverage and satellite connectivity data for Section O
// Aligned with DDG-PCT 6-day itinerary: Burney Falls -> Castle Crags
export const connectivityZones = [
  {
    name: 'Burney Falls Trailhead',
    mile: 1420.7,
    coordinates: [-121.620709, 41.01348],
    cellCoverage: {
      verizon: 'good',
      att: 'fair',
      tmobile: 'fair'
    },
    satelliteCompatible: true,
    notes: 'State park has reliable cell service. Last strong signal before trail.'
  },
  {
    name: 'Round Valley Campground',
    mile: 1436.6, // Approx based on +15.9mi
    coordinates: [-121.732282, 41.027728],
    cellCoverage: {
      verizon: 'none',
      att: 'none',
      tmobile: 'none'
    },
    satelliteCompatible: true,
    notes: 'Deep valley location. No cell service. Satellite SOS and messaging only.'
  },
  {
    name: 'Black Rock Camp',
    mile: 1451.0, // Approx based on +30.3mi
    coordinates: [-121.800767, 41.091989],
    cellCoverage: {
      verizon: 'none',
      att: 'none',
      tmobile: 'none'
    },
    satelliteCompatible: true,
    notes: 'Remote wilderness camp. Zero cell coverage. Good sky view for satellite.'
  },
  {
    name: 'Horse Camp',
    mile: 1463.7, // Approx based on +43.0mi
    coordinates: [-121.783984, 41.16896],
    cellCoverage: {
      verizon: 'none',
      att: 'none',
      tmobile: 'none'
    },
    satelliteCompatible: true,
    notes: 'Forested area. No cell service. Satellite signals may be obstructed by trees.'
  },
  {
    name: 'Indian Springs Camp',
    mile: 1478.1, // Approx based on +57.4mi
    coordinates: [-121.897491, 41.173417],
    cellCoverage: {
      verizon: 'none',
      att: 'none',
      tmobile: 'none'
    },
    satelliteCompatible: true,
    notes: 'Remote spring. No cell service. Satellite required.'
  },
  {
    name: 'Castle Crags Vista Camp',
    mile: 1490.8, // Approx based on +70.1mi
    coordinates: [-121.982003, 41.139897],
    cellCoverage: {
      verizon: 'spotty',
      att: 'none',
      tmobile: 'none'
    },
    satelliteCompatible: true,
    notes: 'High elevation vista. Possible spotty Verizon signal from I-5 corridor. Excellent satellite visibility.'
  },
  {
    name: 'Castle Crags State Park',
    mile: 1498.8, // Approx based on +78.1mi
    coordinates: [-122.039017, 41.114517],
    cellCoverage: {
      verizon: 'good',
      att: 'good',
      tmobile: 'fair'
    },
    satelliteCompatible: true,
    notes: 'Full cell service restored. Reliable connectivity for coordination.'
  },
  {
    name: 'Dunsmuir Town',
    mile: 1510,
    coordinates: [-122.2719, 41.2084],
    cellCoverage: {
      verizon: 'excellent',
      att: 'excellent',
      tmobile: 'good'
    },
    satelliteCompatible: true,
    notes: 'Full service town. All carriers strong. WiFi available at businesses.'
  }
];

export const satelliteDevices = [
  {
    device: 'iPhone 16 Pro Max',
    features: ['Emergency SOS via satellite', 'Roadside Assistance via satellite', 'Find My via satellite'],
    coverage: 'Global (requires iOS 18.1+)',
    cost: 'Free for 2 years with activation',
    notes: 'Works in open sky with clear view. Emergency services only—cannot message contacts.',
    compatibility: 'iPhone 14 and later (including iPhone 15, 16 series)',
    trailNotes: 'Best on exposed ridges. Limited under tree canopy. 15-30 second connection time.'
  },
  {
    device: 'Garmin inReach Mini 2',
    features: ['Two-way messaging', 'SOS to GEOS rescue', 'GPS tracking', 'Weather forecasts'],
    coverage: 'Global Iridium network',
    cost: '$14.95+/month subscription',
    notes: 'Works under tree cover better than iPhone satellite. Proven rescue device.',
    compatibility: 'Standalone device',
    trailNotes: 'Industry standard for PCT thru-hikers. Reliable even in canyons.'
  },
  {
    device: 'Garmin inReach Messenger',
    features: ['Two-way messaging', 'SOS', 'GPS tracking', 'Connects to phone for easier typing'],
    coverage: 'Global Iridium network',
    cost: '$14.95+/month subscription',
    notes: 'Newer lightweight model (114g). Pairs with phone via Bluetooth.',
    compatibility: 'Standalone with phone pairing',
    trailNotes: 'Easier messaging than Mini 2. Good for daily check-ins with family.'
  },
  {
    device: 'Zoleo Satellite Communicator',
    features: ['Two-way messaging', 'SOS', 'Email', 'Social media check-ins'],
    coverage: 'Global Iridium network',
    cost: '$20/month basic plan',
    notes: 'Lower subscription cost. 200-hour battery life. No annual contract.',
    compatibility: 'Standalone with phone pairing',
    trailNotes: 'Budget-friendly alternative to Garmin. Good community reviews.'
  },
  {
    device: 'Garmin GPSMAP 67i',
    features: ['Full GPS maps', 'Two-way messaging', 'SOS', 'Touchscreen'],
    coverage: 'Global Iridium network',
    cost: '$599 device + $14.95+/month',
    notes: 'Premium all-in-one device. Replaces phone for navigation.',
    compatibility: 'Standalone GPS + satellite',
    trailNotes: 'Overkill for Section O but great for long thru-hikes.'
  }
];

// Helper to get signal strength badge styling
export const getSignalBadgeClass = (strength) => {
  switch (strength) {
    case 'excellent':
    case 'good':
      return 'signal-good';
    case 'fair':
    case 'spotty':
      return 'signal-fair';
    case 'poor':
      return 'signal-poor';
    case 'none':
      return 'signal-none';
    default:
      return 'signal-unknown';
  }
};

// Helper to get signal strength emoji
export const getSignalEmoji = (strength) => {
  switch (strength) {
    case 'excellent':
    case 'good':
      return '📶';
    case 'fair':
    case 'spotty':
      return '📶';
    case 'poor':
      return '📵';
    case 'none':
      return '📵';
    default:
      return '❓';
  }
};
