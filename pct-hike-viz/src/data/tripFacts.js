export const TRIP_YEAR = 2026;

export const tripFacts = {
  status: "planned-supported-traverse-with-verification-gates",
  year: TRIP_YEAR,
  route: {
    name: "PCT California Section O",
    start: "Burney Falls PCT access",
    finish: "Ash Camp / McCloud River",
    officialMiles: 51.844,
    gpsMiles: 51.664,
    displayMiles: 51.8,
    hikingDays: 8,
    averageMilesPerDay: 6.48,
    longestDayMiles: 12.591,
    totalGainFeet: 6401,
    totalLossFeet: 6896,
    highPointFeet: 6146,
    startPctMile: 1420.653,
    finishPctMile: 1472.497,
    geometrySource: "PCTA January 2026 centerline",
    elevationSource: "Cropped Garmin CA Section O PCT 2025 track",
    distanceEvidence:
      "The PCTA January 2026 centerline measures 51.844 miles from the actual Burney Falls access to Ash Camp. The cropped Garmin track measures 51.664 miles and supplies the elevation profile.",
    extendedAlternative: {
      finish: "Castle Crags / I-5 corridor",
      sourceTrackMiles: 80.826,
      legacyAppMiles: 82.898,
      status: "future-trip-only",
      note:
        "The user-supplied Garmin exports measure 80.826 miles end to end. The old 82.898-mile app value came from a different legacy crop and must not be presented as the same measurement. Neither is part of the August 29–September 5 trip.",
    },
  },
  dates: {
    arrival: "2026-08-28",
    hikingStart: "2026-08-29",
    hikingFinish: "2026-09-05",
    contingency: "2026-09-06",
    departure: "2026-09-07",
  },
  inboundFlight: {
    travelers: ["Dan", "Drew"],
    flightNumber: "UA481",
    origin: "ORD",
    airport: "SJC",
    scheduledDepartureLocal: "8:00 PM CDT",
    scheduledArrivalLocal: "10:36 PM PDT",
    scheduledArrivalDate: "2026-08-28",
    verification: "calendar-normalized-needs-united-booking",
  },
  outboundFlight: {
    travelers: ["Dan", "Drew"],
    flightNumber: "UA1317",
    airport: "SJC",
    destination: "ORD",
    scheduledDepartureLocal: "6:40 AM PDT",
    scheduledDepartureDate: "2026-09-07",
    scheduledArrivalLocal: "11:00 AM CDT",
    verification: "provided-by-team-needs-united-booking",
  },
  groundTransport: {
    driver: "Mikaela",
    vehicle: "Kia Sportage",
    outboundDate: "2026-08-29",
    note:
      "Sleep near SJC after the late August 28 arrival, then leave around 5:00–5:30 AM on August 29 for Burney. Do not plan an exhausted overnight drive to the trailhead.",
  },
  extractionOptions: {
    primary: {
      name: "Ash Camp",
      routeMile: 51.844,
      pctMile: 1472.497,
      coordinates: { latitude: 41.1170914, longitude: -122.0606252 },
      plannedDate: "2026-09-05",
      backupDate: "2026-09-06",
      access: "Unpaved FS Road 38N11; rough; high-clearance recommended",
      status: "primary-needs-road-check",
    },
    futureExtendedRoute: {
      name: "Castle Crags / Soda Creek Road",
      sourceTrackMiles: 80.826,
      access: "Paved I-5 corridor",
      status: "future-trip-only",
    },
  },
  unresolved: [
    {
      id: "return-flight-time",
      priority: "critical",
      label: "Verify UA481 and UA1317 in United Manage Trip",
      detail:
        "The working schedule is UA481 arriving SJC at 10:36 PM PDT August 28 and UA1317 departing SJC at 6:40 AM PDT September 7. The airline booking remains controlling.",
    },
    {
      id: "burney-late-arrival",
      priority: "critical",
      label: "Confirm August 28 late-arrival sleep plan",
      detail:
        "The team should sleep near SJC and leave early August 29 rather than driving to Burney overnight.",
    },
    {
      id: "supported-private-corridor-traverse",
      priority: "critical",
      label: "Book and field-verify the Day 3 Bartle Gap support plan",
      detail:
        "Day 3 is a 12.59-mile continuous private-timberland traverse with day packs. A confirmed driver must transfer overnight packs, verify the Bartle Gap road/gate, meet the team at the exact PCT crossing, provide a legal off-corridor overnight, and return everyone to that exact crossing on Day 4.",
    },
    {
      id: "lake-britton-access",
      priority: "critical",
      label: "Recheck Lake Britton crossing immediately before departure",
      detail:
        "The current water-report snapshot includes a bridge-work notice overlapping the first part of the trip.",
    },
  ],
};

