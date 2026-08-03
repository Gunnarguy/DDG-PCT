// ═══════════════════════════════════════════════════════════════════════════════
// PCT SECTION O: BURNEY FALLS → ASH CAMP
// ═══════════════════════════════════════════════════════════════════════════════
import { primaryItinerary, tripFacts } from './tripFacts';

// PCTA 2026 centerline/mile markers control distance and PCT-mile labels.
// USGS 3DEP controls the normalized elevation profile. Garmin exports are
// retained as comparison evidence only; they never control active trip math.
// Region: Shasta-Trinity National Forest, NorCal
// Best season: Late Aug - Early Sept (after snowmelt, before fall rains)
// ═══════════════════════════════════════════════════════════════════════════════

export const sectionOMeta = {
  name: 'Section O',
  fullName: 'California Section O',
  route: 'Burney Falls → Ash Camp (8-day plan)',
  pctMileStart: tripFacts.route.startPctMile,
  pctMileEnd: tripFacts.route.finishPctMile,
  officialDistance: tripFacts.route.officialMiles,
  gpsDistance: tripFacts.route.gpsMiles,
  sourceEstimate: `${tripFacts.route.officialMiles.toFixed(3)} PCTA miles / ${tripFacts.route.centerlineGeometryMiles.toFixed(3)} checked-in centerline geometry miles`,
  region: 'Shasta-Trinity National Forest',
  wilderness: 'No Castle Crags segment in the active trip',
  permitType: 'Local rules must be confirmed',
  bestSeason: 'Late August - Early September',
  highlights: [
    'ACTIVE ROUTE: 51.844 PCTA 2026 miles to the road-accessible Ash Camp finish.',
    'PRIVATE CORRIDOR: no camping from the screened USFS boundary to Bartle Gap; Day 3 is a supported, continuous 12.59-mile day-pack traverse.',
    'CAMP STATUS: the pre-private dry camp passes desktop ownership, setback, and slope screening but still needs an on-foot surface/capacity check.',
    'Burney Falls - "The 8th Wonder of the World"',
    'McCloud River and Ash Camp finish',
    'Mt. Shasta views',
    'Eight hiking days averaging 6.48 miles; the longest day is 12.59 miles with a timed Bartle Gap extraction'
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
    name: 'PCTA 2026 centerline + USGS 3DEP terrain',
    description: 'PCTA geometry is calibrated to the exact Burney Falls and Ash Camp mile markers; USGS 3DEP supplies the profile. Garmin exports are retained as corroboration.',
    type: 'terrain',
    distance: tripFacts.route.gpsMiles,
    officialDistance: tripFacts.route.officialMiles,
    userSuppliedFullTrackDistance: 80.826,
    legacyAppFullTrackDistance: 82.898,
    pointCount: 3345
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
    { id: 'pcta-ash-camp', url: 'https://explore.pcta.org/trailheads/ash-camp', name: 'PCTA Ash Camp Trailhead' },
    { id: 'mt-shasta-taxi', url: 'https://mtshastataxi.com/contact-us/', name: 'Mt. Shasta Taxi' },
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
    title: '8-Day Primary + Buffer',
    dates: 'Sat, Aug 29 – Sat, Sep 5, 2026 · Sep 6 contingency',
    vibe: 'Evidence-backed 51.844-mile Burney Falls to Ash Camp plan.',
    highlights: [
      'Eight camp-to-camp legs averaging 6.48 miles.',
      'Day 2 ends at a screened USFS dry camp before private timberland.',
      'Day 3 is a 12.59-mile day-pack traverse with exact Bartle Gap pickup and next-morning re-entry.',
      'The support driver, road/gate, pickup window, legal overnight, and no-contact fallback must be booked and field-verified.'
    ],
    sourceIds: ['doc-day-plan', 'doc-schedule-options']
  },
  {
    title: 'Future Extended Route',
    dates: 'Not scheduled',
    vibe: 'The supplied 80.826-mile Garmin source track and 82.898-mile legacy app crop are reference-only—not active trip options.',
    highlights: [
      'Not part of the August 29–September 5 trip or September 6 contingency.',
      'Preserved for a future 14–16 day itinerary.',
      'Requires new camps, water validation, pickup logistics, and PTO.'
    ],
    sourceIds: ['gps-route', 'doc-detox-trip']
  }
];

// Historical presentation copy retained for reference only. Active travel,
// access, and extraction facts come from the generated trip-operations bundle.
export const archivedTravelPlan = {
  driver: "Mikaela",
  team: ["Dan", "Drew", "Gunnar"],
  sourceIds: [
    "doc-transport-dunsmuir",
    "pcta-transport",
    "reddit-amtrak-coast",
  ],
  inbound: [
    {
      step: "Friday, August 28: the team-confirmed UA481 itinerary begins at 6:03 PM PDT / 8:03 PM CDT and is scheduled at SJC around 10:36 PM PDT; use United Flight Status for travel-day changes.",
      sourceIds: ["doc-day-plan"],
    },
    {
      step: "Mikaela collects the team and begins the selected same-night SJC-to-Burney approach. This crosses into August 29, so legal overnight staging and a driver-rest plan are mandatory.",
      sourceIds: ["doc-day-plan"],
    },
    {
      step: "Saturday, August 29: begin Day 1 only after the overnight road transfer, rest, food, water, legal staging, and the current park/closure check are complete.",
      sourceIds: ["pcta-transport"],
    },
    {
      step: "Reserve Burney Falls weekend vehicle entry if using the State Park access and confirm the exact trail connector.",
      sourceIds: ["parks-burney"],
    },
    {
      step: "Saturday, August 29: begin hiking only after sleep, breakfast, water, and a daylight route/closure check.",
      sourceIds: ["doc-day-plan"],
    },
  ],
  shortExit: {
    title: "Primary Ash Camp extraction",
    summary:
      "Ash Camp is the route endpoint at route mile 51.844 / PCTA 2026 mile 1472.497. Do not leave the PCT at an arbitrary rounded mile.",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=41.1171%2C-122.0606",
    coordinates: "41.1171, -122.0606",
    schedule:
      `The primary itinerary reaches Ash Camp on Day 8, Saturday, September 5 after ${tripFacts.route.officialMiles.toFixed(3)} official miles. The final leg is ${primaryItinerary.at(-1).distance.toFixed(3)} miles from Butcherknife Creek with about ${primaryItinerary.at(-1).elevation.loss.toLocaleString()} ft of descent.`,
    pickupWindow:
      "Primary September 5 rendezvous: 9:30 AM–12:30 PM after a 6:30–7:00 AM start. September 6 is the contingency pickup date. Mikaela waits at the shared Ash Camp pin; the hikers send satellite updates rather than relying on cell service.",
    road:
      "FS Road 38N11 is unpaved and can be rough; PCTA recommends high clearance. Mikaela should call the McCloud Ranger Station at 530-964-2184 during the week before pickup and again 24–48 hours before driving it. Do not commit the Kia Sportage if the ranger reports washouts, deep ruts, or high-clearance/4WD-only conditions.",
    backup:
      "Reserve Mt. Shasta Taxi at 530-859-3266 only after the dispatcher explicitly confirms an Ash Camp / FS 38N11 pickup in a suitable vehicle. A trail angel is a tertiary contingency, not the primary extraction contract.",
    comms: [
      "T-24 hours: hikers send expected departure camp, start time, and two-hour pickup window using the tested two-way satellite communicator.",
      "Morning of exit: send STARTING FOR ASH CAMP with battery status and route mile.",
      "At Butcherknife departure and roughly two miles from Ash: send a progress check-in with ETA.",
      "At the trailhead: send ARRIVED ASH CAMP. Mikaela does not enter the trail or keep driving beyond the agreed pin.",
      "If more than two hours late with no message, Mikaela stays at the agreed safe location and follows the overdue protocol; she does not search forest roads alone.",
    ],
    sourceIds: ["gps-route", "pcta-ash-camp", "usfs-mccloud-offices", "mt-shasta-taxi"],
  },
  exit: [
    {
      step: "Saturday, September 5: finish at Ash Camp, route mile 51.844 / PCTA 2026 mile 1472.497, and meet Mikaela at 41.1170914, -122.0606252.",
      sourceIds: ["pcta-ash-camp", "gps-route"],
    },
    {
      step: "Primary: Mikaela drives FS Road 38N11 only after the McCloud Ranger Station confirms it is suitable for the Kia Sportage.",
      sourceIds: ["pcta-ash-camp", "usfs-mccloud-offices"],
    },
    {
      step: "Backup: pre-book Mt. Shasta Taxi (530-859-3266) only after it confirms an Ash Camp / FS 38N11 pickup in a suitable vehicle.",
      sourceIds: ["mt-shasta-taxi"],
    },
    {
      step: "Trail angels are a tertiary named-and-confirmed backup; there is no dependable public transit at Ash Camp.",
      sourceIds: ["pcta-transport"],
    },
    {
      step: "Return to the Bay Area Saturday. Keep Sunday, September 6 available for a delayed pickup, recovery, and preparation for the early flight.",
      sourceIds: ["doc-day-plan"],
    },
    {
      step: "Confirmed return itinerary: UA1317 departs SJC at 6:40 AM PDT September 7 and is scheduled to end at 10:45 AM PDT / 12:45 PM CDT. Use United Flight Status for travel-day operations.",
      sourceIds: ["doc-day-plan"],
    },
  ],
  trailAngelNotes:
    "Use a known family driver or licensed, pre-booked service as the primary plan. Trail angels are volunteer community help with no guaranteed availability, vehicle, insurance, timing, or forest-road capability; use them only as a named and confirmed backup.",
};

