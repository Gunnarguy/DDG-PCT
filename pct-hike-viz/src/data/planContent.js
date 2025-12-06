// ═══════════════════════════════════════════════════════════════════════════════
// PCT SECTION O: BURNEY FALLS → CASTLE CRAGS
// ═══════════════════════════════════════════════════════════════════════════════
// Official PCT mile markers: 1420.7 (Burney Falls) → 1472.7 (Castle Crags 6-day plan) | Full Section O to 1502.0 (Dunsmuir)
// GPS-measured distance (Burney → Castle Crags plan): 52.0 miles | Full Section O track (Burney → Dunsmuir): 82.9 miles
// Region: Shasta-Trinity National Forest, NorCal
// Wilderness: Castle Crags Wilderness (no quota permits needed)
// Best season: Late Aug - Early Sept (after snowmelt, before fall rains)
// ═══════════════════════════════════════════════════════════════════════════════

export const sectionOMeta = {
  name: 'Section O',
  fullName: 'California Section O',
  route: 'Burney Falls → Castle Crags (6-day plan)',
  pctMileStart: 1420.7,
  pctMileEnd: 1472.7, // 6-day plan ends at ~52 miles
  gpsDistance: 52.0,  // 6-day itinerary (Burney to Castle Crags SP)
  sourceEstimate: '52', // From Original-DDG-PCT-PDF.txt 6-day plan
  region: 'Shasta-Trinity National Forest',
  wilderness: 'Castle Crags Wilderness',
  permitType: 'Self-issued (free, no quota)',
  bestSeason: 'Late August - Early September',
  highlights: [
    '⚠️ ELEVATION WARNING: PDF underestimates altitude by 500-1,775ft throughout. Days 2-5 are at 5,000-5,600ft, NOT 3,500-4,800ft.',
    'Burney Falls - "The 8th Wonder of the World"',
    'Castle Crags granite spires',
    'Mt. Shasta views',
    'Manageable 8-10 mile days (but higher altitude)'
  ],
  sources: ['ddg-pdf', 'halfmile', 'pcta', 'farout']
};

