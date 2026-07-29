// ═══════════════════════════════════════════════════════════════════════════════
// DDG-PCT RESOURCE INDEX
// Complete inventory of all sources from Original-DDG-PCT-PDF.txt and beyond
// ═══════════════════════════════════════════════════════════════════════════════
// This file catalogs EVERY reference mentioned in Dad's original planning doc,
// plus additional community intel for the Burney Falls → Castle Crags corridor.
// GearPlanner and other components reference these via sourceIds arrays.
// ═══════════════════════════════════════════════════════════════════════════════

export const resourcesIndex = [
  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL DOCUMENTS (The DDG Source Material)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'doc-day-plan',
    title: 'DDG Narrative: Section O Day Plan',
    type: 'internal',
    category: 'planning',
    source: '../Original-DDG-PCT-PDF.txt',
    excerpt: '"Here is a potential breakdown of a 90-100 mile segment… Day 1 Burney Falls → Round Valley… Day 6 Castle Crags Vista Camp → Castle Crags State Park."',
    tags: ['itinerary', 'daily-distance', 'camps'],
    icon: '📋'
  },
  {
    id: 'doc-detox-trip',
    title: 'DDG Narrative: April Detox Trip',
    type: 'internal',
    category: 'experience',
    source: '../Original-DDG-PCT-PDF.txt',
    excerpt: '"Drew and I went from April 12th to April 28th, which was 16 days… the effect of detoxifying us from external news, social media, and the effects of a crazy world."',
    tags: ['experience', 'pacing', 'mental-health'],
    icon: '🧘'
  },
  {
    id: 'doc-transport-dunsmuir',
    title: 'DDG Narrative: Dunsmuir Resupply + Shuttles',
    type: 'internal',
    category: 'logistics',
    source: '../Original-DDG-PCT-PDF.txt',
    excerpt: 'Historical DDG transport notes for Dunsmuir. The phone number in the source narrative is superseded; use the separately verified current taxi contact.',
    tags: ['resupply', 'transport', 'town'],
    icon: '🚐'
  },
  {
    id: 'doc-permits-overview',
    title: 'DDG Narrative: Permit + Campfire Requirements',
    type: 'internal',
    category: 'permits',
    source: '../Original-DDG-PCT-PDF.txt',
    excerpt: '"Self-issued free overnight camping permits… Castle Crags State Park campground registration… California Campfire Permit is required for using any open flame or stove."',
    tags: ['permits', 'regulations', 'fire'],
    icon: '📝'
  },
  {
    id: 'doc-schedule-options',
    title: 'DDG Narrative: 9-Day vs 16-Day Decision',
    type: 'internal',
    category: 'planning',
    source: '../Original-DDG-PCT-PDF.txt',
    excerpt: '"August 29th through September 6th… If we did that (16 days), I would have to start on August 22nd instead of August 29th."',
    tags: ['schedule', 'dates', 'logistics'],
    icon: '📅'
  },
  {
    id: 'doc-water-hat-creek',
    title: 'DDG Narrative: Hat Creek Rim Water',
    type: 'internal',
    category: 'water',
    source: '../Original-DDG-PCT-PDF.txt',
    excerpt: 'Water cache strategy for the Hat Creek Rim dry stretch that Halfway Anywhere warns about.',
    tags: ['water', 'logistics', 'planning'],
    icon: '💧'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ROUTE RESEARCH - Trail Blogs & Trip Reports
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'wv-2017-log',
    title: 'Wilderness Vagabond 2017 PCT Log',
    type: 'external',
    category: 'trip-report',
    url: 'http://wildernessvagabond.com/PCT-2017/PCT-2017.htm',
    excerpt: 'Cold Hat Creek Rim carries, Kosk Spring bucket baths, and "extra lunch" stops at Trough Creek describe real water spacing and shelter stressors for Section O.',
    tags: ['water', 'shelter', 'weather', 'firsthand'],
    icon: '📖'
  },
  {
    id: 'adventurehacks-guide',
    title: 'Adventure Hacks: Burney Falls → Castle Crags',
    type: 'external',
    category: 'guide',
    url: 'https://adventurehacks.com/burney-falls-castle-crags/',
    excerpt: '"Wear long pants—ticks and poison oak are prevalent… temperatures vary dramatically even in summer, pack accordingly."',
    tags: ['clothing', 'weather', 'hazards', 'ticks'],
    icon: '🎒'
  },
  {
    id: 'halfway-anywhere',
    title: 'Halfway Anywhere: Best NorCal Section Hikes',
    type: 'external',
    category: 'guide',
    url: 'https://www.halfwayanywhere.com/trails/pacific-crest-trail/best-section-hikes-pct-norcal/',
    excerpt: 'Comprehensive section-by-section breakdown of NorCal PCT with water sources, mileages, and difficulty ratings.',
    tags: ['sections', 'water', 'planning', 'norcal'],
    icon: '🗺️'
  },
  {
    id: 'drempd-best-sections',
    title: 'Dr. Empd: Best PCT Sections',
    type: 'external',
    category: 'guide',
    url: 'https://drempd.com/blog/the-best-sections-of-the-pacific-crest-trail/',
    excerpt: 'Curated guide to the most scenic and rewarding PCT sections including Castle Crags corridor.',
    tags: ['sections', 'scenery', 'recommendations'],
    icon: '⭐'
  },
  {
    id: 'norcal-hiking-castle-crags',
    title: 'NorCal Hiking Trails: PCT Castle Crags',
    type: 'external',
    category: 'guide',
    url: 'https://northerncaliforniahikingtrails.com/blog/2019/03/10/pacific-crest-trail-castle-crags/',
    excerpt: 'Detailed trail conditions, access points, and camping info for the Castle Crags section.',
    tags: ['trail-conditions', 'access', 'camping'],
    icon: '🏔️'
  },
  {
    id: 'norcal-hiking-trinity',
    title: 'NorCal Hiking Trails: Trinity Alps PCT',
    type: 'external',
    category: 'guide',
    url: 'https://northerncaliforniahikingtrails.com/blog/2018/06/26/trinity-alps-pacific-crest-trail-section-hiking/',
    excerpt: 'Section hiking guide for Trinity Alps region with water and camp intel.',
    tags: ['trinity-alps', 'sections', 'camping'],
    icon: '🏕️'
  },
  {
    id: 'trailhiker-section-o',
    title: 'Trail Hiker: Section O Peavine to Bartle Gap',
    type: 'external',
    category: 'trip-report',
    url: 'https://trailhiker.wordpress.com/2017/11/11/pct-section-o-peavine-creek-to-bartle-gap/',
    excerpt: 'First-person account of Section O with detailed notes on water, camps, and terrain.',
    tags: ['section-o', 'water', 'camps', 'firsthand'],
    icon: '🥾'
  },
  {
    id: 'entranced-wilderness',
    title: 'Entranced by Wilderness: Best NorCal PCT',
    type: 'external',
    category: 'guide',
    url: 'https://www.entrancedbywilderness.com/best-section-of-the-pct-norcal/',
    excerpt: 'Photo-rich guide highlighting the most beautiful NorCal PCT sections.',
    tags: ['scenery', 'photography', 'recommendations'],
    icon: '📷'
  },
  {
    id: 'wandering-time-burney',
    title: 'Wandering Through Time: Burney Falls',
    type: 'external',
    category: 'trip-report',
    url: 'https://wandering-through-time-and-place.com/tag/burney-falls/',
    excerpt: 'Trip report and photos from the Burney Falls trailhead area.',
    tags: ['burney-falls', 'photos', 'trailhead'],
    icon: '💧'
  },
  {
    id: 'active-norcal',
    title: 'Active NorCal: Castle Crags to Oregon Border',
    type: 'external',
    category: 'guide',
    url: 'https://www.activenorcal.com/siskiyou-adventures-hiking-on-the-pacific-crest-trail-from-castle-crags-to-the-oregon-border/',
    excerpt: 'Extended section guide from Castle Crags northward with logistics tips.',
    tags: ['castle-crags', 'north-section', 'logistics'],
    icon: '🧭'
  },
  {
    id: 'unexpected-occurrence',
    title: 'Two Days in Castle Crags Itinerary',
    type: 'external',
    category: 'itinerary',
    url: 'https://unexpectedoccurrence.com/two-days-in-castle-crags-itinerary/',
    excerpt: 'Short-format Castle Crags itinerary with lodging and dining recommendations.',
    tags: ['castle-crags', 'itinerary', 'lodging'],
    icon: '🏨'
  },
  {
    id: 'inked-wanderlust',
    title: 'NorCal Waterfall Road Trip Itinerary',
    type: 'external',
    category: 'itinerary',
    url: 'https://www.inkedwithwanderlust.com/california/northern-california-waterfall-road-trip-itinerary',
    excerpt: 'Road trip itinerary including Burney Falls and surrounding attractions.',
    tags: ['burney-falls', 'road-trip', 'waterfalls'],
    icon: '🚗'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REDDIT INTEL - Community Wisdom
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'reddit-ca-land-deal',
    title: 'Reddit: California Land Deal Protects 25-Mile Stretch',
    type: 'external',
    category: 'reddit',
    url: 'https://www.reddit.com/r/PacificCrestTrail/comments/14xwgbe/california_land_deal_protects_spectacular_25mile/',
    excerpt: 'Discussion of conservation efforts protecting scenic PCT corridor near Castle Crags.',
    tags: ['conservation', 'news', 'castle-crags'],
    icon: '🌲'
  },
  {
    id: 'reddit-norcal-day-hikes',
    title: 'Reddit: Day Hikes Castle Crags/Shasta-Trinity',
    type: 'external',
    category: 'reddit',
    url: 'https://www.reddit.com/r/norcalhiking/comments/1j793sr/day_hikes_in_late_march_castle_crags_shastatrinity/',
    excerpt: 'Community recommendations for day hikes in the Castle Crags and Shasta-Trinity region.',
    tags: ['day-hikes', 'castle-crags', 'shasta'],
    icon: '🥾'
  },
  {
    id: 'reddit-norcal-tips',
    title: 'Reddit: Tips for NorCal PCT',
    type: 'external',
    category: 'reddit',
    url: 'https://www.reddit.com/r/PacificCrestTrail/comments/ce6tzg/tips_for_norcal/',
    excerpt: 'Community thread with NorCal-specific tips on water, camping, and hazards.',
    tags: ['tips', 'norcal', 'community'],
    icon: '💡'
  },
  {
    id: 'reddit-amtrak-coast',
    title: 'Reddit: Amtrak Coast Starlight for PCT',
    type: 'external',
    category: 'reddit',
    url: 'https://www.reddit.com/r/norcalhiking/comments/xrffh5/has_anybody_tried_taking_the_amtrak_coast/',
    excerpt: 'Discussion of using Amtrak Coast Starlight for PCT access and resupply.',
    tags: ['transport', 'amtrak', 'logistics'],
    icon: '🚂'
  },
  {
    id: 'reddit-public-transport',
    title: 'Reddit: Public Transport on PCT',
    type: 'external',
    category: 'reddit',
    url: 'https://www.reddit.com/r/PacificCrestTrail/comments/10fbfq4/public_transport/',
    excerpt: 'Discussion of public transit options along the PCT corridor.',
    tags: ['transport', 'public-transit', 'logistics'],
    icon: '🚌'
  },
  {
    id: 'reddit-castle-crags-transit',
    title: 'Reddit: Public Transit from Castle Crags',
    type: 'external',
    category: 'reddit',
    url: 'https://www.reddit.com/r/norcalhiking/comments/1h69733/public_transit_from_castle_crags_state_park/',
    excerpt: 'Recent thread on transit options specifically from Castle Crags State Park.',
    tags: ['transport', 'castle-crags', 'logistics'],
    icon: '🚐'
  },
  {
    id: 'reddit-permits-ca',
    title: 'Reddit: Other Permits on PCT California',
    type: 'external',
    category: 'reddit',
    url: 'https://www.reddit.com/r/PacificCrestTrail/comments/1hwwyzn/other_permits_you_may_need_on_the_pct_california/',
    excerpt: 'Comprehensive thread on permit requirements for California PCT sections.',
    tags: ['permits', 'california', 'regulations'],
    icon: '📋'
  },
  {
    id: 'reddit-permit-24',
    title: 'Reddit: PCT Permit 2024',
    type: 'external',
    category: 'reddit',
    url: 'https://www.reddit.com/r/PacificCrestTrail/comments/17p862x/pct_permit_24/',
    excerpt: 'Discussion of 2024 permit process and requirements.',
    tags: ['permits', 'process', '2024'],
    icon: '✅'
  },
  {
    id: 'reddit-section-p',
    title: 'Reddit: CA Section P Castle Crags',
    type: 'external',
    category: 'reddit',
    url: 'https://www.reddit.com/r/PacificCrestTrail/comments/12qhhg7/ca_section_p_castle_crags_state_park/',
    excerpt: 'Discussion of Section P near Castle Crags with trail conditions and tips.',
    tags: ['section-p', 'castle-crags', 'conditions'],
    icon: '🏔️'
  },
  {
    id: 'reddit-gear-recs',
    title: 'Reddit: Gear Recommendations for PCT',
    type: 'external',
    category: 'reddit',
    url: 'https://www.reddit.com/r/PacificCrestTrail/comments/1dgkyz3/gear_recommendations_for_the_pct/',
    excerpt: 'Community discussion on clothing systems (sun hoodies, wind pants) and sleep systems (quilts vs bags).',
    tags: ['gear', 'clothing', 'sleep-system'],
    icon: '🎒'
  },
  {
    id: 'reddit-shakedown-2025',
    title: 'Reddit: Shakedown Packing List PCT 2025',
    type: 'external',
    category: 'reddit',
    url: 'https://www.reddit.com/r/PacificCrestTrail/comments/1hch850/shakedown_packing_list_pct_2025/',
    excerpt: 'Recent shakedown discussing rain skirts vs pants, pump sacks, and electronics.',
    tags: ['gear', 'shakedown', 'ultralight'],
    icon: '⚖️'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OFFICIAL RESOURCES - PCTA, USFS, Parks
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'pcta-permits',
    title: 'PCTA: Permit Portal',
    type: 'external',
    category: 'official',
    url: 'https://www.pcta.org/discover-the-trail/permits/',
    excerpt: 'Official PCTA permit information and application portal.',
    tags: ['permits', 'official', 'pcta'],
    icon: '🏛️'
  },
  {
    id: 'pcta-local-permits',
    title: 'PCTA: Local Permits Guide',
    type: 'external',
    category: 'official',
    url: 'https://www.pcta.org/discover-the-trail/permits/local-permits/',
    excerpt: 'Detailed guide to local permit requirements by section.',
    tags: ['permits', 'local', 'sections'],
    icon: '📋'
  },
  {
    id: 'pcta-trailheads-pdf',
    title: 'PCTA: Trailheads in Long-Distance Permit System',
    type: 'external',
    category: 'official',
    url: 'https://permit.pcta.org/Trailheads-in-the-PCT-Long-distance-Permit-system.pdf',
    excerpt: 'PDF listing all trailheads in the PCT long-distance permit system.',
    tags: ['permits', 'trailheads', 'pdf'],
    icon: '📄'
  },
  {
    id: 'pcta-resupply',
    title: 'PCTA: Resupply Towns & Locations',
    type: 'external',
    category: 'official',
    url: 'https://www.pcta.org/discover-the-trail/thru-hiking-long-distance-hiking/resupply/pct-resupply-towns-locations/',
    excerpt: 'Official PCTA guide to resupply towns along the trail.',
    tags: ['resupply', 'towns', 'logistics'],
    icon: '🏪'
  },
  {
    id: 'pcta-transport',
    title: 'PCTA: Transportation Guide',
    type: 'external',
    category: 'official',
    url: 'https://www.pcta.org/discover-the-trail/backcountry-basics/pct-transportation/',
    excerpt: 'PCTA transport primer: shuttle services, STAGE bus notes, and Amtrak touchpoints.',
    tags: ['transport', 'shuttle', 'logistics'],
    icon: '🚐'
  },
  {
    id: 'pcta-ash-camp',
    title: 'PCTA: Ash Camp Trailhead',
    type: 'external',
    category: 'official',
    url: 'https://explore.pcta.org/trailheads/ash-camp',
    excerpt: 'Official access point at PCTA 2026 mile 1472.497. FS Road 38N11 is unpaved, can be rough, and high clearance is recommended.',
    tags: ['transport', 'trailhead', 'ash-camp', 'pickup'],
    icon: '📍'
  },
  {
    id: 'usfs-mccloud-offices',
    title: 'USFS: McCloud Ranger Station',
    type: 'external',
    category: 'official',
    url: 'https://www.fs.usda.gov/r05/shasta-trinity/offices',
    excerpt: 'Current McCloud Ranger Station contact and office hours for road and access checks.',
    tags: ['transport', 'road-conditions', 'usfs', 'mccloud'],
    icon: '🌲'
  },
  {
    id: 'pcta-stage-bus',
    title: 'PCTA: STAGE Bus to Mt. Shasta',
    type: 'external',
    category: 'official',
    url: 'https://www.pcta.org/2018/bus-pacific-crest-trail-mt-shasta-59718/',
    excerpt: 'PCTA announcement of STAGE bus service to Mt. Shasta area.',
    tags: ['transport', 'bus', 'shasta'],
    icon: '🚌'
  },
  {
    id: 'pcta-explore-norcal',
    title: 'PCTA: Explore Northern California',
    type: 'external',
    category: 'official',
    url: 'https://explore.pcta.org/regions/northern-california/',
    excerpt: 'Official PCTA exploration guide for Northern California sections.',
    tags: ['norcal', 'sections', 'planning'],
    icon: '🗺️'
  },
  {
    id: 'permit-pcta-campfire',
    title: 'PCTA: California Campfire Permit',
    type: 'external',
    category: 'official',
    url: 'https://permit.pcta.org',
    excerpt: 'Online portal for obtaining California Campfire Permit (free, video + quiz).',
    tags: ['permits', 'campfire', 'stove'],
    icon: '🔥'
  },
  {
    id: 'usfs-castle-crags',
    title: 'USFS: Castle Crags Wilderness',
    type: 'external',
    category: 'official',
    url: 'http://www.fs.usda.gov/r05/shasta-trinity/recreation/castle-crags-wilderness',
    excerpt: 'Official USFS info for Castle Crags Wilderness area.',
    tags: ['wilderness', 'castle-crags', 'usfs'],
    icon: '🌲'
  },
  {
    id: 'usfs-permits',
    title: 'USFS: Shasta-Trinity Permits',
    type: 'external',
    category: 'official',
    url: 'http://www.fs.usda.gov/r05/shasta-trinity/permits',
    excerpt: 'USFS permit information for Shasta-Trinity National Forest.',
    tags: ['permits', 'usfs', 'forest'],
    icon: '🏔️'
  },
  {
    id: 'parks-castle-crags',
    title: 'CA Parks: Castle Crags State Park',
    type: 'external',
    category: 'official',
    url: 'https://www.parks.ca.gov/?page_id=454',
    excerpt: 'Official California State Parks page for Castle Crags.',
    tags: ['state-park', 'castle-crags', 'camping'],
    icon: '🏕️'
  },
  {
    id: 'parks-burney',
    title: 'CA Parks: Burney Falls',
    type: 'external',
    category: 'official',
    url: 'https://www.parks.ca.gov/?page_id=30374',
    excerpt: 'Official California State Parks page for McArthur-Burney Falls.',
    tags: ['state-park', 'burney-falls', 'trailhead'],
    icon: '💧'
  },
  {
    id: 'recreation-permits',
    title: 'Recreation.gov: PCT Permits',
    type: 'external',
    category: 'official',
    url: 'https://www.recreation.gov/permits/233261',
    excerpt: 'Recreation.gov portal for PCT permit applications.',
    tags: ['permits', 'reservation', 'official'],
    icon: '🎫'
  },
  {
    id: 'nps-jmt',
    title: 'NPS: John Muir Trail Planning',
    type: 'external',
    category: 'official',
    url: 'https://www.nps.gov/yose/planyourvisit/jmt.htm',
    excerpt: 'NPS guidance for JMT/PCT overlap sections (useful for permit context).',
    tags: ['jmt', 'permits', 'yosemite'],
    icon: '🏞️'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSPORT & LOGISTICS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'stage-bus-news',
    title: 'Mt. Shasta News: STAGE Bus',
    type: 'external',
    category: 'transport',
    url: 'https://www.mtshastanews.com/story/news/politics/county/2018/07/18/stage-bus-now-option-for/11494049007/',
    excerpt: 'News article on STAGE bus becoming option for PCT hikers in Mt. Shasta area.',
    tags: ['transport', 'bus', 'shasta'],
    icon: '🚌'
  },
  {
    id: 'srta-need-a-ride',
    title: 'SRTA: Need-A-Ride Brochure',
    type: 'external',
    category: 'transport',
    url: 'https://srta.ca.gov/DocumentCenter/View/9622/Need-A-Ride_Brochure',
    excerpt: 'Siskiyou Regional Transportation Agency ride options brochure.',
    tags: ['transport', 'shuttle', 'siskiyou'],
    icon: '🚐'
  },
  {
    id: 'mt-shasta-taxi',
    title: 'Mt. Shasta Taxi',
    type: 'external',
    category: 'transport',
    url: 'https://mtshastataxi.com/contact-us/',
    excerpt: 'Current reservation contact: 530-859-3266. Forest-road pickup capability must be confirmed directly.',
    tags: ['transport', 'taxi', 'reservation', 'shasta'],
    icon: '🚕'
  },
  {
    id: 'rome2rio-burney-shasta',
    title: 'Rome2Rio: Burney to Mt. Shasta',
    type: 'external',
    category: 'transport',
    url: 'https://www.rome2rio.com/s/Burney/Mount-Shasta',
    excerpt: 'Multi-modal transport options from Burney to Mt. Shasta.',
    tags: ['transport', 'routing', 'options'],
    icon: '🗺️'
  },
  {
    id: 'tripadvisor-shasta-burney',
    title: 'TripAdvisor: Mt. Shasta & Burney Falls Trip',
    type: 'external',
    category: 'travel',
    url: 'https://www.tripadvisor.com/ShowTopic-g28926-i29-k14373571-Mt_Shasta_Burney_Falls_Summer_Trip-California.html',
    excerpt: 'Community discussion on planning Mt. Shasta and Burney Falls trips.',
    tags: ['planning', 'shasta', 'burney-falls'],
    icon: '✈️'
  },
  {
    id: 'tripadvisor-shasta-area',
    title: 'TripAdvisor: Ideas for Mt. Shasta Area',
    type: 'external',
    category: 'travel',
    url: 'https://www.tripadvisor.com/ShowTopic-g28926-i29-k14496683-Ideas_for_a_couple_of_days_in_the_Mt_Shasta_area-California.html',
    excerpt: 'Travel ideas and recommendations for the Mt. Shasta area.',
    tags: ['planning', 'shasta', 'activities'],
    icon: '🏔️'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RESUPPLY & TOWN GUIDES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'erin-exploring-resupply',
    title: 'Erin Exploring: PCT Resupply Guide',
    type: 'external',
    category: 'resupply',
    url: 'https://www.erinexploring.com/blog/pacific-crest-trail-resupply-guide',
    excerpt: 'Comprehensive PCT resupply strategy guide.',
    tags: ['resupply', 'strategy', 'food'],
    icon: '🍎'
  },
  {
    id: 'bikehikesafari-resupply',
    title: 'BikeHikeSafari: Resupply Strategy 2015',
    type: 'external',
    category: 'resupply',
    url: 'https://bikehikesafari.com/my-resupply-strategy-for-hiking-the-pct-in-2015/',
    excerpt: 'Detailed thru-hiker resupply strategy and lessons learned.',
    tags: ['resupply', 'strategy', 'thru-hike'],
    icon: '📦'
  },
  {
    id: 'longdistancehiker-resupply',
    title: 'Long Distance Hiker: Resupply Thoughts Mile 1020-1653',
    type: 'external',
    category: 'resupply',
    url: 'https://www.longdistancehiker.com/pct-resupply-town-thoughts-part-4-mile-1020-1653/',
    excerpt: 'Town-by-town resupply notes for NorCal PCT miles covering our section.',
    tags: ['resupply', 'norcal', 'towns'],
    icon: '🏪'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION & MAPS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'farout-pct',
    title: 'FarOut (Guthook): PCT Map',
    type: 'external',
    category: 'navigation',
    url: 'https://faroutguides.com/pacific-crest-trail-map/',
    excerpt: 'FarOut (formerly Guthook) PCT app with water, camp, and waypoint data.',
    tags: ['navigation', 'app', 'gps', 'water'],
    icon: '📍'
  },
  {
    id: 'onxmaps-section-n',
    title: 'onX Maps: CA Section N',
    type: 'external',
    category: 'navigation',
    url: 'https://www.onxmaps.com/hiking/n7062p2omq8e/pacific-crest-trail-california-section-n',
    excerpt: 'onX Maps detailed topo for California Section N.',
    tags: ['navigation', 'topo', 'section-n'],
    icon: '🗺️'
  },
  {
    id: 'onxmaps-section-p',
    title: 'onX Maps: CA Section P',
    type: 'external',
    category: 'navigation',
    url: 'https://www.onxmaps.com/hiking/4j064ly2nq15/pacific-crest-trail-california-section-p',
    excerpt: 'onX Maps detailed topo for California Section P near Castle Crags.',
    tags: ['navigation', 'topo', 'section-p'],
    icon: '🗺️'
  },
  {
    id: 'hiiker-norcal',
    title: 'Hiiker App: PCT Northern California',
    type: 'external',
    category: 'navigation',
    url: 'http://hiiker.app/trails/california/el-dorado-county/pacific-crest-trail-northern-california',
    excerpt: 'Hiiker app trail page for PCT Northern California.',
    tags: ['navigation', 'app', 'norcal'],
    icon: '📱'
  },
  {
    id: 'youtube-section-o',
    title: 'YouTube: Section O Video',
    type: 'external',
    category: 'video',
    url: 'https://www.youtube.com/watch?v=3f68WhMgzNs',
    excerpt: 'Video documentation of PCT Section O hiking experience.',
    tags: ['video', 'section-o', 'visual'],
    icon: '🎬'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMITS & GUIDES (Additional)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'hungry-hiker-permits',
    title: 'The Hungry Hiker: Do I Need a Permit?',
    type: 'external',
    category: 'permits',
    url: 'https://www.the-hungry-hiker.com/2019/02/25/do-i-need-a-permit-to-hike-the-pacific-crest-trail/',
    excerpt: 'Clear breakdown of PCT permit requirements and when they apply.',
    tags: ['permits', 'faq', 'planning'],
    icon: '❓'
  },
  {
    id: 'triple-crown-permits',
    title: 'Triple Crown Outfitters: Permit PDF',
    type: 'external',
    category: 'permits',
    url: 'https://www.triplecrownoutfitters.com/uploads/b/2556a720-51d7-11ea-8796-f5da57ab01a8/80de8db0-64b1-11eb-930d-7d34e300260e.pdf',
    excerpt: 'Triple Crown Outfitters permit summary document.',
    tags: ['permits', 'pdf', 'summary'],
    icon: '📄'
  },
  {
    id: 'backpackers-section',
    title: 'Backpackers.com: Section Hiking the PCT',
    type: 'external',
    category: 'guide',
    url: 'https://backpackers.com/hiking-trails/section-hiking-the-pct/',
    excerpt: 'Comprehensive guide to section hiking the PCT.',
    tags: ['section-hiking', 'planning', 'guide'],
    icon: '🎒'
  },
  {
    id: 'california-com-pct',
    title: 'California.com: Hiking the PCT',
    type: 'external',
    category: 'guide',
    url: 'https://www.california.com/hiking-pacific-crest-trail/',
    excerpt: 'General overview of hiking the PCT in California.',
    tags: ['california', 'overview', 'planning'],
    icon: '🐻'
  }
];

// Build a lookup table by ID for quick access from components
export const resourcesById = resourcesIndex.reduce((acc, resource) => {
  acc[resource.id] = resource;
  return acc;
}, {});

// Category helpers for filtering/grouping in UI
export const resourceCategories = {
  internal: resourcesIndex.filter(r => r.type === 'internal'),
  'trip-report': resourcesIndex.filter(r => r.category === 'trip-report'),
  guide: resourcesIndex.filter(r => r.category === 'guide'),
  reddit: resourcesIndex.filter(r => r.category === 'reddit'),
  official: resourcesIndex.filter(r => r.category === 'official'),
  transport: resourcesIndex.filter(r => r.category === 'transport'),
  resupply: resourcesIndex.filter(r => r.category === 'resupply'),
  navigation: resourcesIndex.filter(r => r.category === 'navigation'),
  permits: resourcesIndex.filter(r => r.category === 'permits'),
  gear: resourcesIndex.filter(r => r.category === 'gear')
};

// Stats for the resource library
export const resourceStats = {
  total: resourcesIndex.length,
  internal: resourceCategories.internal.length,
  reddit: resourceCategories.reddit.length,
  official: resourceCategories.official.length,
  tripReports: resourceCategories['trip-report'].length
};