export const resupplyPlan = {
  town: 'No on-route resupply',
  timing: 'Carry eight hiking days plus one emergency day of food; Ash Camp has no store.',
  sourceIds: ['pcta-resupply', 'pcta-ash-camp'],
  access: [
    { item: 'Primary extraction is Ash Camp via FS Road 38N11.', sourceIds: ['pcta-ash-camp'] },
    { item: 'McCloud is the nearest practical post-pickup service town.', sourceIds: ['usfs-mccloud-offices'] },
    { item: 'Mt. Shasta Taxi (530-859-3266) is a reservation-only backup after confirming forest-road capability.', sourceIds: ['mt-shasta-taxi'] }
  ],
  services: [
    'No food, lodging, charging, or dependable cellular service at Ash Camp.',
    'Outhouse and river access are listed at the trailhead.',
    'Post-hike food, fuel, and lodging require driving back toward McCloud or Mount Shasta.'
  ],
  callouts: 'This is a full-carry trip. Do not build the food plan around a Dunsmuir resupply that the active route never reaches.'
};

export const permitChecklist = [
  {
    name: 'Local overnight permit determination',
    coverage: '51.844-mile Burney Falls to Ash Camp trip; not eligible for the 500-mile PCT Long-distance Permit',
    source: 'Shasta-Trinity National Forest / PCTA local-permit guidance',
    cost: 'Verify',
    notes: 'Call the managing ranger district with the exact GPX and camps. Do not treat the original narrative’s self-issue claim as confirmed.',
    sourceIds: ['doc-permits-overview', 'usfs-permits', 'hungry-hiker-permits']
  },
  {
    name: 'Burney Falls arrival reservation',
    coverage: 'August 28 overnight staging / August 29 trail start',
    source: 'California State Parks / ReserveCalifornia',
    cost: '$10 day use + processing, or campground fee',
    notes: 'A campground reservation includes day use. Weekend day users need an advance reservation in the 2026 pilot; the late-night arrival still needs a legal sleep plan.',
    sourceIds: ['parks-burney', 'doc-day-plan']
  },
  {
    name: 'California Campfire Permit',
    coverage: 'Stove or fire use where the governing land manager allows it',
    source: 'PCTA / Ready for Wildfire / governing land manager',
    cost: 'Free (video + quiz)',
    notes: 'Each DDG member should carry a current permit before using a stove or fire on public land where one is required. It does not independently authorize use: current restrictions control, and the private timberland corridor prohibits campfires, stoves, ignition sources, and smoking.',
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
  summary: 'Evidence-backed briefing for the active 51.844-mile Burney Falls ➜ Ash Camp trip.',
  reminder: 'The controlling document is docs/2026-trip-source-of-truth.md; generated runtime data must remain consistent with it.'
};

// Historical overview retained as source material only. The interactive Gear
// tab uses packPlanner below; do not reintroduce this duplicate surface.
export const gearBlueprint = {
  core: [
    {
      name: 'Navigation',
      items: [
        'Offline trail map app + cached basemap (phone-based primary nav)',
        'Analog backup: compass + basic map/landmark awareness (Trail-Compass concept)',
        'Offline GPX tracks on phones and/or a dedicated GPS device (optional redundancy)'
      ]
    },
    {
      name: 'Shelter & Sleep',
      items: [
        '3-season solo shelter (tent or tarp) suitable for wind + light rain',
        '20°F sleep system: quilt/bag + insulated pad (target R-value ~3+ for shoulder-season comfort)',
        'Waterproof storage for insulation/sleep kit (dry bag or pack liner strategy)'
      ]
    },
    {
      name: 'Cooking & Hydration',
      items: [
        'Small canister stove + titanium pot (750ml+), campfire permit in CA',
        'Water carry: ~3L baseline capacity + squeeze-style filter (0.1µm) + 2L dirty-water bag',
        'Bear hang kit + collapsible bucket for camp chores'
      ]
    },
    {
      name: 'Lighting & Safety',
      items: [
        'Rechargeable headlamp with red mode + backup micro light (optional)',
        '2-way satellite messenger (SOS + check-in) + full first-aid + blister tape + whistle',
        'High-vis accents for road walks to Dunsmuir'
      ]
    }
  ],
  personalPriorities: [
    'Foot-care kit: 2–3 pairs wool/synthetic hiking socks, high-adhesion blister tape, low ankle gaiters (optional).',
    'Sun & bug defense: hooded UPF long-sleeve sun shirt, wide-brim hat, permethrin-treated clothing + picaridin on skin as needed.',
    'Rain + pack protection: lightweight waterproof shell + wind pants/rain skirt + pack liner or pack cover (pick one primary strategy).',
    'Comfort boosts: camp shoes, book/podcasts, 10,000 mAh power bank (target ~150–220g) sized to our recharge cadence.',
    'Finance prep: cash + cards ready for Dunsmuir/Mt. Shasta resupply.'
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// PACK PLANNER - Expanded gear inventory with full source attribution
// Every item links back to Original-DDG-PCT-PDF.txt sources, Reddit threads,
// trip reports, and official guidance. This powers the GearPlanner component.
// ═══════════════════════════════════════════════════════════════════════════════
export const packPlanner = {
  version: 4,
  packName: "DDG Mission Loadout",
  capacityLiters: 60,
  baseWeightGoalLbs: 20,
  consumablesStartLbs: 10,
  summary:
    "Comfort-first eight-day loadout with food contingency, verified water-carry capacity, and shared-gear assignment.",
  modules: [
    {
      id: "shelter-sleep",
      label: "Shelter + Sleep",
      weightLbs: 6.0,
      volumeLiters: 18,
      readiness: "locked",
      focus: "Storm-ready kit for late-summer NorCal weather volatility.",
      sourceIds: ["doc-day-plan", "wv-2017-log", "adventurehacks-guide"],
      items: [
        {
          id: "shared-tent-3p",
          name: "Shared 3-person backpacking tent",
          detail:
            "One shelter for all three hikers. Assign it to exactly one carrier, then split poles/stakes with another hiker if needed.",
          weight: "4.0 lb",
          specs: ["Sleeps 3", "Shared option", "Assign one primary carrier"],
          defaultPacked: false,
          sourceIds: ["doc-day-plan", "reddit-gear-recs"],
        },
        {
          id: "shared-tent-2p-a",
          name: "Shared 2-person tent (pair)",
          detail:
            "The two-person shelter when using a 2+1 setup. Assign it to one of the two occupants.",
          weight: "2.5 lb",
          specs: ["Sleeps 2", "2+1 shelter option"],
          defaultPacked: false,
          sourceIds: ["doc-day-plan", "reddit-gear-recs"],
        },
        {
          id: "tent",
          name: "1-person backpacking tent",
          detail:
            "Ultralight tent that sets up with trekking poles or on its own. Keeps you dry in rain and blocks wind.",
          weight: "1.5 lb",
          specs: ["1P", "3-season", "Wind + rain capable"],
          defaultPacked: true,
          sourceIds: ["doc-day-plan", "reddit-gear-recs"],
        },
        {
          id: "quilt",
          name: "Sleeping bag/quilt (rated to 20°F)",
          detail:
            "Lightweight down blanket that wraps around you like a sleeping bag. Keeps you warm on cold mountain nights.",
          weight: "1.4 lb",
          specs: ["20°F rating", "Compressible", "Sleep comfort priority"],
          defaultPacked: true,
          sourceIds: ["reddit-gear-recs", "reddit-shakedown-2025"],
        },
        {
          id: "pad",
          name: "Inflatable sleeping pad",
          detail:
            "Air mattress for sleeping outdoors—cushions you from rocks and insulates from cold ground. Packs small.",
          weight: "0.9 lb",
          specs: ["Insulated", "Packs small"],
          defaultPacked: true,
          sourceIds: ["reddit-gear-recs"],
        },
        {
          id: "pillow",
          name: "Inflatable camp pillow",
          detail:
            "Small inflatable pillow for better sleep. Optional comfort item—some hikers just use a stuffed jacket instead.",
          weight: "0.2 lb",
          defaultPacked: false,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "groundsheet",
          name: "Thin plastic groundsheet",
          detail:
            "Sheet of plastic that goes under your tent to protect it from sharp rocks and moisture.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["norcal-hiking-castle-crags"],
        },
      ],
    },
    {
      id: "kitchen-hydration",
      label: "Kitchen + Hydration",
      weightLbs: 4.0,
      volumeLiters: 10,
      readiness: "dialing in",
      focus:
        "Water carry capacity for the dry-camp and Day 3 support plan; current source flow controls the final liters.",
      sourceIds: ["doc-water-hat-creek", "wv-2017-log", "halfway-anywhere"],
      items: [
        {
          id: "stove",
          name: "Lightweight canister stove (threaded, wind-tolerant)",
          detail:
            "Threaded canister stove for fast boils in breezy conditions. Target ~2–4 oz stove weight. Carry a current California Campfire Permit where required, but do not use it where current restrictions or private-land rules prohibit ignition sources.",
          weight: "0.2 lb",
          specs: ["Threaded canister", "Wind-tolerant", "~2–4 oz target"],
          defaultPacked: true,
          sourceIds: ["permit-pcta-campfire", "doc-permits-overview"],
        },
        {
          id: "pot",
          name: "Small cooking pot (750ml)",
          detail:
            "Lightweight metal pot for boiling water and cooking meals. Holds about 3 cups—enough for one person.",
          weight: "0.3 lb",
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "fuel",
          name: "Small fuel canister (isobutane 100g)",
          detail: "Fuel for the canister stove; roughly 4 days of hot meals.",
          weightBucket: "consumable",
          weight: "0.4 lb",
          specs: ["100g class", "Consumable"],
          defaultPacked: true,
          sourceIds: ["bikehikesafari-resupply", "longdistancehiker-resupply"],
        },
        {
          id: "filter",
          name: "Water filter (squeeze-style, 0.1µm)",
          detail:
            "Squeeze-style hollow-fiber filter for streams. Prioritize a field-backflushable design to keep flow rate up.",
          weight: "0.2 lb",
          specs: ["0.1µm", "Field-backflushable"],
          defaultPacked: true,
          sourceIds: [
            "wv-2017-log",
            "reddit-shakedown-2025",
            "halfway-anywhere",
          ],
        },
        {
          id: "grayl",
          name: "Grayl water purifier bottle",
          detail:
            "Press-to-purify water bottle with built-in filter. Removes viruses, bacteria, and protozoa. Great backup/camp option.",
          weight: "0.7 lb",
          specs: ["Viral protection", "Press-to-filter", "16oz capacity"],
          defaultPacked: false,
          sourceIds: [
            "reddit-shakedown-2025",
            "wv-2017-log",
            "trailhiker-section-o",
          ],
        },
        {
          id: "water-tabs",
          name: "Water treatment tablets (backup)",
          detail:
            "Chemical purification tablets for emergency backup when filters fail. Lightweight insurance policy.",
          weight: "0.1 lb",
          specs: ["Chlorine dioxide or iodine", "20+ treatments"],
          defaultPacked: false,
          sourceIds: [
            "pcta-resupply",
            "doc-water-hat-creek",
            "trailhiker-section-o",
          ],
        },
        {
          id: "dirty-bag",
          name: "Dirty water bag (2L, wide-mouth)",
          detail:
            "Collapsible dirty-water collection bag for filtering. Wide-mouth + tough seams matter more than brand.",
          weight: "0.2 lb",
          specs: ["2L", "Wide-mouth"],
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "smartwater",
          name: "Water bottle (1L)",
          detail:
            "Lightweight plastic drink bottle used as your main water carry. Pack three 1-liter bottles for 3L baseline capacity.",
          qty: 3,
          weight: "0.3 lb",
          specs: ["3L total capacity", "Distributed carry"],
          defaultPacked: true,
          sourceIds: [
            "doc-transport-dunsmuir",
            "pcta-resupply",
            "erin-exploring-resupply",
          ],
        },
        {
          id: "platypus",
          name: "Extra collapsible water bag (2L)",
          detail:
            "Soft bag that rolls up when empty. Use for extra water capacity when crossing long dry stretches.",
          weight: "0.2 lb",
          defaultPacked: false,
          sourceIds: ["wv-2017-log", "doc-water-hat-creek"],
        },
        {
          id: "bear-hang",
          name: "Bear-proof food bag + rope",
          detail:
            "Special bag and rope to hang your food from a tree at night. Keeps bears from eating your supplies.",
          weight: "0.8 lb",
          defaultPacked: true,
          sourceIds: [
            "doc-day-plan",
            "norcal-hiking-castle-crags",
            "usfs-castle-crags",
          ],
        },
        {
          id: "spork",
          name: "Long-handled spoon",
          detail:
            "Long spoon to eat out of deep food bags. Lightweight metal version lasts forever.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: [],
        },
        {
          id: "tuna-packets",
          name: "Tuna/chicken packets",
          detail:
            "Shelf-stable protein packets. Dad swears by these—worked for him last time. Pack 2-3 per day for reliable protein.",
          weightBucket: "consumable",
          weight: "0.2 lb",
          specs: ["High protein", "No refrigeration needed", "Dad-approved"],
          defaultPacked: false,
          sourceIds: [
            "bikehikesafari-resupply",
            "longdistancehiker-resupply",
            "doc-detox-trip",
            "wv-2017-log",
          ],
        },
        {
          id: "protein-bars",
          name: "High-protein bars",
          detail:
            "Dense protein bars for quick calories. 15-20g protein per bar. Pack multiple per day.",
          weightBucket: "consumable",
          weight: "0.3 lb",
          specs: ["15-20g protein", "Dense calories"],
          defaultPacked: false,
          sourceIds: [
            "reddit-shakedown-2025",
            "halfway-anywhere",
            "trailhiker-section-o",
            "adventurehacks-guide",
          ],
        },
        {
          id: "jerky",
          name: "Beef/turkey jerky",
          detail:
            "Lightweight dried meat for trail snacking. High protein, low moisture. Lasts forever in a pack.",
          weightBucket: "consumable",
          weight: "0.2 lb",
          specs: ["Dried meat", "Long shelf life"],
          defaultPacked: false,
          sourceIds: ["bikehikesafari-resupply", "wv-2017-log", "doc-day-plan"],
        },
      ],
    },
    {
      id: "nav-tech",
      label: "Navigation + Tech",
      weightLbs: 3.0,
      volumeLiters: 6,
      readiness: "in-progress",
      focus: "Offline navigation and a tested two-way satellite plan for Day 3, Ash Camp, and conservative no-cell conditions.",
      sourceIds: ["doc-day-plan", "farout-pct", "onxmaps-section-n"],
      items: [
        {
          id: "inreach",
          name: "Satellite messenger (2-way + SOS)",
          detail:
            '2-way satellite messaging for check-ins when there\'s no cell service, plus SOS capability for emergencies. Subscription + battery management are part of the "weight" here.',
          weight: "0.2 lb",
          specs: ["2-way messaging", "SOS", "Battery plan"],
          defaultPacked: true,
          sourceIds: ["doc-day-plan", "reddit-norcal-tips"],
        },
        {
          id: "phone",
          name: "Smartphone with downloaded maps",
          detail:
            "Your phone with trail maps downloaded for offline use. Works even without cell service.",
          weight: "0.5 lb",
          defaultPacked: true,
          sourceIds: ["farout-pct", "onxmaps-section-n", "hiiker-norcal"],
        },
        {
          id: "power-bank",
          name: "Portable battery charger (10,000mAh)",
          detail:
            "Rechargeable battery pack to charge your phone and devices. Lasts about 6 days if you're careful.",
          weight: "0.3 lb",
          specs: ["10,000mAh class", "USB-C preferred"],
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025", "doc-detox-trip"],
        },
        {
          id: "cables",
          name: "Charging cables",
          detail:
            "Cables to charge your phone and satellite messenger from the battery pack.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "headlamp",
          name: "Rechargeable headlamp (red mode)",
          detail:
            "Hands-free light with red mode for camp. Aim for USB-rechargeable, a low-power setting for long nights, and a real lockout so it doesn't turn on in the pack.",
          weight: "0.1 lb",
          specs: ["Red mode", "USB-rechargeable", "Lockout"],
          defaultPacked: true,
          sourceIds: ["reddit-gear-recs"],
        },
        {
          id: "backup-nav",
          name: "Paper map + compass",
          detail:
            "Old-school backup navigation in case electronics die. Print trail maps before the trip.",
          weight: "0.1 lb",
          defaultPacked: false,
          sourceIds: ["doc-day-plan", "farout-pct", "backpackers-section"],
        },
        {
          id: "watch",
          name: "GPS watch (optional)",
          detail:
            "Wristwatch with built-in GPS that tracks your route and shows elevation. Nice backup but not essential.",
          weight: "0.2 lb",
          defaultPacked: false,
          sourceIds: [],
        },
      ],
    },
    {
      id: "layers-fuel",
      label: "Layers + Fuel Buffer",
      weightLbs: 5.0,
      volumeLiters: 12,
      readiness: "dialing in",
      focus:
        "Prepared for rain, bugs, and dramatic temperature swings per Adventure Hacks.",
      sourceIds: ["adventurehacks-guide", "reddit-gear-recs", "wv-2017-log"],
      items: [
        {
          id: "backpack",
          name: "Fitted backpack (50–65L)",
          detail:
            "Every hiker needs their own properly fitted pack. Confirm torso length, hip-belt fit, and comfort with the expected loaded weight.",
          weight: "3.0 lb",
          specs: ["One per person", "Fitted before trip", "Practice fully loaded"],
          defaultPacked: true,
          sourceIds: ["doc-day-plan", "reddit-gear-recs"],
        },
        {
          id: "trail-shoes",
          name: "Broken-in trail shoes",
          detail:
            "Every hiker needs their own proven footwear. Do not begin this trip in new or untested shoes.",
          weightBucket: "worn",
          weight: "1.5 lb",
          specs: ["One pair per person", "Broken in", "Room for foot swelling"],
          defaultPacked: true,
          sourceIds: ["reddit-gear-recs", "halfway-anywhere"],
        },
        {
          id: "underwear",
          name: "Hiking underwear",
          detail:
            "Quick-drying personal underwear; carry enough to rotate and wash while keeping one dry pair available.",
          weightBucket: "worn",
          qty: 2,
          weight: "0.3 lb",
          specs: ["Two per person", "Quick drying"],
          defaultPacked: true,
          sourceIds: ["reddit-gear-recs"],
        },
        {
          id: "rain-jacket",
          name: "Lightweight rain jacket",
          detail:
            "Waterproof jacket that packs small. Storms can pop up suddenly in the mountains.",
          weight: "0.5 lb",
          defaultPacked: true,
          sourceIds: [
            "adventurehacks-guide",
            "reddit-gear-recs",
            "reddit-shakedown-2025",
          ],
        },
        {
          id: "wind-pants",
          name: "Rain pants or rain skirt",
          detail:
            "Waterproof lower-body layer. Rain skirts are lighter; rain pants offer more coverage.",
          weight: "0.3 lb",
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025", "reddit-gear-recs"],
        },
        {
          id: "sun-hoodie",
          name: "Long-sleeve sun shirt with hood",
          detail:
            "Thin breathable shirt that protects from sunburn and also helps block ticks and poison oak.",
          weightBucket: "worn",
          weight: "0.4 lb",
          defaultPacked: true,
          sourceIds: [
            "adventurehacks-guide",
            "reddit-gear-recs",
            "wv-2017-log",
          ],
        },
        {
          id: "base-layer",
          name: "Warm long-sleeve undershirt (wool or synthetic)",
          detail:
            "Thin warm layer to wear under your jacket. Wool stays warm even when damp and doesn't get stinky.",
          weight: "0.4 lb",
          defaultPacked: true,
          sourceIds: ["doc-day-plan", "reddit-gear-recs"],
        },
        {
          id: "puffy",
          name: "Insulated down jacket",
          detail:
            "Puffy jacket filled with down feathers. Super warm and compresses small. Essential for cold camp evenings.",
          weight: "0.6 lb",
          defaultPacked: true,
          sourceIds: ["adventurehacks-guide"],
        },
        {
          id: "hiking-pants",
          name: "Zip-off hiking pants",
          detail:
            "Long pants that convert to shorts by unzipping the legs. Protects from ticks and brush.",
          weightBucket: "worn",
          weight: "0.5 lb",
          defaultPacked: true,
          sourceIds: ["adventurehacks-guide", "reddit-gear-recs"],
        },
        {
          id: "socks",
          name: "Hiking socks",
          detail:
            "Wool hiking socks with cushioning. Rotate daily to prevent blisters. Wool dries fast and fights odor.",
          qty: 3,
          weightEachLbs: 0.1,
          weightBucket: "worn",
          weight: "0.3 lb",
          specs: ["3 pairs", "Wool/synthetic"],
          defaultPacked: true,
          sourceIds: ["doc-day-plan", "reddit-gear-recs", "wv-2017-log"],
        },
        {
          id: "gaiters",
          name: "Ankle gaiters",
          detail:
            "Fabric sleeves that cover the gap between your shoe and pants to keep rocks and dirt out.",
          weightBucket: "worn",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["norcal-hiking-castle-crags"],
        },
        {
          id: "hat",
          name: "Wide-brim sun hat",
          detail:
            "Hat with a brim all around to shade your face, ears, and neck from intense mountain sun.",
          weightBucket: "worn",
          weight: "0.2 lb",
          defaultPacked: true,
          sourceIds: ["adventurehacks-guide", "reddit-gear-recs"],
        },
        {
          id: "buff",
          name: "Neck tube (bandana alternative)",
          detail:
            "Stretchy fabric tube you wear around your neck. Pull it up to cover your face from sun or dust.",
          weightBucket: "worn",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: [],
        },
        {
          id: "gloves",
          name: "Thin fleece gloves",
          detail:
            "Lightweight gloves for chilly mornings. Optional but nice when breaking camp in the cold.",
          weight: "0.1 lb",
          defaultPacked: false,
          sourceIds: ["reddit-gear-recs"],
        },
        {
          id: "camp-shoes",
          name: "Lightweight sandals or camp shoes",
          detail:
            "Something easy to slip on at camp so your feet can rest after hiking all day. Optional luxury item.",
          weight: "0.4 lb",
          defaultPacked: false,
          sourceIds: ["doc-day-plan", "reddit-shakedown-2025"],
        },
      ],
    },
    {
      id: "safety-hygiene",
      label: "Safety + Hygiene",
      weightLbs: 2.0,
      volumeLiters: 4,
      readiness: "in-progress",
      focus:
        "First aid, blister management, and backcountry hygiene per multiple trip reports.",
      sourceIds: ["doc-day-plan", "wv-2017-log", "adventurehacks-guide"],
      items: [
        {
          id: "personal-medications",
          name: "Personal prescriptions and medications",
          detail:
            "Each hiker carries their own required medicine plus a labeled trip buffer. The group first-aid kit is not a substitute.",
          weight: "0.2 lb",
          specs: ["One set per person", "Original labels", "Trip buffer"],
          defaultPacked: true,
          sourceIds: ["doc-day-plan"],
        },
        {
          id: "id-emergency-card",
          name: "Photo ID + emergency information card",
          detail:
            "Each hiker carries identification, allergies, medications, insurance details, and emergency contacts in a waterproof sleeve.",
          weight: "0.1 lb",
          specs: ["One per person", "Waterproof", "Emergency contacts"],
          defaultPacked: true,
          sourceIds: ["doc-day-plan"],
        },
        {
          id: "first-aid",
          name: "First aid kit",
          detail:
            "Basic medical supplies: bandages, blister pads, pain relievers (ibuprofen), allergy pills.",
          weight: "0.5 lb",
          defaultPacked: true,
          sourceIds: ["doc-day-plan", "wv-2017-log"],
        },
        {
          id: "leukotape",
          name: "High-adhesion medical tape for blisters",
          detail:
            'Super-sticky tape that stays on sweaty feet. Put it on "hot spots" BEFORE they become blisters. Test adhesion at home—some tapes fail when wet/sweaty.',
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["doc-day-plan", "reddit-gear-recs", "wv-2017-log"],
        },
        {
          id: "sunscreen",
          name: "Sunscreen (SPF 50+)",
          detail:
            "High-protection sunscreen. The sun is stronger at high elevations—you'll burn faster up there.",
          weight: "0.2 lb",
          defaultPacked: true,
          sourceIds: ["adventurehacks-guide"],
        },
        {
          id: "bug-spray",
          name: "Bug repellent (clothes treatment + skin spray)",
          detail:
            "Spray your clothes with permethrin at home (lasts weeks). Bring picaridin spray for your skin.",
          weight: "0.2 lb",
          defaultPacked: true,
          sourceIds: ["adventurehacks-guide", "reddit-norcal-tips"],
        },
        {
          id: "trowel",
          name: "Small digging trowel",
          detail:
            "For digging holes when you need to go to the bathroom in the woods. Required wilderness practice.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["usfs-castle-crags", "parks-castle-crags"],
        },
        {
          id: "tp-kit",
          name: "Toilet paper + hand sanitizer",
          detail:
            "Pack it in, pack it out. Bring a resealable odor-resistant bag for used TP.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["wv-2017-log"],
        },
        {
          id: "toothbrush",
          name: "Toothbrush + small toothpaste",
          detail:
            "Basic hygiene. A travel-size toothpaste tube is plenty for a week.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: [],
        },
        {
          id: "whistle",
          name: "Emergency whistle",
          detail:
            "Loud whistle for signaling if you get lost or hurt. Three short blasts is the universal distress signal.",
          weight: "0.0 lb",
          defaultPacked: true,
          sourceIds: ["doc-day-plan"],
        },
        {
          id: "knife",
          name: "Small pocket knife or multitool",
          detail:
            "Tiny knife for cutting tape, trimming moleskin, opening food packages, or fixing gear.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: [],
        },
      ],
    },
    {
      id: "custom",
      label: "Custom",
      weightLbs: 0,
      volumeLiters: 0,
      readiness: "flex",
      focus:
        "Personal additions, trip-specific items, or DDG special equipment.",
      sourceIds: ["doc-day-plan", "doc-detox-trip"],
      items: [
        {
          id: "camera",
          name: "Camera (optional)",
          detail:
            "For better photos than your phone. The sunrise at Vista Camp is spectacular.",
          weight: "0.5 lb",
          defaultPacked: false,
          sourceIds: ["youtube-section-o", "entranced-wilderness"],
        },
        {
          id: "book",
          name: "Book or e-reader (optional)",
          detail:
            "Something to read at camp. Good for winding down and unplugging.",
          weight: "0.3 lb",
          defaultPacked: false,
          sourceIds: ["doc-detox-trip"],
        },
        {
          id: "journal",
          name: "Small notebook + pen (optional)",
          detail:
            "Write down memories, thoughts, and trail notes. Nice keepsake from the trip.",
          weight: "0.2 lb",
          defaultPacked: false,
          sourceIds: ["doc-detox-trip", "wv-2017-log"],
        },
        {
          id: "trekking-poles",
          name: "Trekking pole",
          detail:
            "Adjustable hiking poles that save your knees on downhills and help balance on rough terrain. Highly recommended.",
          qty: 2,
          weight: "0.8 lb",
          defaultPacked: true,
          sourceIds: ["doc-day-plan", "reddit-gear-recs"],
        },
        {
          id: "pack-liner",
          name: "Waterproof bag liner",
          detail:
            "Heavy-duty plastic bag that lines your backpack to keep everything dry if it rains.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "sit-pad",
          name: "Foam sit pad (optional)",
          detail:
            "Small foam square to sit on during breaks. Keeps your butt dry and insulated from cold ground.",
          weight: "0.1 lb",
          defaultPacked: false,
          sourceIds: [],
        },
        {
          id: "wallet",
          name: "Cash and credit cards",
          detail:
            "Money for buying food and supplies in town. Some small shops are cash-only.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["doc-transport-dunsmuir", "unexpected-occurrence"],
        },
        {
          id: "permits",
          name: "Printed permits (required!)",
          detail:
            "Your wilderness camping permit and California campfire permit. Each person needs their own copies.",
          weight: "0.0 lb",
          defaultPacked: true,
          sourceIds: [
            "doc-permits-overview",
            "pcta-permits",
            "permit-pcta-campfire",
            "reddit-permits-ca",
          ],
        },
      ],
    },
    {
      id: "secret-weapons",
      label: "Secret Weapons (The Nuance)",
      weightLbs: 1.5,
      volumeLiters: 2,
      readiness: "game-changers",
      focus:
        "The tiny things that make or break a trip. Experienced hikers know.",
      sourceIds: ["reddit-shakedown-2025", "reddit-gear-recs", "wv-2017-log"],
      items: [
        {
          id: "earplugs",
          name: "Foam earplugs",
          detail:
            "Sleep through snoring tentmates, wind flapping your tent, and 5am bird concerts. $2 life-saver.",
          qty: 3,
          weight: "0.0 lb",
          specs: ["2–3 pairs"],
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "sleep-mask",
          name: "Sleep mask",
          detail:
            "Blocks early sunrise (5:30am in summer) so you can actually sleep in. Game changer for recovery.",
          weight: "0.0 lb",
          defaultPacked: true,
          sourceIds: ["reddit-gear-recs"],
        },
        {
          id: "mini-bic",
          name: "Mini lighter (backup ignition)",
          detail:
            "Backup for your stove igniter. They WILL fail. Costs $1, weighs nothing, saves dinner.",
          weight: "0.0 lb",
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "duct-tape",
          name: "Duct tape (wrapped around trekking pole)",
          detail:
            "Fixes torn gear, blisters (in emergencies), broken poles, ripped shoes. Wrap 3ft around your pole.",
          weight: "0.0 lb",
          defaultPacked: true,
          sourceIds: ["wv-2017-log"],
        },
        {
          id: "safety-pins",
          name: "Safety pins (3-4)",
          detail:
            "Hang wet socks on your pack while hiking. Fix zipper pulls. Attach stuff. Weighs nothing.",
          weight: "0.0 lb",
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "ziplock-bags",
          name: "Resealable bags (assorted sizes)",
          detail:
            "Organize small items, protect phone from rain, store used TP, keep snacks fresh. Bring 5-6.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["reddit-gear-recs"],
        },
        {
          id: "bandana",
          name: "Cotton bandana",
          detail:
            "Pot holder, sweat rag, pre-filter for silty water, napkin, signal flag, washcloth. One item, 20 uses.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["wv-2017-log"],
        },
        {
          id: "aquaphor",
          name: "Skin barrier ointment (petrolatum-based)",
          detail:
            "Prevents chafing on thighs/underarms and helps cracked lips/dry hands. Choose something that won't leak and won't freeze into a brick overnight.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "body-glide",
          name: "Anti-chafe balm/stick",
          detail:
            "Rub on inner thighs, feet, anywhere that rubs. Choose a solid stick or tiny tin that won't explode in heat.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["reddit-gear-recs"],
        },
        {
          id: "nail-clippers",
          name: "Tiny nail clippers",
          detail:
            "Long toenails + hiking = black toenails and lost nails. Trim before and during the trip.",
          weight: "0.0 lb",
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "tweezers",
          name: "Tweezers (pointed tip)",
          detail:
            "For splinters, thorns, and TICK REMOVAL. Section O has ticks. Check yourself daily.",
          weight: "0.0 lb",
          defaultPacked: true,
          sourceIds: ["adventurehacks-guide"],
        },
        {
          id: "spare-laces",
          name: "Spare shoelaces or paracord (3ft)",
          detail:
            "Laces break at the worst times. Paracord works as backup laces, clothesline, or gear repair.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["reddit-gear-recs"],
        },
        {
          id: "tenacious-tape",
          name: "Adhesive gear repair patches",
          detail:
            "Fixes holes in tents, sleeping pads, and jackets. Sticks even when wet. Bring 2-3 patches.",
          weight: "0.0 lb",
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "seam-grip",
          name: "Flexible gear/shoe adhesive (tiny tube)",
          detail:
            "Glue for when your shoe sole starts peeling off (it happens). Look for a flexible urethane-style adhesive that bonds to rubber + fabric.",
          weight: "0.1 lb",
          defaultPacked: false,
          sourceIds: ["reddit-gear-recs"],
        },
        {
          id: "cord-tensioners",
          name: "Guyline tensioners (if your tent needs them)",
          detail:
            "Tiny plastic clips that keep tent lines tight. Lose one and your tent flaps all night.",
          weight: "0.0 lb",
          defaultPacked: false,
          sourceIds: [],
        },
        {
          id: "electrolytes",
          name: "Electrolyte powder packets (6-10)",
          detail:
            "Add to water on hot days. Prevents muscle cramps and headaches from sweating out salts.",
          weight: "0.2 lb",
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025", "adventurehacks-guide"],
        },
        {
          id: "caffeine-pills",
          name: "Caffeine pills (optional)",
          detail:
            "Lighter than carrying coffee. One pill = one cup. Good for early morning starts without stove time.",
          weight: "0.0 lb",
          defaultPacked: false,
          sourceIds: ["reddit-gear-recs"],
        },
        {
          id: "antihistamine",
          name: "Antihistamine tablets (4-6)",
          detail:
            "For allergic reactions to bee stings, plants, or unknown triggers. Pick a type you tolerate (some cause drowsiness).",
          weight: "0.0 lb",
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "imodium",
          name: "Anti-diarrheal tablets (loperamide)",
          detail:
            "Trail food + water changes = stomach issues. This stops them FAST. Do not skip this.",
          weight: "0.0 lb",
          defaultPacked: true,
          sourceIds: ["reddit-gear-recs", "wv-2017-log"],
        },
        {
          id: "pepto-tabs",
          name: "Upset-stomach tablets (bismuth)",
          detail:
            "For nausea and upset stomach. Chewable tabs are easier than liquid. Stomach issues are common.",
          weight: "0.0 lb",
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "mini-dropper",
          name: "Backup water treatment (chlorine dioxide)",
          detail:
            "If your filter clogs or breaks, you NEED a backup. Tablets weigh nothing. Bring 10+.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["wv-2017-log", "reddit-gear-recs"],
        },
        {
          id: "sewing-kit",
          name: "Tiny sewing kit (needle + thread)",
          detail:
            "Fix torn clothes, backpack straps, or tent mesh. Dental floss works as strong thread.",
          weight: "0.0 lb",
          defaultPacked: false,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "head-net",
          name: "Bug head net",
          detail:
            "When mosquitoes are BAD, this is the only thing that works. Weighs ~1 oz, saves your sanity.",
          weight: "0.1 lb",
          defaultPacked: false,
          sourceIds: ["adventurehacks-guide"],
        },
        {
          id: "sleep-socks",
          name: "Dedicated sleep socks (clean & dry)",
          detail:
            "Never hike in these. Keep them in your sleeping bag. Dry feet at night = warm feet = good sleep.",
          weight: "0.1 lb",
          defaultPacked: true,
          sourceIds: ["reddit-gear-recs"],
        },
        {
          id: "pee-rag",
          name: "Pee rag (for those who squat)",
          detail:
            "Bandana that clips to outside of pack to dry. Saves TP and is more sustainable. Antimicrobial ones exist.",
          weight: "0.0 lb",
          defaultPacked: false,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "pee-bottle",
          name: "Wide-mouth bottle for night pee (optional)",
          detail:
            "Avoids leaving your tent at 2am in the cold. Label it clearly. Any wide-mouth sports drink bottle works.",
          weight: "0.1 lb",
          defaultPacked: false,
          sourceIds: ["reddit-gear-recs"],
        },
        {
          id: "mini-carabiner",
          name: "Small carabiner (non-climbing)",
          detail:
            "Clip water bottles to your pack, hang stuff to dry, organize gear. Bring 2-3 tiny ones.",
          weight: "0.0 lb",
          defaultPacked: true,
          sourceIds: [],
        },
        {
          id: "rubber-bands",
          name: "A few thick rubber bands",
          detail:
            "Secure rolled items, bundle trekking poles, keep bags closed. Stupid simple, surprisingly useful.",
          weight: "0.0 lb",
          defaultPacked: true,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "mirrror",
          name: "Tiny signal mirror or compact mirror",
          detail:
            "Check for ticks in hard-to-see places. Signal for help in emergencies. Doubles for personal care.",
          weight: "0.0 lb",
          defaultPacked: false,
          sourceIds: ["adventurehacks-guide"],
        },
        {
          id: "pack-cover",
          name: "Pack rain cover (if your pack needs one)",
          detail:
            "Some packs are water-resistant, some aren't. Test yours before the trip. Cover or liner—pick one.",
          weight: "0.2 lb",
          defaultPacked: false,
          sourceIds: ["reddit-gear-recs"],
        },
        {
          id: "pillow-stuff",
          name: "Use your clothes bag as a pillow",
          detail:
            "Stuff your puffy + extra clothes into a stuff sack = free pillow. Skip the inflatable.",
          weight: "0.0 lb",
          defaultPacked: false,
          sourceIds: ["reddit-shakedown-2025"],
        },
        {
          id: "gummy-vitamins",
          name: "Multivitamin gummies (optional)",
          detail:
            "Trail diet lacks nutrients. A few gummies a day might help. At minimum, they taste good.",
          weight: "0.1 lb",
          defaultPacked: false,
          sourceIds: ["reddit-gear-recs"],
        },
        {
          id: "olive-oil",
          name: "Tiny bottle of olive oil",
          detail:
            "Add calories to any meal. Helps with calorie-dense eating when you're burning 3000+/day.",
          weight: "0.2 lb",
          defaultPacked: false,
          sourceIds: ["reddit-shakedown-2025"],
        },
      ],
    },
  ],
  stashZones: [
    {
      label: "Top lid",
      focus: "Navigation + comms",
      suggestions: ["Satellite messenger", "Map", "Compass", "Snacks"],
    },
    {
      label: "Front stretch pocket",
      focus: "Wet gear + quick access",
      suggestions: ["Rain shell", "Filter"],
    },
    {
      label: "Hip belt",
      focus: "Snacks + foot care",
      suggestions: ["Blister kit", "Sunscreen"],
    },
  ],
  resourceLinks: [
    {
      label: "Wilderness Vagabond 2017 packing notes",
      href: "http://wildernessvagabond.com/PCT-2017/PCT-2017.htm",
    },
    {
      label: "Northern California Hiking Trails · Trinity Alps conditions",
      href: "https://northerncaliforniahikingtrails.com/blog/2015/07/13/trinity-alps-wilderness-trail-conditions/",
    },
    {
      label: "Halfway Anywhere Hat Creek Rim water beta",
      href: "https://www.halfwayanywhere.com/trails/pacific-crest-trail/best-section-hikes-pct-norcal/",
    },
  ],
};

// Historical risk notes retained for research provenance. The active Field tab
// uses the generated Field Brief plus live condition snapshots instead.
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
    detail: 'Document Amtrak Coast Starlight + Mt. Shasta Taxi contacts; share ETA updates via satellite messenger when needed.',
    sourceIds: ['reddit-amtrak-coast', 'doc-transport-dunsmuir', 'pcta-transport']
  },
  {
    title: 'Communications plan',
    detail: 'Daily check-ins via satellite messenger (or equivalent), itinerary + permits stored with family.',
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
    detail: `The USGS 3DEP terrain profile peaks at approximately ${tripFacts.route.highPointFeet.toLocaleString()}ft (moderate altitude)—low AMS risk for most hikers. However, symptoms can occur in sensitive individuals. Monitor for headache, nausea, fatigue, or dizziness. If symptoms persist or worsen, descend and seek medical guidance.`,
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
      forSectionO: `Not routinely indicated for this approximately ${tripFacts.route.highPointFeet.toLocaleString()}ft route. Any medication decision belongs with a clinician who knows the hiker.`
    },
    sectionOContext: `The USGS 3DEP high point is approximately ${tripFacts.route.highPointFeet.toLocaleString()}ft—below the 8,000ft threshold where AMS becomes more common. The largest daily climb is approximately ${Math.max(...primaryItinerary.map((day) => day.elevation.gain)).toLocaleString()}ft on Day 2; pace conservatively and hydrate.`,
    sourceIds: ['adventurehacks-guide', 'wv-2017-log']
  }
];

