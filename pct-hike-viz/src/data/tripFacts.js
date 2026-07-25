export const TRIP_YEAR = 2026;

export const tripFacts = {
  status: "planned",
  year: TRIP_YEAR,
  route: {
    name: "PCT California Section O",
    start: "McArthur-Burney Falls Memorial State Park",
    finish: "Ash Camp / McCloud River",
    gpsMiles: 54.2,
    hikingDays: 9,
    averageMilesPerDay: 6.0,
    longestDayMiles: 8.2,
    totalGainFeet: 6709,
    totalLossFeet: 7286,
    highPointFeet: 6146,
    distanceEvidence:
      "Garmin route geometry measures 54.2 miles from Burney Falls to the official Ash Camp pickup pin.",
    extendedAlternative: {
      finish: "Castle Crags / I-5 corridor",
      gpsMiles: 82.9,
      status: "future-trip-only",
      note:
        "Retained for a future trip with more days. It is not part of the August 29–September 6 itinerary.",
    },
  },
  dates: {
    arrival: "2026-08-28",
    hikingStart: "2026-08-29",
    hikingFinish: "2026-09-06",
    departure: "2026-09-07",
  },
  inboundFlight: {
    travelers: ["Dan", "Drew"],
    airport: "SJC",
    arrivalLocal: "6:05 PM",
    flightNumber: null,
    verification: "confirmed-by-team",
  },
  outboundFlight: {
    travelers: ["Dan", "Drew"],
    airport: "SJC",
    departureLocalOptions: ["6:40 AM", "10:40 AM"],
    flightNumber: null,
    verification: "needs-booking-confirmation",
  },
  groundTransport: {
    driver: "Mikaela",
    vehicle: "Kia Sportage",
    outboundDate: "2026-08-28",
    note:
      "SJC pickup followed by the Burney drive. A 6:05 PM landing makes the trail-area arrival late at night; confirm legal after-hours campground access or reserve a nearby sleep fallback.",
  },
  extractionOptions: {
    primary: {
      name: "Ash Camp",
      routeMile: 54.2,
      pctMile: 1472.0,
      coordinates: { latitude: 41.1171, longitude: -122.0606 },
      plannedDate: "2026-09-06",
      access: "Unpaved FS Road 38N11; rough; high-clearance recommended",
      status: "primary-needs-road-check",
    },
    futureExtendedRoute: {
      name: "Castle Crags / Soda Creek Road",
      routeMile: 82.9,
      access: "Paved I-5 corridor",
      status: "future-trip-only",
    },
  },
  unresolved: [
    {
      id: "return-flight-time",
      priority: "critical",
      label: "Confirm September 7 SJC departure",
      detail: "Current possibilities are 6:40 AM or 10:40 AM.",
    },
    {
      id: "burney-late-arrival",
      priority: "critical",
      label: "Confirm August 28 late-arrival sleep plan",
      detail:
        "Park day-use hours end at sunset and campground quiet hours begin at 10 PM.",
    },
    {
      id: "camp-waypoints",
      priority: "critical",
      label: "Confirm all eight documented overnight areas",
      detail:
        "Halfmile documents camps at each planned area, but current capacity, restrictions, and water still require FarOut/ranger verification immediately before the trip.",
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
  "2026-09-06",
];

const elevationByDay = [
  { start: 3020, end: 3043, gain: 713, loss: 690, high: 3223 },
  { start: 3043, end: 4769, gain: 2027, loss: 302, high: 5053 },
  { start: 4769, end: 5126, gain: 1058, loss: 702, high: 5490 },
  { start: 5126, end: 5285, gain: 852, loss: 692, high: 5407 },
  { start: 5285, end: 6109, gain: 990, loss: 166, high: 6109 },
  { start: 6109, end: 5394, gain: 129, loss: 844, high: 6146 },
  { start: 5394, end: 5140, gain: 937, loss: 1191, high: 5688 },
  { start: 5140, end: 3360, gain: 1, loss: 1780, high: 5136 },
  { start: 3360, end: 2443, gain: 3, loss: 920, high: 3359 },
];

const overnightPlan = [
  {
    name: "Rock Creek camps",
    routeMile: 8.2,
    pctMile: 1425.6,
    coordinates: { latitude: 41.0229341, longitude: -121.7148808 },
    water: "Rock Creek",
  },
  {
    name: "Peavine Creek camps",
    routeMile: 16.2,
    pctMile: 1433.7,
    coordinates: { latitude: 41.060513, longitude: -121.7853913 },
    water: "Seasonal Peavine Creek; verify flow before leaving Rock Creek",
  },
  {
    name: "Kosk Spring camp",
    routeMile: 23.9,
    pctMile: 1441.4,
    coordinates: { latitude: 41.1358169, longitude: -121.7713173 },
    water: "Kosk Spring, approximately 0.2 mile off trail",
  },
  {
    name: "Moosehead Creek camp",
    routeMile: 30.6,
    pctMile: 1448.2,
    coordinates: { latitude: 41.1771229, longitude: -121.8318419 },
    water: "Moosehead Creek; verify current flow",
  },
  {
    name: "High saddle camp near Road 38N10",
    routeMile: 34.6,
    pctMile: 1452.3,
    coordinates: { latitude: 41.1767853, longitude: -121.8808339 },
    water:
      "Dry camp: carry from the last confirmed source and plan for the next verified source",
  },
  {
    name: "Alder / Star City Creek camp",
    routeMile: 38.5,
    pctMile: 1456.1,
    coordinates: { latitude: 41.157895, longitude: -121.9202143 },
    water:
      "Star City Creek is off trail and has no dependable static flow report; verify before relying on it",
  },
  {
    name: "Deer Creek Spring camp",
    routeMile: 44.9,
    pctMile: 1462.6,
    coordinates: { latitude: 41.1356197, longitude: -121.9860782 },
    water: "Deer Creek Spring",
  },
  {
    name: "Butcherknife Creek camp",
    routeMile: 50.4,
    pctMile: 1468.0,
    coordinates: { latitude: 41.1294222, longitude: -122.0266769 },
    water: "Butcherknife Creek",
  },
  {
    name: "Ash Camp pickup",
    routeMile: 54.2,
    pctMile: 1472.0,
    coordinates: { latitude: 41.1171, longitude: -122.0606 },
    water: "McCloud River / nearby creek; treat before drinking",
  },
];

export const primaryItinerary = dayDates.map((date, index) => {
  const day = index + 1;
  const destination = overnightPlan[index];
  const startMile = index === 0 ? 0 : overnightPlan[index - 1].routeMile;
  const endMile = destination.routeMile;

  return {
    day,
    date,
    from:
      day === 1 ? "Burney Falls trailhead" : overnightPlan[index - 1].name,
    to: destination.name,
    distance: Number((endMile - startMile).toFixed(1)),
    routeMileStart: startMile,
    routeMileEnd: endMile,
    pctMileEnd: destination.pctMile,
    coordinates: destination.coordinates,
    water: destination.water,
    elevation: elevationByDay[index],
    campStatus:
      day === 9 ? "verified-trailhead-finish" : "documented-needs-current-verification",
  };
});

export const formatTripDate = (isoDate) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(new Date(`${isoDate}T12:00:00-07:00`));