const dayDates = [
  "2026-08-29",
  "2026-08-30",
  "2026-08-31",
  "2026-09-01",
  "2026-09-02",
  "2026-09-03",
  "2026-09-04",
  "2026-09-05",
];

const elevationByDay = [
  { start: 2949, end: 3043, gain: 613, loss: 522, high: 3223 },
  { start: 3043, end: 4961, gain: 2199, loss: 276, high: 5053 },
  { start: 4961, end: 5082, gain: 1424, loss: 1312, high: 5490 },
  { start: 5082, end: 6128, gain: 1209, loss: 157, high: 6146 },
  { start: 6128, end: 5394, gain: 83, loss: 813, high: 6146 },
  { start: 5394, end: 5197, gain: 873, loss: 1065, high: 5688 },
  { start: 5197, end: 3360, gain: 0, loss: 1834, high: 5197 },
  { start: 3360, end: 2443, gain: 0, loss: 917, high: 3360 },
];

const overnightPlan = [
  {
    name: "Rock Creek camps",
    routeMile: 5.609,
    pctMile: 1426.262,
    coordinates: { latitude: 41.0229341, longitude: -121.7148808 },
    water: "Rock Creek",
  },
  {
    name: "Pre-private USFS dry camp",
    routeMile: 14.287,
    pctMile: 1434.94,
    coordinates: { latitude: 41.068437, longitude: -121.789562 },
    trailAccessCoordinates: {
      latitude: 41.06802432797849,
      longitude: -121.79029050283134,
    },
    stopType: "camp",
    campStatus: "gis-screened-needs-ground-check",
    water:
      "Dry camp. Fill at the last currently confirmed legal source; Peavine flow and collection legality must be rechecked.",
    note:
      "Shasta County parcel screen: USFS APN 022-170-001. Candidate is about 250 ft from the PCT, 626 ft from the mapped MVUM road, 0.363 mi from mapped private property, and 5.0% mean sampled slope. Confirm vegetation, hazards, durable surface, and three-person capacity on foot.",
  },
  {
    name: "Bartle Gap supported extraction",
    routeMile: 26.878,
    pctMile: 1447.531,
    coordinates: {
      latitude: 41.17064891383052,
      longitude: -121.81993729434907,
    },
    stopType: "support-transfer",
    campStatus: "support-transfer-needs-booking-road-check",
    water:
      "Driver-staged water at Bartle Gap. Do not camp or linger on private timberland; extract to a legal overnight and return to this exact PCT crossing the next morning.",
    note:
      "This is not a campsite. The driver, vehicle route, gate status, pickup window, exact re-entry pin, and no-contact fallback must be confirmed before the trip.",
  },
  {
    name: "High saddle camp near Road 38N10",
    routeMile: 32.247,
    pctMile: 1452.9,
    coordinates: { latitude: 41.1767853, longitude: -121.8808339 },
    water:
      "Dry camp: carry from the last confirmed source and plan for the next verified source",
    stopType: "camp",
    campStatus: "documented-needs-current-verification",
  },
  {
    name: "Alder / Star City Creek camp",
    routeMile: 36.036,
    pctMile: 1456.689,
    coordinates: { latitude: 41.157895, longitude: -121.9202143 },
    water:
      "A June 15 report described clear flow around 2 L/min, but parser metadata is incomplete. Verify before relying on it.",
    stopType: "camp",
    campStatus: "documented-needs-current-verification",
  },
  {
    name: "Deer Creek Spring camp",
    routeMile: 42.386,
    pctMile: 1463.039,
    coordinates: { latitude: 41.1356197, longitude: -121.9860782 },
    water: "Deer Creek Spring",
    stopType: "camp",
    campStatus: "documented-needs-current-verification",
  },
  {
    name: "Butcherknife Creek camp",
    routeMile: 47.99,
    pctMile: 1468.643,
    coordinates: { latitude: 41.1294222, longitude: -122.0266769 },
    water: "Butcherknife Creek",
    stopType: "camp",
    campStatus: "documented-needs-current-verification",
  },
  {
    name: "Ash Camp pickup",
    routeMile: 51.844,
    pctMile: 1472.497,
    coordinates: { latitude: 41.1170914, longitude: -122.0606252 },
    water: "McCloud River / nearby creek; treat before drinking",
    stopType: "finish",
    campStatus: "verified-trailhead-finish",
  },
];