// Enhanced day-by-day itinerary with granular data for DDG mission
// ═══════════════════════════════════════════════════════════════════════════════
// DAY-BY-DAY ITINERARY
// ═══════════════════════════════════════════════════════════════════════════════
// Historical narrative values only. The active itinerary is generated from
// tripFacts.js using the active Ash Camp route and eight hiking days.
// ═══════════════════════════════════════════════════════════════════════════════
// Retained as historical context from Dan's narrative. Its place names and
// camp claims are not used by the active GPS-backed Ash Camp itinerary.
const legacySixDayNarrative = [
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
    to: 'Castle Crags (Soda Creek Road Exit)',
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
    notes: 'Cruise down to civilization. Exit at Soda Creek Road (I-5 Exit 722) where the PCT crosses the road. Option A: Mikaela picks you up directly in the Sportage. Option B: Pre-arrange a Local Trail Angel or call Mt. Shasta Taxi to shuttle you 4 miles south to Dunsmuir for food and lodging.',
    objectives: ['Finish strong', 'Clean up', 'Coordinate pickup'],
    timing: { start: '7:00 AM', end: '1:00 PM', movingTime: '4.5h', breakTime: '1.5h' },
    gradient: 'moderate',
    sourceIds: ['doc-day-plan', 'parks-castle-crags', 'unexpected-occurrence']
  }
];
// Historical narrative total: 52 miles. This is not the active route.

