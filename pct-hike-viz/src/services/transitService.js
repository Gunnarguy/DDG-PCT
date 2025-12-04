/**
 * Public Transit Service for PCT Section O
 * 
 * Provides transit information for trailhead access and resupply.
 * Based on nst.guide transit layer methodology.
 */

/**
 * Transit options for accessing Section O trailheads
 * All services within ~50km of trail per nst.guide methodology
 */
export const transitRoutes = [
  {
    id: 'redding-bart',
    type: 'train',
    name: 'Sacramento → Redding (Amtrak)',
    agency: 'Amtrak Coast Starlight',
    route: '11',
    stops: ['Sacramento', 'Redding'],
    frequency: '1x daily',
    relevantFor: 'Burney Falls trailhead access',
    notes: 'Connect to RABA bus in Redding',
    url: 'https://www.amtrak.com/coast-starlight-train',
    distance: '160 miles from Burney Falls',
    emoji: '🚆'
  },
  {
    id: 'raba-299',
    type: 'bus',
    name: 'Redding → Burney (RABA Route 5)',
    agency: 'Redding Area Bus Authority',
    route: '5',
    stops: ['Redding Transit Center', 'Burney', 'Fall River Mills'],
    frequency: 'Mon-Fri: 2x daily',
    relevantFor: 'Direct to Burney Falls SP',
    notes: 'Only public transit to Burney Falls area. Service suspended Sat-Sun.',
    url: 'https://rabaride.com/routes/route-5-burney/',
    distance: '1 mile from trailhead',
    cost: '$3.00',
    emoji: '🚌'
  },
  {
    id: 'stage-dunsmuir',
    type: 'bus',
    name: 'Dunsmuir → Redding (Stage Lines)',
    agency: 'Siskiyou Stage Lines',
    route: 'Dunsmuir-Redding',
    stops: ['Dunsmuir', 'Mt. Shasta City', 'Redding'],
    frequency: 'Mon-Fri: 2x daily',
    relevantFor: 'Exit strategy from Castle Crags/Dunsmuir',
    notes: 'Connect to Amtrak in Dunsmuir or continue to Redding airport',
    url: 'https://sisqstage.com/',
    distance: '5 miles from Castle Crags SP',
    cost: '$15.00',
    emoji: '🚌'
  },
  {
    id: 'greyhound-5',
    type: 'bus',
    name: 'I-5 Corridor Service',
    agency: 'Greyhound',
    route: 'Sacramento-Portland',
    stops: ['Redding', 'Mt. Shasta', 'Dunsmuir'],
    frequency: '3-4x daily',
    relevantFor: 'Long-distance connections',
    notes: 'Major intercity service along I-5',
    url: 'https://www.greyhound.com/',
    distance: 'Various',
    emoji: '🚌'
  }
];

/**
 * Ride share / shuttle options (not public transit but critical)
 */
export const shuttleServices = [
  {
    id: 'shasta-shuttle',
    name: 'Shasta Trinity Trails Association Shuttles',
    type: 'shuttle',
    notes: 'Volunteer trail angel shuttles. Reserve 2+ weeks ahead.',
    phone: 'Contact via PCTA',
    cost: 'Donation suggested',
    coverage: 'Burney-Dunsmuir corridor',
    emoji: '🚐'
  },
  {
    id: 'trail-angels',
    name: 'Local Trail Angels',
    type: 'informal',
    notes: 'Check Guthook/FarOut comments for current contacts. Always offer gas money.',
    cost: 'Gas money + tip',
    coverage: 'Variable',
    emoji: '😇'
  }
];

/**
 * Rental car / rideshare staging info
 */