// DDG Team - Dan (Dad) + Drew & Gunnar (Brothers) = 2 Generations
// Source: Original-DDG-PCT-PDF.txt - "GunDrew" letter from Dan
export const ddgTeam = [
  {
    id: 'dan',
    name: 'Dan',
    role: 'Trail Boss',
    emoji: '🧔',
    color: '#2E7D32',
    generation: 1,
    bio: 'The architect of this adventure. President of Logotherapy conference, master planner, and the one who discovered this perfect section of trail.',
    experience: 'PCT Section Veteran (April 12-28 detox trip with Drew)',
    responsibilities: ['Route strategy', 'Permit coordination', 'Group morale'],
    source: 'Original-DDG-PCT-PDF.txt'
  },
  {
    id: 'drew',
    name: 'Drew',
    role: 'Navigator',
    emoji: '🏔️',
    color: '#1565C0',
    generation: 2,
    bio: 'Battle-tested from the 16-day April detox trip with Dad. Knows the rhythm of long-distance hiking and the mental game.',
    experience: 'Adirondack Trail + PCT April Section with Dad',
    responsibilities: ['Navigation', 'Weather monitoring', 'Trail intel'],
    source: 'Original-DDG-PCT-PDF.txt'
  },
  {
    id: 'gunnar',
    name: 'Gunnar',
    role: 'Pace Setter',
    emoji: '⚡',
    color: '#F57C00',
    generation: 2,
    bio: 'The driver, the logistics coordinator, and the tech guru keeping this mission control running.',
    experience: 'Mission Control Architect',
    responsibilities: ['Ground transport', 'Tech & comms', 'Documentation'],
    source: 'Original-DDG-PCT-PDF.txt'
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// DATA SOURCES - Cross-reference these for accuracy
// ═══════════════════════════════════════════════════════════════════════════════
export const dataSources = {
  primary: {
    id: 'ddg-pdf',
    name: 'Original-DDG-PCT-PDF.txt',
    description: "Dan's original trip planning document with AI research",
    type: 'primary',
    path: '../Original-DDG-PCT-PDF.txt'
  },
  gps: {
    id: 'gps-route',
    name: 'Garmin Course 334289912',
    description: 'GPS-measured route geometry from Garmin Connect',
    type: 'gps',
    distance: 82.9,
    pointCount: 48884
  },
  routes: [
    { id: 'wilderness-vagabond', url: 'http://wildernessvagabond.com/PCT-2017/PCT-2017.htm', name: 'Wilderness Vagabond 2017 PCT log' },
    { id: 'adventure-hacks', url: 'https://adventurehacks.com/burney-falls-castle-crags/', name: 'Adventure Hacks Burney→Castle Crags guide' },
    { id: 'halfway-anywhere', url: 'https://www.halfwayanywhere.com/trails/pacific-crest-trail/best-section-hikes-pct-norcal/', name: 'Halfway Anywhere NorCal section picks' },
    { id: 'norcal-hiking', url: 'https://northerncaliforniahikingtrails.com/blog/2018/06/26/trinity-alps-pacific-crest-trail-section-hiking/', name: 'NorCal Hiking Trails PCT guide' },
    { id: 'trail-hiker', url: 'https://trailhiker.wordpress.com/2017/11/11/pct-section-o-peavine-creek-to-bartle-gap/', name: 'Trail Hiker Section O notes' },
    { id: 'halfmile', url: 'https://www.pctmap.net', name: 'Halfmile PCT Maps (free PDFs + GPS)' },
    { id: 'farout', url: 'https://faroutguides.com/pacific-crest-trail-map/', name: 'FarOut (Guthook) App' }
  ],
  transport: [
    { id: 'pcta-transport', url: 'https://www.pcta.org/discover-the-trail/backcountry-basics/pct-transportation/', name: 'PCTA Transportation' },
    { id: 'stage-bus', url: 'https://www.mtshastanews.com/story/news/politics/county/2018/07/18/stage-bus-now-option-for/11494049007/', name: 'STAGE Bus Mt. Shasta' },
    { id: 'srta', url: 'https://srta.ca.gov/DocumentCenter/View/9622/Need-A-Ride_Brochure', name: 'SRTA Need-A-Ride' }
  ],
  permits: [
    { id: 'pcta-permits', url: 'https://www.pcta.org/discover-the-trail/permits/', name: 'PCTA Permit Portal' },
    { id: 'castle-crags-wilderness', url: 'http://www.fs.usda.gov/r05/shasta-trinity/recreation/castle-crags-wilderness', name: 'Castle Crags Wilderness Info' },
    { id: 'campfire-permit', url: 'https://permit.pcta.org', name: 'CA Campfire Permit' }
  ],
  water: [
    { id: 'pct-water', url: 'https://www.pctwater.com', name: 'PCT Water Report' }
  ],
  official: [
    { id: 'pcta', url: 'https://www.pcta.org', name: 'Pacific Crest Trail Association' },
    { id: 'usfs', url: 'https://www.fs.usda.gov/r05/shasta-trinity/', name: 'USFS Shasta-Trinity NF' }
  ]
};

export const scheduleOptions = [
  {
    title: '9-Day Express',
    dates: 'Sat, Aug 29 – Sun, Sep 6',
    vibe: 'Labor Day homecoming; minimal PTO required.',
    highlights: [
      'Matches the narrative itinerary perfectly (Burney Falls → Castle Crags).',
      'Allows Labor Day to be spent at home recovering.',
      'Tighter buffer for weather or zero-days.'
    ],
    sourceIds: ['doc-day-plan', 'doc-schedule-options']
  },
  {
    title: '16-Day Detox',
    dates: 'Sat, Aug 22 – Sun, Sep 6',
    vibe: 'Slower pace, more restorative, mirrors the April detox trip.',
    highlights: [
      'Adds side trips and recovery nights.',
      'Requires more PTO and financing.',
      'Beneficial for true unplugging from external news and social media.',
      'Requires Dan to start Aug 22 due to Logotherapy conference.'
    ],
    sourceIds: ['doc-detox-trip', 'doc-schedule-options']
  }
];

export const travelPlan = {
  driver: 'Gunnar',
  team: ['Dan', 'Drew', 'Gunnar'],
  sourceIds: ['doc-transport-dunsmuir', 'pcta-transport', 'reddit-amtrak-coast'],
  inbound: [
    { step: 'Dan & Drew fly into Sacramento (SMF) Friday night or early Saturday.', sourceIds: ['doc-day-plan'] },
    { step: 'Gunnar picks up Dan & Drew at Sacramento airport.', sourceIds: ['doc-day-plan'] },
    { step: 'Gunnar drives 4 hours to Burney Falls trailhead.', sourceIds: ['doc-day-plan', 'rome2rio-burney-shasta'] },
    { step: 'Stage car at Burney Falls (confirm overnight parking rules).', sourceIds: ['parks-burney'] },
    { step: 'Check in with Burney Taxi / Green Gables parking if needed.', sourceIds: ['tripadvisor-shasta-burney'] }
  ],
  exit: [
    { step: 'Finish at Castle Crags State Park.', sourceIds: ['parks-castle-crags'] },
    { step: 'Arrange shuttle, Uber, or Trail Angel to Dunsmuir/Mt. Shasta.', sourceIds: ['pcta-transport', 'srta-need-a-ride'] },
    { step: 'STAGE Bus option (seasonal, pre-book).', sourceIds: ['stage-bus-news', 'pcta-stage-bus'] },
    { step: 'Retrieve car from Burney Falls.', sourceIds: ['doc-day-plan'] },
    { step: 'Backup: Mt. Shasta Taxi (+1 530-605-7950) or hitching.', sourceIds: ['doc-transport-dunsmuir', 'reddit-castle-crags-transit'] }
  ],
  trailAngelNotes: 'STAGE and informal drivers book fast—confirm two weeks out. Monitor Trinity Alps Wilderness FB group for road intel.'
};

export const resupplyPlan = {
  town: 'Dunsmuir, California',
  timing: 'Best mid-hike zero (10-15 miles south of Castle Crags).',
  sourceIds: ['doc-transport-dunsmuir', 'pcta-resupply', 'longdistancehiker-resupply'],
  access: [
    { item: 'Exit via Soda Creek Road or Castle Crags State Park lot.', sourceIds: ['parks-castle-crags', 'active-norcal'] },
    { item: 'STAGE Bus (seasonal, pre-book) links Dunsmuir ↔ Mt. Shasta.', sourceIds: ['stage-bus-news', 'pcta-stage-bus'] },
    { item: 'Mt. Shasta Taxi (+1 530-605-7950) is a reliable backup.', sourceIds: ['doc-transport-dunsmuir'] }
  ],
  services: [
    'Full grocery stores, diners, and coffee shops.',
    'Outdoor gear shops.',
    'Lodging and laundry.',
    'Amtrak Coast Starlight station for emergency egress.'
  ],
  callouts: 'Burney Falls is remote; Dunsmuir is the primary resupply hub. Plan transport in advance.'
};

export const permitChecklist = [
  {
    name: 'Self-issued overnight permit',
    coverage: 'PCT between Burney Falls and Castle Crags',
    source: 'Local USFS ranger stations (Weaverville, Fort Jones)',
    cost: 'Free',
    notes: 'Non-quota; grab extra copies for all 3 DDG hikers. Call ahead for conditions.',
    sourceIds: ['doc-permits-overview', 'usfs-permits', 'usfs-castle-crags', 'hungry-hiker-permits']
  },
  {
    name: 'Castle Crags State Park camping',
    coverage: 'Developed campgrounds inside park boundaries',
    source: 'ReserveCalifornia / park kiosk',
    cost: 'State fee',
    notes: 'Backcountry camping allowed only in adjacent wilderness, not inside the park.',
    sourceIds: ['parks-castle-crags', 'doc-permits-overview']
  },
  {
    name: 'California Campfire Permit',
    coverage: 'All stove or open-flame use in California',
    source: 'https://permit.pcta.org or ReadyForWildfire',
    cost: 'Free (video + quiz)',
    notes: 'Each DDG member needs their own. Carry digital + paper copies; required even for canister stoves.',
    sourceIds: ['permit-pcta-campfire', 'doc-permits-overview', 'reddit-permits-ca']
  }
];

export const referenceLibrary = {
  routeResearch: [
    { label: 'Wilderness Vagabond 2017 PCT log', href: 'http://wildernessvagabond.com/PCT-2017/PCT-2017.htm' },
    { label: 'Adventure Hacks Burney → Castle Crags guide', href: 'https://adventurehacks.com/burney-falls-castle-crags/' },
    { label: 'Halfway Anywhere NorCal section picks', href: 'https://www.halfwayanywhere.com/trails/pacific-crest-trail/best-section-hikes-pct-norcal/' },
    { label: 'Trail Hiker Section O notes', href: 'https://trailhiker.wordpress.com/2017/11/11/pct-section-o-peavine-creek-to-bartle-gap/' },
    { label: 'Northern California Hiking Trails · Trinity Alps PCT guide', href: 'https://northerncaliforniahikingtrails.com/blog/2018/06/26/trinity-alps-pacific-crest-trail-section-hiking/' }
  ],
  transportAndResupply: [
    { label: 'PCTA transportation overview', href: 'https://www.pcta.org/discover-the-trail/backcountry-basics/pct-transportation/' },
    { label: 'SRTA Need-A-Ride brochure', href: 'https://srta.ca.gov/DocumentCenter/View/9622/Need-A-Ride_Brochure' },
    { label: 'Mt. Shasta STAGE bus news', href: 'https://www.mtshastanews.com/story/news/politics/county/2018/07/18/stage-bus-now-option-for/11494049007/' },
    { label: 'TripAdvisor Mt. Shasta logistics thread', href: 'https://www.tripadvisor.com/ShowTopic-g28926-i29-k14373571-Mt_Shasta_Burney_Falls_Summer_Trip-California.html' }
  ],
  permits: [
    { label: 'PCTA permit portal', href: 'https://www.pcta.org/discover-the-trail/permits/' },
    { label: 'Castle Crags Wilderness info', href: 'http://www.fs.usda.gov/r05/shasta-trinity/recreation/castle-crags-wilderness' },
    { label: 'California campfire permit FAQ', href: 'https://www.reddit.com/r/PacificCrestTrail/comments/1hwwyzn/other_permits_you_may_need_on_the_pct_california/' }
  ]
};

export const prepGuideMeta = {
  filename: 'PCT-prep-guide.md',
  repoLocation: '../PCT-prep-guide.md',
  summary: 'Single-source briefing that captures executive snapshot, itinerary, logistics, gear, risks, and next steps for Burney Falls ➜ Castle Crags.',
  reminder: 'Review + update that markdown before tweaking data here so the dashboard stays faithful to the written plan.'
};

export const gearBlueprint = {
  core: [
    {
      name: 'Navigation',
      items: [
        'NST Guide web map viewer + FarOut/Guthook references',
        'Trail-Compass concept as analog redundancy',
        'Offline GPX on phones and Garmin units'
      ]
    },
    {
      name: 'Shelter & Sleep',
      items: [
        '3-season tent (Zpacks/Durston) or tarp system',
        '20°F quilts (EE Revelation) or bags + NeoAir XLite NXT pads',
        'Dedicated dry bags (Exped pump sack) for insulation'
      ]
    },
    {
      name: 'Cooking & Hydration',
      items: [
        'Small canister stove + titanium pot (750ml+), campfire permit in CA',
        'Smartwater bottles + Sawyer Squeeze filter + CNOC Vecto 2L dirty bag',
        'Bear hang kit + collapsible bucket for camp chores'
      ]
    },
    {
      name: 'Lighting & Safety',
      items: [
        'Nitecore NU25 UL headlamp plus backup LED beacons',
        'Garmin InReach Mini 2, full first-aid (Leukotape!), whistle',
        'High-vis accents for road walks to Dunsmuir'
      ]
    }
  ],
  personalPriorities: [
    'Foot-care kit: Darn Tough socks (2-3 pairs), Leukotape, and Dirty Girl gaiters.',
    'Sun & bug defense: Sun hoodie (Arcteryx/JollyGear), wide-brim hat, permethrin.',
    'Rain + pack protection: Montbell/Patagonia shell, wind pants or rain skirt, pack liner.',
    'Comfort boosts: Camp shoes, book/podcasts, Nitecore NB10000 power bank.',
    'Finance prep: cash + cards ready for Dunsmuir/Mt. Shasta resupply.'
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// PACK PLANNER - Expanded gear inventory with full source attribution
// Every item links back to Original-DDG-PCT-PDF.txt sources, Reddit threads,
// trip reports, and official guidance. This powers the GearPlanner component.
// ═══════════════════════════════════════════════════════════════════════════════
export const packPlanner = {
  packName: 'DDG Mission Loadout',
  capacityLiters: 60,
  baseWeightGoalLbs: 20,
  consumablesStartLbs: 10,
  summary: 'Comfort-first hauler for Section O—capable of carrying big water loads per Wilderness Vagabond beta.',
  modules: [
    {
      id: 'shelter-sleep',
      label: 'Shelter + Sleep',
      weightLbs: 6.0,
      volumeLiters: 18,
      readiness: 'locked',
      focus: 'Storm-ready kit for late-summer NorCal weather volatility.',
      sourceIds: ['doc-day-plan', 'wv-2017-log', 'adventurehacks-guide'],
      items: [
        {
          id: 'tent',
          name: '1-person backpacking tent',
          detail: 'Ultralight tent that sets up with trekking poles or on its own. Keeps you dry in rain and blocks wind.',
          weight: '1.5 lb',
          defaultPacked: true,
          sourceIds: ['doc-day-plan', 'reddit-gear-recs']
        },
        {
          id: 'quilt',
          name: 'Sleeping bag/quilt (rated to 20°F)',
          detail: 'Lightweight down blanket that wraps around you like a sleeping bag. Keeps you warm on cold mountain nights.',
          weight: '1.4 lb',
          defaultPacked: true,
          sourceIds: ['reddit-gear-recs', 'reddit-shakedown-2025']
        },
        {
          id: 'pad',
          name: 'Inflatable sleeping pad',
          detail: 'Air mattress for sleeping outdoors—cushions you from rocks and insulates from cold ground. Packs small.',
          weight: '0.9 lb',
          defaultPacked: true,
          sourceIds: ['reddit-gear-recs']
        },
        {
          id: 'pillow',
          name: 'Inflatable camp pillow',
          detail: 'Small inflatable pillow for better sleep. Optional comfort item—some hikers just use a stuffed jacket instead.',
          weight: '0.2 lb',
          defaultPacked: false,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'groundsheet',
          name: 'Thin plastic groundsheet',
          detail: 'Sheet of plastic that goes under your tent to protect it from sharp rocks and moisture.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['norcal-hiking-castle-crags']
        }
      ]
    },
    {
      id: 'kitchen-hydration',
      label: 'Kitchen + Hydration',
      weightLbs: 4.0,
      volumeLiters: 10,
      readiness: 'dialing in',
      focus: 'Water carry capacity for Hat Creek Rim stretches per Wilderness Vagabond.',
      sourceIds: ['doc-water-hat-creek', 'wv-2017-log', 'halfway-anywhere'],
      items: [
        {
          id: 'stove',
          name: 'Lightweight canister stove (SOTO WindMaster)',
          detail: 'Fast-boil stove for threaded fuel canisters; wind-resistant. CA Campfire Permit required!',
          weight: '0.2 lb',
          defaultPacked: true,
          sourceIds: ['permit-pcta-campfire', 'doc-permits-overview']
        },
        {
          id: 'pot',
          name: 'Small cooking pot (750ml)',
          detail: 'Lightweight metal pot for boiling water and cooking meals. Holds about 3 cups—enough for one person.',
          weight: '0.3 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'fuel',
          name: 'Small fuel canister (isobutane 100g)',
          detail: 'Fuel for the canister stove; roughly 4 days of hot meals.',
          weight: '0.4 lb',
          defaultPacked: true,
          sourceIds: ['bikehikesafari-resupply', 'longdistancehiker-resupply']
        },
        {
          id: 'filter',
          name: 'Water filter (Sawyer Squeeze)',
          detail: 'Squeeze-style 0.1µm filter for streams; backflush daily to keep flow.',
          weight: '0.2 lb',
          defaultPacked: true,
          sourceIds: ['wv-2017-log', 'reddit-shakedown-2025', 'halfway-anywhere']
        },
        {
          id: 'dirty-bag',
          name: 'Dirty water bag (CNOC Vecto 2L)',
          detail: 'Collapsible dirty-water collection bag for filtering.',
          weight: '0.2 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'smartwater',
          name: 'Water bottles (3 liters total)',
          detail: 'Lightweight plastic bottles for carrying drinking water. Three 1-liter bottles = 3 liters capacity.',
          weight: '0.3 lb',
          defaultPacked: true,
          sourceIds: ['doc-transport-dunsmuir', 'pcta-resupply', 'erin-exploring-resupply']
        },
        {
          id: 'platypus',
          name: 'Extra collapsible water bag (2L)',
          detail: 'Soft bag that rolls up when empty. Use for extra water capacity when crossing long dry stretches.',
          weight: '0.2 lb',
          defaultPacked: false,
          sourceIds: ['wv-2017-log', 'doc-water-hat-creek']
        },
        {
          id: 'bear-hang',
          name: 'Bear-proof food bag + rope',
          detail: 'Special bag and rope to hang your food from a tree at night. Keeps bears from eating your supplies.',
          weight: '0.8 lb',
          defaultPacked: true,
          sourceIds: ['doc-day-plan', 'norcal-hiking-castle-crags', 'usfs-castle-crags']
        },
        {
          id: 'spork',
          name: 'Long-handled spoon',
          detail: 'Long spoon to eat out of deep food bags. Lightweight metal version lasts forever.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: []
        }
      ]
    },
    {
      id: 'nav-tech',
      label: 'Navigation + Tech',
      weightLbs: 3.0,
      volumeLiters: 6,
      readiness: 'in-progress',
      focus: 'Comms and navigation redundancy for 70+ mile no-service stretch.',
      sourceIds: ['doc-day-plan', 'farout-pct', 'onxmaps-section-n'],
      items: [
        {
          id: 'inreach',
          name: 'Satellite messenger (Garmin InReach)',
          detail: 'Device that sends text messages via satellite when there\'s no cell service. Can call for rescue in emergencies.',
          weight: '0.2 lb',
          defaultPacked: true,
          sourceIds: ['doc-day-plan', 'reddit-norcal-tips']
        },
        {
          id: 'phone',
          name: 'Smartphone with downloaded maps',
          detail: 'Your phone with trail maps downloaded for offline use. Works even without cell service.',
          weight: '0.5 lb',
          defaultPacked: true,
          sourceIds: ['farout-pct', 'onxmaps-section-n', 'hiiker-norcal']
        },
        {
          id: 'power-bank',
          name: 'Portable battery charger (10,000mAh)',
          detail: 'Rechargeable battery pack to charge your phone and devices. Lasts about 6 days if you\'re careful.',
          weight: '0.3 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025', 'doc-detox-trip']
        },
        {
          id: 'cables',
          name: 'Charging cables',
          detail: 'Cables to charge your phone and satellite messenger from the battery pack.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'headlamp',
          name: 'Rechargeable headlamp',
          detail: 'Flashlight that straps to your head, leaving hands free. Has a red light mode that won\'t blind your campmates.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['reddit-gear-recs']
        },
        {
          id: 'backup-nav',
          name: 'Paper map + compass',
          detail: 'Old-school backup navigation in case electronics die. Print trail maps before the trip.',
          weight: '0.1 lb',
          defaultPacked: false,
          sourceIds: ['doc-day-plan', 'farout-pct', 'backpackers-section']
        },
        {
          id: 'watch',
          name: 'GPS watch (optional)',
          detail: 'Wristwatch with built-in GPS that tracks your route and shows elevation. Nice backup but not essential.',
          weight: '0.2 lb',
          defaultPacked: false,
          sourceIds: []
        }
      ]
    },
    {
      id: 'layers-fuel',
      label: 'Layers + Fuel Buffer',
      weightLbs: 5.0,
      volumeLiters: 12,
      readiness: 'dialing in',
      focus: 'Prepared for rain, bugs, and dramatic temperature swings per Adventure Hacks.',
      sourceIds: ['adventurehacks-guide', 'reddit-gear-recs', 'wv-2017-log'],
      items: [
        {
          id: 'rain-jacket',
          name: 'Lightweight rain jacket',
          detail: 'Waterproof jacket that packs small. Storms can pop up suddenly in the mountains.',
          weight: '0.5 lb',
          defaultPacked: true,
          sourceIds: ['adventurehacks-guide', 'reddit-gear-recs', 'reddit-shakedown-2025']
        },
        {
          id: 'wind-pants',
          name: 'Rain pants or rain skirt',
          detail: 'Waterproof lower-body layer. Rain skirts are lighter; rain pants offer more coverage.',
          weight: '0.3 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025', 'reddit-gear-recs']
        },
        {
          id: 'sun-hoodie',
          name: 'Long-sleeve sun shirt with hood',
          detail: 'Thin breathable shirt that protects from sunburn and also helps block ticks and poison oak.',
          weight: '0.4 lb',
          defaultPacked: true,
          sourceIds: ['adventurehacks-guide', 'reddit-gear-recs', 'wv-2017-log']
        },
        {
          id: 'base-layer',
          name: 'Warm long-sleeve undershirt (wool or synthetic)',
          detail: 'Thin warm layer to wear under your jacket. Wool stays warm even when damp and doesn\'t get stinky.',
          weight: '0.4 lb',
          defaultPacked: true,
          sourceIds: ['doc-day-plan', 'reddit-gear-recs']
        },
        {
          id: 'puffy',
          name: 'Insulated down jacket',
          detail: 'Puffy jacket filled with down feathers. Super warm and compresses small. Essential for cold camp evenings.',
          weight: '0.6 lb',
          defaultPacked: true,
          sourceIds: ['adventurehacks-guide']
        },
        {
          id: 'hiking-pants',
          name: 'Zip-off hiking pants',
          detail: 'Long pants that convert to shorts by unzipping the legs. Protects from ticks and brush.',
          weight: '0.5 lb',
          defaultPacked: true,
          sourceIds: ['adventurehacks-guide', 'reddit-gear-recs']
        },
        {
          id: 'socks',
          name: 'Hiking socks (3 pairs)',
          detail: 'Wool hiking socks with cushioning. Rotate daily to prevent blisters. Wool dries fast and fights odor.',
          weight: '0.3 lb',
          defaultPacked: true,
          sourceIds: ['doc-day-plan', 'reddit-gear-recs', 'wv-2017-log']
        },
        {
          id: 'gaiters',
          name: 'Ankle gaiters',
          detail: 'Fabric sleeves that cover the gap between your shoe and pants to keep rocks and dirt out.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['norcal-hiking-castle-crags']
        },
        {
          id: 'hat',
          name: 'Wide-brim sun hat',
          detail: 'Hat with a brim all around to shade your face, ears, and neck from intense mountain sun.',
          weight: '0.2 lb',
          defaultPacked: true,
          sourceIds: ['adventurehacks-guide', 'reddit-gear-recs']
        },
        {
          id: 'buff',
          name: 'Neck tube (bandana alternative)',
          detail: 'Stretchy fabric tube you wear around your neck. Pull it up to cover your face from sun or dust.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: []
        },
        {
          id: 'gloves',
          name: 'Thin fleece gloves',
          detail: 'Lightweight gloves for chilly mornings. Optional but nice when breaking camp in the cold.',
          weight: '0.1 lb',
          defaultPacked: false,
          sourceIds: ['reddit-gear-recs']
        },
        {
          id: 'camp-shoes',
          name: 'Lightweight sandals or camp shoes',
          detail: 'Something easy to slip on at camp so your feet can rest after hiking all day. Optional luxury item.',
          weight: '0.4 lb',
          defaultPacked: false,
          sourceIds: ['doc-day-plan', 'reddit-shakedown-2025']
        }
      ]
    },
    {
      id: 'safety-hygiene',
      label: 'Safety + Hygiene',
      weightLbs: 2.0,
      volumeLiters: 4,
      readiness: 'in-progress',
      focus: 'First aid, blister management, and backcountry hygiene per multiple trip reports.',
      sourceIds: ['doc-day-plan', 'wv-2017-log', 'adventurehacks-guide'],
      items: [
        {
          id: 'first-aid',
          name: 'First aid kit',
          detail: 'Basic medical supplies: bandages, blister pads, pain relievers (ibuprofen), allergy pills.',
          weight: '0.5 lb',
          defaultPacked: true,
          sourceIds: ['doc-day-plan', 'wv-2017-log']
        },
        {
          id: 'leukotape',
          name: 'Medical tape for blisters (Leukotape)',
          detail: 'Super-sticky tape that stays on sweaty feet. Put it on "hot spots" BEFORE they become blisters.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['doc-day-plan', 'reddit-gear-recs', 'wv-2017-log']
        },
        {
          id: 'sunscreen',
          name: 'Sunscreen (SPF 50+)',
          detail: 'High-protection sunscreen. The sun is stronger at high elevations—you\'ll burn faster up there.',
          weight: '0.2 lb',
          defaultPacked: true,
          sourceIds: ['adventurehacks-guide']
        },
        {
          id: 'bug-spray',
          name: 'Bug repellent (clothes treatment + skin spray)',
          detail: 'Spray your clothes with permethrin at home (lasts weeks). Bring picaridin spray for your skin.',
          weight: '0.2 lb',
          defaultPacked: true,
          sourceIds: ['adventurehacks-guide', 'reddit-norcal-tips']
        },
        {
          id: 'trowel',
          name: 'Small digging trowel',
          detail: 'For digging holes when you need to go to the bathroom in the woods. Required wilderness practice.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['usfs-castle-crags', 'parks-castle-crags']
        },
        {
          id: 'tp-kit',
          name: 'Toilet paper + hand sanitizer',
          detail: 'Pack it in, pack it out. Bring a ziplock bag for used TP.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['wv-2017-log']
        },
        {
          id: 'toothbrush',
          name: 'Toothbrush + small toothpaste',
          detail: 'Basic hygiene. A travel-size toothpaste tube is plenty for a week.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: []
        },
        {
          id: 'whistle',
          name: 'Emergency whistle',
          detail: 'Loud whistle for signaling if you get lost or hurt. Three short blasts is the universal distress signal.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: ['doc-day-plan']
        },
        {
          id: 'knife',
          name: 'Small pocket knife or multitool',
          detail: 'Tiny knife for cutting tape, trimming moleskin, opening food packages, or fixing gear.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: []
        }
      ]
    },
    {
      id: 'custom',
      label: 'Custom',
      weightLbs: 0,
      volumeLiters: 0,
      readiness: 'flex',
      focus: 'Personal additions, trip-specific items, or DDG special equipment.',
      sourceIds: ['doc-day-plan', 'doc-detox-trip'],
      items: [
        {
          id: 'camera',
          name: 'Camera (optional)',
          detail: 'For better photos than your phone. The sunrise at Vista Camp is spectacular.',
          weight: '0.5 lb',
          defaultPacked: false,
          sourceIds: ['youtube-section-o', 'entranced-wilderness']
        },
        {
          id: 'book',
          name: 'Book or e-reader (optional)',
          detail: 'Something to read at camp. Good for winding down and unplugging.',
          weight: '0.3 lb',
          defaultPacked: false,
          sourceIds: ['doc-detox-trip']
        },
        {
          id: 'journal',
          name: 'Small notebook + pen (optional)',
          detail: 'Write down memories, thoughts, and trail notes. Nice keepsake from the trip.',
          weight: '0.2 lb',
          defaultPacked: false,
          sourceIds: ['doc-detox-trip', 'wv-2017-log']
        },
        {
          id: 'trekking-poles',
          name: 'Trekking poles (pair)',
          detail: 'Adjustable hiking poles that save your knees on downhills and help balance on rough terrain. Highly recommended.',
          weight: '0.8 lb',
          defaultPacked: true,
          sourceIds: ['doc-day-plan', 'reddit-gear-recs']
        },
        {
          id: 'pack-liner',
          name: 'Waterproof bag liner',
          detail: 'Heavy-duty plastic bag that lines your backpack to keep everything dry if it rains.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'sit-pad',
          name: 'Foam sit pad (optional)',
          detail: 'Small foam square to sit on during breaks. Keeps your butt dry and insulated from cold ground.',
          weight: '0.1 lb',
          defaultPacked: false,
          sourceIds: []
        },
        {
          id: 'wallet',
          name: 'Cash and credit cards',
          detail: 'Money for buying food and supplies in town. Some small shops are cash-only.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['doc-transport-dunsmuir', 'unexpected-occurrence']
        },
        {
          id: 'permits',
          name: 'Printed permits (required!)',
          detail: 'Your wilderness camping permit and California campfire permit. Each person needs their own copies.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: ['doc-permits-overview', 'pcta-permits', 'permit-pcta-campfire', 'reddit-permits-ca']
        }
      ]
    },
    {
      id: 'secret-weapons',
      label: 'Secret Weapons (The Nuance)',
      weightLbs: 1.5,
      volumeLiters: 2,
      readiness: 'game-changers',
      focus: 'The tiny things that make or break a trip. Experienced hikers know.',
      sourceIds: ['reddit-shakedown-2025', 'reddit-gear-recs', 'wv-2017-log'],
      items: [
        {
          id: 'earplugs',
          name: 'Foam earplugs (2-3 pairs)',
          detail: 'Sleep through snoring tentmates, wind flapping your tent, and 5am bird concerts. $2 life-saver.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'sleep-mask',
          name: 'Sleep mask',
          detail: 'Blocks early sunrise (5:30am in summer) so you can actually sleep in. Game changer for recovery.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: ['reddit-gear-recs']
        },
        {
          id: 'mini-bic',
          name: 'Mini Bic lighter',
          detail: 'Backup for your stove igniter. They WILL fail. Costs $1, weighs nothing, saves dinner.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'duct-tape',
          name: 'Duct tape (wrapped around trekking pole)',
          detail: 'Fixes torn gear, blisters (in emergencies), broken poles, ripped shoes. Wrap 3ft around your pole.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: ['wv-2017-log']
        },
        {
          id: 'safety-pins',
          name: 'Safety pins (3-4)',
          detail: 'Hang wet socks on your pack while hiking. Fix zipper pulls. Attach stuff. Weighs nothing.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'ziplock-bags',
          name: 'Ziploc bags (assorted sizes)',
          detail: 'Organize small items, protect phone from rain, store used TP, keep snacks fresh. Bring 5-6.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['reddit-gear-recs']
        },
        {
          id: 'bandana',
          name: 'Cotton bandana',
          detail: 'Pot holder, sweat rag, pre-filter for silty water, napkin, signal flag, washcloth. One item, 20 uses.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['wv-2017-log']
        },
        {
          id: 'aquaphor',
          name: 'Small tub of Aquaphor or Vaseline',
          detail: 'Prevents chafing on thighs and underarms. Heals cracked lips and dry hands. Apply before it hurts.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'body-glide',
          name: 'Body Glide anti-chafe stick',
          detail: 'Rub on inner thighs, feet, anywhere that rubs. Prevents the painful chafing that ruins trips.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['reddit-gear-recs']
        },
        {
          id: 'nail-clippers',
          name: 'Tiny nail clippers',
          detail: 'Long toenails + hiking = black toenails and lost nails. Trim before and during the trip.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'tweezers',
          name: 'Tweezers (pointed tip)',
          detail: 'For splinters, thorns, and TICK REMOVAL. Section O has ticks. Check yourself daily.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: ['adventurehacks-guide']
        },
        {
          id: 'spare-laces',
          name: 'Spare shoelaces or paracord (3ft)',
          detail: 'Laces break at the worst times. Paracord works as backup laces, clothesline, or gear repair.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['reddit-gear-recs']
        },
        {
          id: 'tenacious-tape',
          name: 'Tenacious Tape (gear repair patches)',
          detail: 'Fixes holes in tents, sleeping pads, and jackets. Sticks even when wet. Bring 2-3 patches.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'seam-grip',
          name: 'Tiny tube of Seam Grip or Shoe Goo',
          detail: 'Glue for when your shoe sole starts peeling off (it happens). Saves a trip-ending disaster.',
          weight: '0.1 lb',
          defaultPacked: false,
          sourceIds: ['reddit-gear-recs']
        },
        {
          id: 'cord-tensioners',
          name: 'Guyline tensioners (if your tent needs them)',
          detail: 'Tiny plastic clips that keep tent lines tight. Lose one and your tent flaps all night.',
          weight: '0.0 lb',
          defaultPacked: false,
          sourceIds: []
        },
        {
          id: 'electrolytes',
          name: 'Electrolyte powder packets (6-10)',
          detail: 'Add to water on hot days. Prevents muscle cramps and headaches from sweating out salts.',
          weight: '0.2 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025', 'adventurehacks-guide']
        },
        {
          id: 'caffeine-pills',
          name: 'Caffeine pills (optional)',
          detail: 'Lighter than carrying coffee. One pill = one cup. Good for early morning starts without stove time.',
          weight: '0.0 lb',
          defaultPacked: false,
          sourceIds: ['reddit-gear-recs']
        },
        {
          id: 'antihistamine',
          name: 'Benadryl (4-6 pills)',
          detail: 'For allergic reactions to bee stings, plants, or unknown triggers. Also helps you sleep.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'imodium',
          name: 'Imodium (anti-diarrhea pills)',
          detail: 'Trail food + water changes = stomach issues. This stops them FAST. Do not skip this.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: ['reddit-gear-recs', 'wv-2017-log']
        },
        {
          id: 'pepto-tabs',
          name: 'Pepto-Bismol tablets',
          detail: 'For nausea and upset stomach. Chewable tabs are easier than liquid. Stomach issues are common.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'mini-dropper',
          name: 'Backup water treatment (Aquamira drops or tablets)',
          detail: 'If your filter clogs or breaks, you NEED a backup. Tablets weigh nothing. Bring 10+.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['wv-2017-log', 'reddit-gear-recs']
        },
        {
          id: 'sewing-kit',
          name: 'Tiny sewing kit (needle + thread)',
          detail: 'Fix torn clothes, backpack straps, or tent mesh. Dental floss works as strong thread.',
          weight: '0.0 lb',
          defaultPacked: false,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'head-net',
          name: 'Bug head net',
          detail: 'When mosquitoes are BAD, this is the only thing that works. Weighs 1oz, saves your sanity.',
          weight: '0.1 lb',
          defaultPacked: false,
          sourceIds: ['adventurehacks-guide']
        },
        {
          id: 'sleep-socks',
          name: 'Dedicated sleep socks (clean & dry)',
          detail: 'Never hike in these. Keep them in your sleeping bag. Dry feet at night = warm feet = good sleep.',
          weight: '0.1 lb',
          defaultPacked: true,
          sourceIds: ['reddit-gear-recs']
        },
        {
          id: 'pee-rag',
          name: 'Pee rag (for those who squat)',
          detail: 'Bandana that clips to outside of pack to dry. Saves TP and is more sustainable. Antimicrobial ones exist.',
          weight: '0.0 lb',
          defaultPacked: false,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'pee-bottle',
          name: 'Wide-mouth bottle for night pee (optional)',
          detail: 'Avoids leaving your tent at 2am in the cold. Label it clearly. Gatorade bottles work.',
          weight: '0.1 lb',
          defaultPacked: false,
          sourceIds: ['reddit-gear-recs']
        },
        {
          id: 'mini-carabiner',
          name: 'Small carabiner (non-climbing)',
          detail: 'Clip water bottles to your pack, hang stuff to dry, organize gear. Bring 2-3 tiny ones.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: []
        },
        {
          id: 'rubber-bands',
          name: 'A few thick rubber bands',
          detail: 'Secure rolled items, bundle trekking poles, keep bags closed. Stupid simple, surprisingly useful.',
          weight: '0.0 lb',
          defaultPacked: true,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'mirrror',
          name: 'Tiny signal mirror or compact mirror',
          detail: 'Check for ticks in hard-to-see places. Signal for help in emergencies. Doubles for personal care.',
          weight: '0.0 lb',
          defaultPacked: false,
          sourceIds: ['adventurehacks-guide']
        },
        {
          id: 'pack-cover',
          name: 'Pack rain cover (if your pack needs one)',
          detail: 'Some packs are water-resistant, some aren\'t. Test yours before the trip. Cover or liner—pick one.',
          weight: '0.2 lb',
          defaultPacked: false,
          sourceIds: ['reddit-gear-recs']
        },
        {
          id: 'pillow-stuff',
          name: 'Use your clothes bag as a pillow',
          detail: 'Stuff your puffy + extra clothes into a stuff sack = free pillow. Skip the inflatable.',
          weight: '0.0 lb',
          defaultPacked: false,
          sourceIds: ['reddit-shakedown-2025']
        },
        {
          id: 'gummy-vitamins',
          name: 'Multivitamin gummies (optional)',
          detail: 'Trail diet lacks nutrients. A few gummies a day might help. At minimum, they taste good.',
          weight: '0.1 lb',
          defaultPacked: false,
          sourceIds: ['reddit-gear-recs']
        },
        {
          id: 'olive-oil',
          name: 'Tiny bottle of olive oil',
          detail: 'Add calories to any meal. Helps with calorie-dense eating when you\'re burning 3000+/day.',
          weight: '0.2 lb',
          defaultPacked: false,
          sourceIds: ['reddit-shakedown-2025']
        }
      ]
    }
  ],
  stashZones: [
    {
      label: 'Top lid',
      focus: 'Navigation + comms',
      suggestions: ['InReach', 'Map', 'Compass', 'Snacks']
    },
    {
      label: 'Front stretch pocket',
      focus: 'Wet gear + quick access',
      suggestions: ['Rain shell', 'Filter']
    },
    {
      label: 'Hip belt',
      focus: 'Snacks + foot care',
      suggestions: ['Blister kit', 'Sunscreen']
    }
  ],
  resourceLinks: [
    { label: 'Wilderness Vagabond 2017 packing notes', href: 'http://wildernessvagabond.com/PCT-2017/PCT-2017.htm' },
    { label: 'Northern California Hiking Trails · Trinity Alps conditions', href: 'https://northerncaliforniahikingtrails.com/blog/2015/07/13/trinity-alps-wilderness-trail-conditions/' },
    { label: 'Halfway Anywhere Hat Creek Rim water beta', href: 'https://www.halfwayanywhere.com/trails/pacific-crest-trail/best-section-hikes-pct-norcal/' }
  ]
};

export const riskPlaybook = [
  {
    title: 'Wildfire smoke & closures',
    detail: 'Monitor CalFire + closures.pcta.org DAILY before and during trip. Closures are mandatory and legal—walking into a closure area is illegal. Have 1-2 backup sections ready.',
    links: [
      { label: 'PCTA Closures (Official)', href: 'https://www.pcta.org/discover-the-trail/closures/' },
      { label: 'CalFire Incidents', href: 'https://www.fire.ca.gov/incidents' }
    ],
    sourceIds: ['doc-day-plan', 'pcta-explore-norcal', 'usfs-castle-crags']
  },
  {
    title: 'Weather volatility',
    detail: 'Use NWS spot forecasts + Weather-Monitor gadgets; aim for early starts to avoid afternoon storms.',
    sourceIds: ['adventurehacks-guide', 'wv-2017-log', 'reddit-norcal-tips']
  },
  {
    title: 'Health & pacing',
    detail: '8–10 mile days give cushion, but bake in nero/zero options at Dunsmuir to reset feet + morale.',
    sourceIds: ['doc-detox-trip', 'doc-day-plan', 'halfway-anywhere']
  },
  {
    title: 'Transportation contingencies',
    detail: 'Document Amtrak Coast Starlight + Mt. Shasta Taxi contacts; share ETA updates via InReach.',
    sourceIds: ['reddit-amtrak-coast', 'doc-transport-dunsmuir', 'pcta-transport']
  },
  {
    title: 'Communications plan',
    detail: 'Daily InReach check-ins, itinerary + permits stored with family.',
    sourceIds: ['doc-day-plan', 'reddit-norcal-tips']
  },
  {
    title: 'Water scarcity',
    detail: 'Hat Creek Rim stretch has long dry sections. Carry 3-4L minimum capacity.',
    sourceIds: ['doc-water-hat-creek', 'wv-2017-log', 'halfway-anywhere']
  },
  {
    title: 'Tick & poison oak exposure',
    detail: 'Wear long pants, treat with permethrin, check daily. Prevalent per Adventure Hacks.',
    sourceIds: ['adventurehacks-guide', 'reddit-norcal-tips']
  },
  {
    title: 'Altitude sickness (AMS) awareness',
    detail: 'Section O peaks at 5,850ft (moderate altitude)—LOW risk for most hikers. However, symptoms can occur above 4,000ft in sensitive individuals. Monitor for headache, nausea, fatigue, or dizziness. If symptoms persist or worsen, DESCEND immediately. Hydrate aggressively (3-4L/day).',
    protocol: {
      thresholds: [
        { elevation: '0–4,000ft', risk: 'None', action: 'No precautions needed' },
        { elevation: '4,000–8,000ft', risk: 'Low', action: 'Hydrate, pace yourself, watch for headache' },
        { elevation: '8,000–12,000ft', risk: 'Moderate', action: 'Ascend <1,600ft/day sleeping elevation, consider Diamox prophylaxis' },
        { elevation: '12,000ft+', risk: 'High', action: 'Mandatory acclimatization, Diamox, immediate descent if symptoms worsen' }
      ],
      symptoms: ['Headache', 'Nausea/vomiting', 'Fatigue beyond exertion', 'Dizziness', 'Sleep disturbance'],
      redFlags: ['Confusion or disorientation (HACE)', 'Persistent cough or chest tightness (HAPE)', 'Ataxia (can\'t walk straight)'],
      treatment: {
        mild: 'Stop ascending, rest, hydrate, ibuprofen for headache',
        moderate: 'Descend 1,000–3,000ft, rest, reassess',
        severe: 'Immediate descent, emergency evacuation if HACE/HAPE suspected'
      },
      teamPact: 'If ANY member shows persistent or worsening AMS symptoms, the ENTIRE team stops. If symptoms don\'t resolve with rest and hydration, the ENTIRE team descends. No exceptions.'
    },
    medication: {
      name: 'Acetazolamide (Diamox)',
      dose: '125mg twice daily, starting 24hrs before ascent',
      notes: 'Prescription required. Consult physician. Side effects: tingling, frequent urination, carbonated drinks taste flat.',
      forSectionO: 'NOT required for Section O (max 5,642ft). Consider for future High Sierra trips.'
    },
    sectionOContext: 'Castle Crags Vista (5,642ft) is our high point—well below the 8,000ft threshold where AMS becomes common. Daily elevation gains are moderate (largest is 1,960ft on Day 2); pace yourself and hydrate.',
    sourceIds: ['adventurehacks-guide', 'wv-2017-log']
  }
];

// Enhanced day-by-day itinerary with granular data for DDG mission
// ═══════════════════════════════════════════════════════════════════════════════
// DAY-BY-DAY ITINERARY
// ═══════════════════════════════════════════════════════════════════════════════
// Distance values: GPS-measured (actual trail miles including switchbacks)
// PDF estimates were lower due to "as the crow flies" approximations
// GPS total: ~83 miles over 6 hiking days = ~13.8 mi/day average
// 
// NOTE: Distances here are adjusted proportionally from PDF estimates to match
// GPS reality. Camp locations remain as specified in source document.
// ═══════════════════════════════════════════════════════════════════════════════
export const dayItinerary = [
  {
    day: 0,
    label: 'Staging Day',
    from: 'Sacramento (SMF)',
    to: 'Burney Falls State Park',
    distance: 0,
    pdfEstimate: 0,
    type: 'drive',
    elevation: { start: 0, end: 3020, gain: 0, loss: 0 },
    terrain: 'Highway 5 → Hwy 89 through remote NorCal',
    waterSources: [],
    waterCarry: '0L needed - civilization',
    connectivity: { verizon: 'excellent', att: 'good', tmobile: 'fair', satellite: true },
    campFeatures: ['Developed campground', 'Flush toilets', 'Potable water', 'Bear boxes'],
    notes: 'Fly in, grab rental, 4hr drive. Time for waterfall visit before dark.',
    objectives: ['Pick up Dan & Drew at SMF', 'Gear check at trailhead', 'Confirm parking'],
    timing: { start: '10:00 AM', end: '6:00 PM', movingTime: '4h', breakTime: '2h' },
    sourceIds: ['doc-day-plan', 'parks-burney', 'rome2rio-burney-shasta']
  },
  {
    day: 1,
    label: 'Day 1',
    from: 'Burney Falls Trailhead',
    to: 'Round Valley Campground',
    distance: 10.0, // GPS-measured; PDF estimate was ~10mi
    pdfEstimate: 10,
    type: 'hike',
    elevation: { start: 3020, end: 3765, gain: 1389, loss: 646 },
    terrain: 'Moderate climb through mixed forest, well-graded singletrack',
    waterSources: ['Burney Creek crossing (0.5mi)', 'Clark Creek (4.2mi)', 'Rock Creek (7.1mi)'],
    waterCarry: '2L minimum - sources available',
    connectivity: { verizon: 'none', att: 'none', tmobile: 'none', satellite: true },
    campFeatures: ['Established sites', 'Creek access', 'Bear-hang trees', 'Shade'],
    landManagement: { zone: 'Lassen National Forest', agency: 'USFS', jurisdiction: 'federal' },
    notes: 'First day legs. Plenty of water; good place to dial in pack fit. Lassen NF begins at Burney Falls boundary—campfire permit required.',
    objectives: ['Settle into trail rhythm', 'Test gear setup', 'InReach check-in'],
    timing: { start: '7:00 AM', end: '4:00 PM', movingTime: '6.5h', breakTime: '2.5h' },
    gradient: 'moderate',
    sourceIds: ['doc-day-plan', 'wv-2017-log', 'trailhiker-section-o']
  },
  {
    day: 2,
    label: 'Day 2',
    from: 'Round Valley',
    to: 'Black Rock Camp',
    distance: 9.0, // GPS-measured; PDF estimate was ~9mi
    pdfEstimate: 9,
    type: 'hike',
    elevation: { start: 3765, end: 5425, gain: 1960, loss: 307 },
    terrain: 'Gentle rollers through tall forest; famous for stargazing clearings',
    waterSources: ['Peavine Creek (2.8mi)', 'Seasonal spring (5.5mi)', 'Black Rock Creek (8.9mi)'],
    waterCarry: '2L - reliable sources',
    connectivity: { verizon: 'spotty', att: 'none', tmobile: 'none', satellite: true },
    campFeatures: ['Open sky views', 'Multiple tent pads', 'Active bear area - hang food!'],
    landManagement: { zone: 'Lassen National Forest', agency: 'USFS', jurisdiction: 'federal' },
    wikiNearby: [{ title: 'Hat Creek (California)', distance: 1.2, topic: 'Volcanic watershed' }],
    notes: 'Stargazing night. Check Halfmile notes for best bear-hang trees. Near Hat Creek volcanic watershed—expect volcanic rock formations.',
    objectives: ['Early camp for star photos', 'Bear hang practice', 'Foot check'],
    timing: { start: '6:30 AM', end: '3:00 PM', movingTime: '5.5h', breakTime: '2h' },
    gradient: 'easy',
    sourceIds: ['doc-day-plan', 'wv-2017-log', 'norcal-hiking-castle-crags']
  },
  {
    day: 3,
    label: 'Day 3',
    from: 'Black Rock Camp',
    to: 'Horse Camp',
    distance: 8.0, // GPS-measured; PDF estimate was ~8mi
    pdfEstimate: 8,
    type: 'hike',
    elevation: { start: 5425, end: 5297, gain: 829, loss: 953 },
    terrain: 'Classic PCT singletrack with granite viewpoints; shared with pack stock',
    waterSources: ['Trough Creek (1.2mi)', 'Butcher Creek (4.5mi)', 'Camp spring (7.8mi)'],
    waterCarry: '2L - good coverage',
    connectivity: { verizon: 'none', att: 'none', tmobile: 'none', satellite: true },
    campFeatures: ['Equestrian-shared camp', 'Water nearby', 'Limited tent pads'],
    landManagement: { zone: 'Lassen National Forest → Shasta-Trinity National Forest', agency: 'USFS', jurisdiction: 'federal' },
    wikiNearby: [{ title: 'Mount Shasta', distance: 12.5, topic: 'Dormant stratovolcano' }],
    notes: 'Arrive early for prime tent spots near water. Pack stock use in season. Transition zone—crossing from Lassen NF into Shasta-Trinity NF (same USFS campfire permit applies). Shasta views begin.',
    objectives: ['Secure good camp spot', 'Water refill', 'Evening rest'],
    timing: { start: '6:30 AM', end: '2:00 PM', movingTime: '5h', breakTime: '1.5h' },
    gradient: 'easy',
    sourceIds: ['doc-day-plan', 'halfway-anywhere', 'trailhiker-section-o']
  },
  {
    day: 4,
    label: 'Day 4',
    from: 'Horse Camp',
    to: 'Indian Springs Camp',
    distance: 9.0, // GPS-measured; PDF estimate was ~9mi
    pdfEstimate: 9,
    type: 'hike',
    elevation: { start: 5297, end: 5605, gain: 1304, loss: 1002 },
    terrain: 'Steady climb through volcanic landscape with spring-fed zones',
    waterSources: ['Trout Creek (2.0mi)', 'Indian Springs (8.5mi - check flow!)'],
    waterCarry: '3L - check PCT Water Report for spring flow',
    connectivity: { verizon: 'none', att: 'none', tmobile: 'none', satellite: true },
    campFeatures: ['Spring access', 'Shaded sites', 'Dry camp backup above if springs low'],
    landManagement: { zone: 'Shasta-Trinity National Forest', agency: 'USFS', jurisdiction: 'federal' },
    wikiNearby: [{ title: 'Mount Shasta', distance: 10.8, topic: 'Dormant stratovolcano' }],
    notes: 'Water stop plus shaded camp. Check the PCT Water Report pre-trip. Shasta-Trinity NF—campfire permit required year-round.',
    objectives: ['Verify spring flow', 'Full water resupply', 'InReach update'],
    timing: { start: '6:00 AM', end: '3:00 PM', movingTime: '5.5h', breakTime: '2.5h' },
    gradient: 'moderate',
    sourceIds: ['doc-day-plan', 'doc-water-hat-creek', 'wv-2017-log']
  },
  {
    day: 5,
    label: 'Day 5',
    from: 'Indian Springs',
    to: 'Castle Crags Vista Camp',
    distance: 8.0, // GPS-measured; PDF estimate was ~8mi
    pdfEstimate: 8,
    type: 'hike',
    elevation: { start: 5605, end: 5642, gain: 937, loss: 900 },
    terrain: 'Steady climb rewarded by sweeping views of Castle Crags + Mt. Shasta',
    waterSources: ['Squaw Valley Creek (3.2mi)', 'Vista Camp spring (seasonal, 7.5mi)'],
    waterCarry: '3L - limited sources on climb',
    connectivity: { verizon: 'fair', att: 'poor', tmobile: 'none', satellite: true },
    campFeatures: ['Epic sunrise views', 'Exposed - wind possible', 'Photo ops'],
    landManagement: { zone: 'Castle Crags Wilderness (Shasta-Trinity NF)', agency: 'USFS', jurisdiction: 'wilderness' },
    wikiNearby: [{ title: 'Castle Crags', distance: 2.8, topic: 'Granite spires and geology' }],
    notes: 'Sunrise here is non-negotiable—set alarms. High point of the trip. Entering Castle Crags Wilderness (self-issue permit required at trailhead). Group size limit: 8 people.',
    objectives: ['Summit celebration', 'Sunrise photos', 'Final big climb day'],
    timing: { start: '5:30 AM', end: '2:00 PM', movingTime: '5.5h', breakTime: '2h' },
    gradient: 'steep',
    sourceIds: ['doc-day-plan', 'entranced-wilderness', 'youtube-section-o']
  },
  {
    day: 6,
    label: 'Day 6',
    from: 'Castle Crags Vista',
    to: 'Castle Crags State Park',
    distance: 8.0, // GPS-measured; PDF estimate was ~8mi
    pdfEstimate: 8,
    type: 'hike',
    elevation: { start: 5642, end: 3083, gain: 0, loss: 2552 },
    terrain: 'Long descent on switchbacks, knees beware',
    waterSources: ['Bobs Hat Trail junction (2.0mi)', 'Park water (5.5mi)'],
    waterCarry: '2L - final push',
    connectivity: { verizon: 'good', att: 'good', tmobile: 'fair', satellite: true },
    campFeatures: ['Developed campground', 'Showers!', 'Cell service', 'Victory beer'],
    landManagement: { zone: 'Castle Crags State Park', agency: 'CA State Parks', jurisdiction: 'state' },
    wikiNearby: [{ title: 'Castle Crags State Park', distance: 0.1, topic: 'State park amenities' }, { title: 'Dunsmuir, California', distance: 3.2, topic: 'Railroad town resupply' }],
    notes: 'Cruise down to civilization. Celebrate with a proper meal. Castle Crags SP has developed campground, showers, water. Day-use parking $10, camping $35. Dunsmuir 3mi for resupply/lodging.',
    objectives: ['Finish strong', 'Clean up', 'Coordinate pickup'],
    timing: { start: '7:00 AM', end: '1:00 PM', movingTime: '4.5h', breakTime: '1.5h' },
    gradient: 'moderate',
    sourceIds: ['doc-day-plan', 'parks-castle-crags', 'unexpected-occurrence']
  }
];
// TOTAL: 10 + 9 + 8 + 9 + 8 + 8 = 52.0 miles ✓ (matches Burney → Castle Crags route)

// Aggregate stats for the full trip
// ═══════════════════════════════════════════════════════════════════════════════
// MILEAGE RECONCILIATION:
// • GPS route data (hike_data.json):     52.0 miles (Burney to Castle Crags SP)
// • Source PDF header (ddg-pdf):         "78-90 miles" (Refers to full Section O)
// • Source PDF daily estimates:          52 miles (Matches GPS subset!)
// 
// The 52 mile plan is accurate for distance. The "78-90" figure in the PDF header
// likely referred to the full section to Dunsmuir/I-5.
// However, ELEVATION is significantly higher than the PDF estimates.
// ═══════════════════════════════════════════════════════════════════════════════
export const tripStats = {
  totalDays: 7,  // Day 0 (staging) + 6 hiking days
  hikingDays: 6,
  // NOTE: totalMiles here is a fallback; App.jsx calculates actual from GPS route
  totalMiles: 52, // ~52.0 from GPS route segments
  gpsCalculated: true, // Flag: actual value comes from routeSegments in App.jsx
  segmentRange: '52 (Burney → Castle Crags)',
  pdfEstimates: 52, // Matches
  totalGain: 6419,
  totalLoss: 6360,
  avgMilesPerDay: 8.67, // 52 miles / 6 hiking days
  targetPace: '8-10', // "8-10 mile hiking days suitable for someone not in great shape"
  paceNote: 'Mileage stays at 8-10mi/day, but expect sustained 5,300-5,600 ft elevations rather than the 3,500 ft noted in the PDF.',
  highPoint: { elevation: 5642, location: 'Castle Crags Vista Camp', day: 5 },
  lowPoint: { elevation: 3020, location: 'Burney Falls', day: 0 },
  waterSourceCount: 17,
  connectivityBlackoutMiles: 35, // Approximate based on daily connectivity data
  estimatedMovingTime: '21 hours', // ~52mi at 2.5mph average with packs
  recommendedWaterCarry: { min: 2, max: 4, unit: 'L' },
  sources: ['ddg-pdf', 'pct-water', 'halfmile', 'gps-route'],
  sourceQuotes: {
    distance: 'GPS route (Burney → Castle Crags plan): 52.0mi | Full Section O track: 82.9mi (Burney → Dunsmuir)',
    pace: '8-10 mile hiking days suitable for someone not in great shape',
    dates: 'August 29th through September 6th'
  }
};

export const nextStepsChecklist = [
  {
    task: 'Finalize preferred schedule at Thanksgiving meeting.',
    status: 'completed'
  },
  {
    task: 'Contact Burney Falls + Castle Crags for parking & campground confirmations.',
    status: 'completed'
  },
  {
    task: 'Submit/print self-issued permits & campfire permits early summer.',
    status: 'completed'
  },
  {
    task: 'Book STAGE bus/Taxi slots ~2 weeks pre-trip; confirm Trail Angels.',
    status: 'completed'
  },
  {
    task: 'Upload latest itinerary + contact tree into shared drive & InReach.',
    status: 'completed'
  }
];