const dateLabel = (isoDate) =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Los_Angeles'
  }).format(new Date(`${isoDate}T12:00:00-07:00`));

// Historical narrative itinerary retained for provenance only. No active view
// consumes it; the PCTA/USGS generated route bundle is the current itinerary.
export const dayItinerary = [
  {
    day: 0,
    label: 'Arrival & staging',
    date: '2026-08-28',
    from: 'SJC',
    to: 'Burney area',
    distance: 0,
    type: 'drive',
    elevation: { start: 0, end: 0, gain: 0, loss: 0 },
    terrain: 'Confirmed late airport pickup followed by the selected same-night Burney approach',
    waterSources: [],
    waterCarry: 'Travel day',
    connectivity: { verizon: 'variable', att: 'variable', tmobile: 'variable', satellite: true },
    campFeatures: ['Legal overnight Burney staging to be confirmed'],
    notes: 'Confirmed itinerary: UA481 reaches SJC around 10:36 PM PDT. Mikaela collects the team and begins the same-night Burney approach; do not start Day 1 until all hikers are rested and legal staging/access is confirmed.',
    objectives: ['Monitor United Flight Status', 'Collect luggage', 'Fuel and eat', 'Complete the driver-rest and legal-staging plan'],
    timing: { start: '10:36 PM', end: 'Predawn August 29 staging', movingTime: '6.1h SJC-to-Burney baseline before stops', breakTime: 'Airline and driver-rest dependent' },
    sourceIds: ['doc-day-plan']
  },
  ...primaryItinerary.map((leg) => ({
    day: leg.day,
    label: `Day ${leg.day} · ${dateLabel(leg.date)}`,
    date: leg.date,
    from: leg.from,
    to: leg.to,
    distance: leg.distance,
    pdfEstimate: legacySixDayNarrative[leg.day]?.distance ?? null,
    type: 'hike',
    elevation: {
      start: leg.elevation.start,
      end: leg.elevation.end,
      gain: leg.elevation.gain,
      loss: leg.elevation.loss
    },
    terrain:
      leg.day === 3
        ? 'Continuous private-timberland traverse with day packs and timed Bartle Gap extraction'
        : leg.day === 4
        ? `Highest route segment; USGS 3DEP profile reaches approximately ${tripFacts.route.highPointFeet.toLocaleString()} ft`
        : leg.elevation.loss >= 1400
          ? 'Major descent day; protect knees and allow slower footing'
          : leg.elevation.gain >= 1800
            ? 'Major climbing day; start early and manage heat'
            : leg.terrainLoad.kneeLoad === 'high'
              ? 'Shorter mileage, but concentrated descent makes this a knee-load day'
              : 'Rolling PCT terrain',
    waterSources: ['Use same-day PCT Water Report and map sources'],
    waterCarry: 'Calculate at the last confirmed source; do not rely on a static liter value',
    connectivity: { verizon: 'unknown', att: 'unknown', tmobile: 'unknown', satellite: true },
    campFeatures:
      leg.campStatus === 'verified-trailhead-finish'
        ? ['Finish/pickup location']
        : leg.stopType === 'support-transfer'
          ? ['Exact Bartle Gap transfer pin', 'No camping or extended stop', 'Off-corridor legal overnight required']
          : leg.campStatus === 'gis-screened-needs-ground-check'
            ? ['USFS parcel/setback/slope screen passed', 'Ground capacity and hazards still require verification']
            : ['Halfmile-documented camp area', 'Current capacity and water still require verification'],
    landManagement: {
      zone: 'Verify against current land-management map',
      agency: 'USFS / California State Parks',
      jurisdiction: 'mixed'
    },
    notes:
      leg.campStatus === 'verified-trailhead-finish'
        ? 'Finish at Ash Camp and meet Mikaela at the pre-shared 41.1171, -122.0606 pickup pin.'
        : leg.stopType === 'support-transfer'
          ? 'Meet the confirmed driver at the exact Bartle Gap PCT crossing. Transfer off private land promptly; return to the same pin before Day 4 hiking.'
        : `${leg.to} at route mile ${leg.routeMileEnd}; ${leg.water}. Verify current conditions before committing.`,
    objectives: [
      'Confirm water before leaving the previous source',
      'Send satellite check-in',
      leg.campStatus === 'verified-trailhead-finish'
        ? 'Coordinate pickup'
        : leg.stopType === 'support-transfer'
          ? 'Execute timed pickup and exact-point re-entry'
          : 'Verify legal low-impact campsite'
    ],
    timing: { start: '6:30 AM', end: '3:30 PM', movingTime: '5–7h', breakTime: '1.5–2.5h' },
    gradient: leg.terrainLoad.effortRank <= 3 ? 'steep' : 'moderate',
    terrainLoad: leg.terrainLoad,
    verification: leg.campStatus,
    sourceIds: ['gps-route', 'pct-water', 'pcta']
  }))
];