export const rentalCarInfo = {
  airports: [
    {
      code: 'SMF',
      name: 'Sacramento International',
      distanceToBurney: '170 miles (3.5 hrs)',
      rentalAgencies: ['Enterprise', 'Hertz', 'Budget', 'Avis'],
      recommended: true,
      notes: 'Best option for direct car access. Fly in, drive to Burney, park at trailhead.'
    },
    {
      code: 'RDD',
      name: 'Redding Municipal',
      distanceToBurney: '50 miles (1 hr)',
      rentalAgencies: ['Enterprise', 'Avis'],
      recommended: true,
      notes: 'Closer but fewer flight options. Limited rental availability.'
    }
  ],
  parkingOptions: [
    {
      location: 'Burney Falls State Park',
      address: '24898 Highway 89, Burney, CA 96013',
      cost: '$10/day day-use fee',
      longTermPermit: 'Contact park office for 6+ day parking',
      security: 'Patrolled lot, relatively safe',
      notes: 'Official trailhead parking. Call ahead: (530) 335-2777'
    },
    {
      location: 'Castle Crags State Park',
      address: '20022 Castle Creek Rd, Castella, CA 96017',
      cost: '$10/day',
      longTermPermit: 'Contact for extended parking',
      security: 'State park lot',
      notes: 'Exit point parking. Call: (530) 235-2684'
    }
  ]
};

/**
 * Resupply town transit
 */
export const resupplyAccess = [
  {
    town: 'Burney',
    services: ['Grocery (Holiday Market)', 'Gas', 'Lodging', 'Post Office'],
    transitAccess: 'RABA Route 5 from Redding',
    trailDistance: '5 miles from PCT via road walk',
    notes: 'Main resupply for Section O. Limited hours on weekends.'
  },
  {
    town: 'Old Station',
    services: ['General Store', 'Post Office', 'Campground'],
    transitAccess: 'None - hitch or walk',
    trailDistance: 'On trail',
    notes: 'Hat Creek Resort general store. Very limited selection.'
  },
  {
    town: 'Dunsmuir',
    services: ['Full services', 'Brewery', 'Lodging', 'Grocery'],
    transitAccess: 'Stage Lines to Redding, Amtrak station',
    trailDistance: '1 mile from trail',
    notes: 'Excellent resupply town. Hiker-friendly. Ditch/flip supply point.'
  }
];

/**
 * Get transit recommendations based on origin
 * @param {string} origin - Starting city (Sacramento, San Francisco, or Rental Car)
 */
export const getTransitPlan = (origin) => {
  const plans = {
    'Sacramento': {
      routes: ['redding-bart', 'raba-299'],
      duration: '5-6 hours total',
      cost: '$50-70',
      steps: [
        'Fly into SMF or take Amtrak to Sacramento',
        'Amtrak Coast Starlight to Redding (3.5 hrs)',
        'RABA Route 5 to Burney (1.5 hrs)',
        'Taxi/trail angel to Burney Falls SP (5 mi)'
      ],
      notes: 'Most economical public transit option. Plan for weekday travel only (RABA doesn\'t run weekends).'
    },
    'San Francisco': {
      routes: ['redding-bart', 'raba-299'],
      duration: '7-8 hours',
      cost: '$80-100',
      steps: [
        'BART to Richmond, Capitol Corridor to Sacramento',
        'Amtrak Coast Starlight to Redding',
        'RABA Route 5 to Burney',
        'Final 5 miles via taxi/trail angel'
      ],
      notes: 'Long journey. Consider flying to RDD or renting car in Sacramento.'
    },
    'Rental Car': {
      duration: '3.5-4 hours drive',
      cost: '$60-80/day + gas',
      steps: [
        'Pick up at SMF or RDD',
        'Drive CA-299 to Burney',
        'Park at Burney Falls SP (confirm extended parking)',
        'Shuttle back at end or have pickup arranged'
      ],
      notes: 'Recommended approach. Gives flexibility for early starts and gear management.'
    }
  };
  
  return plans[origin] || plans['Rental Car'];
};

export default {
  transitRoutes,
  shuttleServices,
  rentalCarInfo,
  resupplyAccess,
  getTransitPlan
};
