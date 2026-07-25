// Cell coverage and satellite connectivity data for Section O
// Conservative planning assumptions for the active 54.2-mile Burney Falls → Ash Camp route.
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
    name: 'Peavine Creek camp',
    mile: 1433.7,
    coordinates: [-121.7853913, 41.060513],
    cellCoverage: {
      verizon: 'none',
      att: 'none',
      tmobile: 'none'
    },
    satelliteCompatible: true,
    notes: 'Conservative planning assumption from terrain and legacy notes; carrier coverage has not been field-verified.'
  },
  {
    name: 'Moosehead Creek camp',
    mile: 1448.2,
    coordinates: [-121.8318419, 41.1771229],
    cellCoverage: {
      verizon: 'none',
      att: 'none',
      tmobile: 'none'
    },
    satelliteCompatible: true,
    notes: 'Conservative no-cell assumption. This is a coverage sample point, not a verified campsite.'
  },
  {
    name: 'Alder / Star City camp',
    mile: 1456.1,
    coordinates: [-121.9202143, 41.157895],
    cellCoverage: {
      verizon: 'none',
      att: 'none',
      tmobile: 'none'
    },
    satelliteCompatible: true,
    notes: 'Conservative no-cell assumption; tree cover may also slow satellite acquisition.'
  },
  {
    name: 'Deer Creek Spring camp',
    mile: 1462.6,
    coordinates: [-121.9860782, 41.1356197],
    cellCoverage: {
      verizon: 'spotty',
      att: 'none',
      tmobile: 'none'
    },
    satelliteCompatible: true,
    notes: 'Conservative no-cell assumption; do not plan around intermittent ridge exposure.'
  },
  {
    name: 'Ash Camp pickup',
    mile: 1472.0,
    coordinates: [-122.0606252, 41.1170914],
    cellCoverage: {
      verizon: 'unknown',
      att: 'unknown',
      tmobile: 'unknown'
    },
    satelliteCompatible: true,
    notes: 'Remote forest-road trailhead. Use inReach for the pickup rendezvous and treat cellular service as unavailable until field-tested.'
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