// Aggregate stats for the full trip
// ═══════════════════════════════════════════════════════════════════════════════
// MILEAGE RECONCILIATION:
// • Active PCTA 2026 route to Ash Camp: 51.844 miles
// • Checked-in PCTA centerline geometry: ${tripFacts.route.centerlineGeometryMiles} miles
// • User-supplied Garmin source track:  80.826 miles (not active)
// • Existing legacy app full crop:      82.898 miles (different crop; not active)
// ═══════════════════════════════════════════════════════════════════════════════
export const tripStats = {
  totalDays: 10, // arrival + eight hiking days + contingency
  hikingDays: tripFacts.route.hikingDays,
  totalMiles: tripFacts.route.officialMiles,
  gpsMiles: tripFacts.route.gpsMiles,
  gpsCalculated: false,
  segmentRange: '51.844 (Burney Falls PCT access → Ash Camp)',
  pdfEstimates: null,
  totalGain: tripFacts.route.totalGainFeet,
  totalLoss: tripFacts.route.totalLossFeet,
  avgMilesPerDay: tripFacts.route.averageMilesPerDay,
  targetPace: 'variable',
  paceNote: 'Eight hiking days average 6.48 miles; Day 3 is the 12.59-mile supported traverse and the final day is 3.85 miles.',
  highPoint: { elevation: tripFacts.route.highPointFeet, location: 'High saddle / active route high point', day: 4 },
  lowPoint: { elevation: tripFacts.route.lowPointFeet, location: 'Ash Camp / McCloud River corridor', day: 8 },
  waterSourceCount: 20,
  connectivityBlackoutMiles: 35, // Approximate based on daily connectivity data
  estimatedMovingTime: '37–52 field hours',
  recommendedWaterCarry: { min: 2, max: 5, unit: 'L', note: 'Day 2 dry camp and Day 3 traverse depend on final heat, current source reports, and driver-staged water' },
  sources: ['ddg-pdf', 'pct-water', 'halfmile', 'gps-route'],
  sourceQuotes: {
    distance: tripFacts.route.distanceEvidence,
    pace: 'Eight trail legs averaging 6.48 miles; longest day 12.59 miles with day packs and support',
    dates: 'August 29 through September 5, 2026; September 6 contingency'
  }
};

export const nextStepsChecklist = [
  {
    task: 'Lock August 29–September 5 as the primary hiking window and September 6 as contingency.',
    status: 'completed'
  },
  {
    task: 'Book the Bartle Gap support driver and verify both approach roads, gates, high-clearance vehicle, exact pickup/re-entry pin, legal overnight, and no-contact fallback.',
    status: 'up next'
  },
  {
    task: 'Reserve a legal August 28 late-arrival sleep plan near Burney Falls.',
    status: 'up next'
  },
  {
    task: 'Confirm the September 7 SJC flight time and finish-to-airport transport.',
    status: 'up next'
  },
  {
    task: 'Confirm local overnight rules; then obtain and carry every currently required permit. A campfire permit never overrides a closure or private-land restriction.',
    status: 'up next'
  },
  {
    task: 'Name a secondary Ash Camp high-clearance provider only after it explicitly accepts the FS Road 38N11 assignment. Trail angels are a named-and-confirmed tertiary backup, not transport to assume.',
    status: 'pending'
  },
  {
    task: 'Save the generated Field Brief and route bundle offline on every phone, then send and acknowledge a real satellite check-in with every team contact.',
    status: 'pending'
  }
];
