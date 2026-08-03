// Cell coverage and satellite connectivity data for Section O
// Conservative planning assumptions for the active 51.844-mile Burney Falls → Ash Camp route.
export const connectivityZones = [
  {
    name: 'Burney Falls Trailhead',
    mile: 1420.653,
    coordinates: [-121.65376551, 41.01104125],
    cellCoverage: {
      verizon: 'good',
      att: 'fair',
      tmobile: 'fair'
    },
    satelliteCompatible: true,
    notes: 'Expected trailhead coverage; download offline maps here and field-test every carrier.'
  },
  {
    name: 'Pre-private USFS dry camp',
    mile: 1434.94,
    coordinates: [-121.789562, 41.068437],
    cellCoverage: {
      verizon: 'none',
      att: 'none',
      tmobile: 'none'
    },
    satelliteCompatible: true,
    notes: 'Conservative no-cell assumption at the GIS-screened dry-camp candidate. Satellite check-in is required; ground capacity remains to be verified.'
  },
  {
    name: 'Bartle Gap support transfer',
    mile: 1447.531,
    coordinates: [-121.81993729434907, 41.17064891383052],
    cellCoverage: {
      verizon: 'none',
      att: 'none',
      tmobile: 'none'
    },
    satelliteCompatible: true,
    notes: 'Exact pickup/re-entry pin. Assume no cell service and coordinate with the tested two-way satellite communicator. This is a timed transfer point—not a campsite.'
  },
  {
    name: 'Alder / Star City camp',
    mile: 1456.689,
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
    mile: 1463.039,
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
    mile: 1472.497,
    coordinates: [-122.0606252, 41.1170914],
    cellCoverage: {
      verizon: 'unknown',
      att: 'unknown',
      tmobile: 'unknown'
    },
    satelliteCompatible: true,
    notes: 'Remote forest-road trailhead. Use the tested two-way satellite communicator for the pickup rendezvous and treat cellular service as unavailable until field-tested.'
  }
];

export const satelliteDevices = [
  {
    device: 'Compatible phone satellite features',
    features: ['Emergency escalation', 'Possible contact messaging', 'Location sharing where supported'],
    coverage: 'Eligibility varies by device, account, software, country, and open-sky conditions',
    cost: 'Check current manufacturer and carrier terms',
    notes: 'Useful personal fallback. It is not the shared team communications plan.',
    compatibility: 'Confirm on every hiker\'s actual phone before departure',
    trailNotes: 'Test outdoors before the trip; trees, terrain, and conditions can delay or block a connection.'
  },
  {
    device: 'Dedicated two-way satellite communicator',
    features: ['Two-way check-ins', 'SOS', 'Location sharing', 'Weather or tracking if included in the selected service'],
    coverage: 'Depends on the actual device, subscription, satellite network, and sky view',
    cost: 'Choose, subscribe, and test the exact unit before departure',
    notes: 'This is the required shared coordination path for the Day 3 transfer and Ash Camp pickup.',
    compatibility: 'Assign a primary owner and a backup owner',
    trailNotes: 'Send and acknowledge a real message with every team contact before the trip; save the protocol offline.'
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
