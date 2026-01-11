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
    id: "diridon-redding",
    type: "train",
    name: "San Jose Diridon → Redding (Amtrak Coast Starlight 14)",
    agency: "Amtrak",
    route: "14 (northbound)",
    stops: [
      "San Jose Diridon",
      "Oakland Jack London",
      "Richmond",
      "Sacramento",
      "Redding",
    ],
    frequency: "1x daily",
    relevantFor:
      "Airport arrivals into SJC; walk/ride VTA 60 from SJC to Diridon",
    notes:
      "Often +30-90 minutes. Arrives Redding in evening; add last-mile car.",
    url: "https://www.amtrak.com/coast-starlight-train",
    distance: "Redding is ~60 miles from Burney Falls",
    emoji: "🚆",
  },
  {
    id: "sac-redding",
    type: "train",
    name: "Sacramento → Redding (Amtrak Coast Starlight)",
    agency: "Amtrak",
    route: "11 southbound / 14 northbound",
    stops: ["Sacramento", "Redding"],
    frequency: "1x daily",
    relevantFor: "SMF arrivals or Capitol Corridor transfers",
    notes: "Often +30-90 minutes. Arrives Redding mid-day northbound.",
    url: "https://www.amtrak.com/coast-starlight-train",
    distance: "160 miles from Burney Falls",
    emoji: "🚆",
  },
  {
    id: "sfo-bart-richmond",
    type: "rail",
    name: "SFO AirTrain → BART → Richmond",
    agency: "BART",
    route: "Yellow line",
    stops: ["SFO", "San Bruno", "San Francisco", "Downtown", "Richmond"],
    frequency: "Every ~15 minutes",
    relevantFor: "Connect to Coast Starlight northbound at Richmond",
    notes: "Stay on yellow line; allow buffer for Amtrak connection.",
    url: "https://www.bart.gov/schedules/byline",
    distance: "Richmond to Redding by rail ~180 miles",
    emoji: "🚇",
  },
  {
    id: "raba-299",
    type: "bus",
    name: "Redding → Burney (RABA Route 5)",
    agency: "Redding Area Bus Authority",
    route: "5",
    stops: ["Redding Transit Center", "Burney", "Fall River Mills"],
    frequency: "Mon-Fri: 2x daily",
    relevantFor: "Closest public transit to Burney Falls SP",
    notes: "Weekdays only; last stop is still ~1 mile from park entrance.",
    url: "https://rabaride.com/routes/route-5-burney/",
    distance: "1 mile from trailhead",
    cost: "$3.00",
    emoji: "🚌",
  },
  {
    id: "stage-dunsmuir",
    type: "bus",
    name: "Dunsmuir → Redding (Stage Lines)",
    agency: "Siskiyou Stage Lines",
    route: "Dunsmuir-Redding",
    stops: ["Dunsmuir", "Mt. Shasta City", "Redding"],
    frequency: "Mon-Fri: 2x daily",
    relevantFor: "Exit strategy from Castle Crags/Dunsmuir",
    notes: "Connect to Amtrak in Dunsmuir or continue to Redding airport",
    url: "https://sisqstage.com/",
    distance: "5 miles from Castle Crags SP",
    cost: "$15.00",
    emoji: "🚌",
  },
  {
    id: "greyhound-5",
    type: "bus",
    name: "I-5 Corridor Service",
    agency: "Greyhound",
    route: "Sacramento-Portland",
    stops: ["Redding", "Mt. Shasta", "Dunsmuir"],
    frequency: "3-4x daily",
    relevantFor: "Long-distance connections",
    notes: "Major intercity service along I-5",
    url: "https://www.greyhound.com/",
    distance: "Various",
    emoji: "🚌",
  },
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
      code: "SMF",
      name: "Sacramento International",
      distanceToBurney: "170 miles (3.5 hrs)",
      rentalAgencies: ["Enterprise", "Hertz", "Budget", "Avis"],
      recommended: true,
      notes:
        "Best option for direct car access. Fly in, drive to Burney, park at trailhead.",
    },
    {
      code: "RDD",
      name: "Redding Municipal",
      distanceToBurney: "50 miles (1 hr)",
      rentalAgencies: ["Enterprise", "Avis"],
      recommended: true,
      notes: "Closer but fewer flight options. Limited rental availability.",
    },
    {
      code: "SJC",
      name: "San Jose International",
      distanceToBurney: "260 miles (4.5-5.0 hrs)",
      rentalAgencies: [
        "Alamo",
        "Avis",
        "Budget",
        "Enterprise",
        "Hertz",
        "National",
        "Thrifty",
      ],
      recommended: true,
      notes:
        "Fastest Bay Area pickup if arriving at SJC. Straight shot to I-880/I-680 → I-80 → I-505 → I-5 → CA-299 → CA-89.",
    },
    {
      code: "SFO",
      name: "San Francisco International",
      distanceToBurney: "285 miles (4.75-5.5 hrs)",
      rentalAgencies: [
        "Alamo",
        "Avis",
        "Budget",
        "Enterprise",
        "Hertz",
        "National",
        "Thrifty",
      ],
      recommended: false,
      notes: "Use I-280 → I-680 routing to avoid US-101 traffic when possible.",
    },
  ],
  parkingOptions: [
    {
      location: "Burney Falls State Park",
      address: "24898 Highway 89, Burney, CA 96013",
      cost: "$10/day day-use fee",
      longTermPermit: "Contact park office for 6+ day parking",
      security: "Patrolled lot, relatively safe",
      notes: "Official trailhead parking. Call ahead: (530) 335-2777",
    },
    {
      location: "Castle Crags State Park",
      address: "20022 Castle Creek Rd, Castella, CA 96017",
      cost: "$10/day",
      longTermPermit: "Contact for extended parking",
      security: "State park lot",
      notes: "Exit point parking. Call: (530) 235-2684",
    },
  ],
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
    Sacramento: {
      routes: ["sac-redding", "raba-299"],
      duration: "5-6 hours total",
      cost: "$50-70",
      steps: [
        "Fly into SMF or take Amtrak to Sacramento",
        "Amtrak Coast Starlight to Redding (3.5 hrs)",
        "RABA Route 5 to Burney (1.5 hrs)",
        "Taxi/trail angel to Burney Falls SP (5 mi)",
      ],
      notes:
        "Most economical public transit option. Plan for weekday travel only (RABA doesn't run weekends).",
    },
    SJC: {
      routes: ["diridon-redding", "raba-299"],
      duration: "6.5-7.5 hours rail + last mile",
      cost: "$80-120",
      steps: [
        "SJC Arrivals → VTA Rapid 60 (or Uber) to San Jose Diridon (10-20 min)",
        "Coast Starlight 14 northbound to Redding (plan for delays)",
        "Short Uber/taxi to RDD rental counter or direct car pickup in Redding",
        "Drive CA-299E → CA-89N to Burney Falls (1:05)",
        "If no car: RABA Route 5 on weekdays, then 1-mile walk/ride to park",
      ],
      notes:
        "Best rail path for SJC arrivals. Last-mile rideshare east of Redding is unreliable—rental strongly preferred.",
    },
    SFO: {
      routes: ["sfo-bart-richmond", "sac-redding"],
      duration: "7-8.5 hours rail + last mile",
      cost: "$90-140",
      steps: [
        "SFO AirTrain → BART Yellow line to Richmond (60-70 min)",
        "Coast Starlight northbound from Richmond to Redding",
        "Short Uber/taxi to RDD rental counter or downtown Redding pickup",
        "Drive CA-299E → CA-89N to Burney Falls (1:05)",
        "Weekday-only fallback: RABA Route 5 to Burney, then taxi/walk to park",
      ],
      notes:
        "Add buffer for BART → Amtrak transfer. Consider renting at SFO and driving if timing is tight.",
    },
    Home: {
      duration: "4.75-5.25 hours drive",
      cost: "$50-90 fuel + parking",
      steps: [
        "Home base → I-880/I-680 → I-80 → I-505 → I-5 → CA-299E → CA-89N",
        "Gas/food at Vacaville then Redding (last major services)",
        "Download offline maps; CA-299 has spotty coverage",
        "Avoid night driving on CA-299 when possible (deer + work zones)",
      ],
      notes:
        "Use as Mikaela-drive plan or personal car if available; confirm Burney Falls extended parking before leaving the vehicle.",
    },
    "San Francisco": {
      routes: ["sfo-bart-richmond", "sac-redding"],
      duration: "7-8 hours",
      cost: "$80-100",
      steps: [
        "BART from SFO or downtown SF to Richmond",
        "Amtrak Coast Starlight to Redding",
        "Weekday-only: RABA Route 5 to Burney, then taxi/walk to park",
        "Otherwise grab rental/ride in Redding for CA-299E → CA-89N",
      ],
      notes:
        "Rail-heavy option; still needs rental or taxi for last mile. Consider direct rental if timing is tight.",
    },
    "Rental Car": {
      duration: "3.5-4 hours drive",
      cost: "$60-80/day + gas",
      steps: [
        "Pick up at SMF or RDD",
        "Drive CA-299 to Burney",
        "Park at Burney Falls SP (confirm extended parking)",
        "Shuttle back at end or have pickup arranged",
      ],
      notes:
        "Recommended approach. Gives flexibility for early starts and gear management.",
    },
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