const itineraryWithoutRanks = dayDates.map((date, index) => {
  const day = index + 1;
  const destination = overnightPlan[index];
  const startMile = index === 0 ? 0 : overnightPlan[index - 1].routeMile;
  const endMile = destination.routeMile;
  const distance = Number((endMile - startMile).toFixed(3));
  const elevation = elevationByDay[index];
  const ascentPerMile = Math.round(elevation.gain / distance);
  const descentPerMile = Math.round(elevation.loss / distance);
  // A transparent planning estimate, not a physiological measurement:
  // horizontal miles + climbing penalty + a smaller loaded-descent penalty.
  const effortMiles = Number(
    (distance + elevation.gain / 2000 + elevation.loss / 4000).toFixed(1),
  );

  return {
    day,
    date,
    from:
      day === 1 ? "Burney Falls trailhead" : overnightPlan[index - 1].name,
    to: destination.name,
    distance,
    routeMileStart: startMile,
    routeMileEnd: endMile,
    pctMileEnd: destination.pctMile,
    coordinates: destination.coordinates,
    trailAccessCoordinates: destination.trailAccessCoordinates,
    water: destination.water,
    note: destination.note,
    stopType: destination.stopType ?? "camp",
    elevation,
    terrainLoad: {
      netFeet: elevation.end - elevation.start,
      totalVerticalFeet: elevation.gain + elevation.loss,
      ascentPerMile,
      descentPerMile,
      effortMiles,
      kneeLoad:
        elevation.loss >= 1400 || descentPerMile >= 300
          ? "very-high"
          : elevation.loss >= 900 || descentPerMile >= 225
            ? "high"
            : elevation.loss >= 600
              ? "moderate"
              : "low",
    },
    packMode: day === 3 ? "day-pack-supported" : "overnight-pack",
    campStatus:
      destination.campStatus ??
      (day === 8
        ? "verified-trailhead-finish"
        : "documented-needs-current-verification"),
  };
});

const effortOrder = [...itineraryWithoutRanks]
  .sort((a, b) => b.terrainLoad.effortMiles - a.terrainLoad.effortMiles)
  .map((day) => day.day);

export const primaryItinerary = itineraryWithoutRanks.map((leg) => ({
  ...leg,
  terrainLoad: {
    ...leg.terrainLoad,
    effortRank: effortOrder.indexOf(leg.day) + 1,
  },
}));

export const comparableHikerEvidence = [
  {
    label: "Section hiker with day pack",
    route: "Cabin Creek to Ash Camp",
    distanceMiles: 15,
    gainFeet: 2000,
    elapsed: "just over 6 hours",
    context:
      "Included a roughly 900-foot climb in under two miles. Day-pack pace is not equivalent to an eight-day backpack.",
    source:
      "https://trailhiker.wordpress.com/2017/11/09/pct-section-o-cabin-creek-to-ash-camp/",
  },
  {
    label: "Long section day with car staging",
    route: "Bartle Gap to Ash Camp",
    distanceMiles: 26.4,
    gainFeet: 2400,
    lossFeet: 5100,
    elapsed: "about 11.5 hours",
    context:
      "The author called it a very big day and said they would not repeat that mileage. This is evidence of the terrain, not a recommended schedule.",
    source:
      "https://trailhiker.wordpress.com/2018/06/27/pct-section-o-bartle-gap-to-ash-camp/",
  },
  {
    label: "Conditioned PCT thru-hiker",
    route: "Burney-area northbound progression",
    dailyMiles: [17, 28, 23],
    context:
      "Thru-hiker mileage after extensive conditioning. It is explicitly unsuitable as the DDG team's starting template.",
    source: "https://www.bedore.org/2003_PCT_August.html",
  },
];

export const formatTripDate = (isoDate) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(new Date(`${isoDate}T12:00:00-07:00`));
