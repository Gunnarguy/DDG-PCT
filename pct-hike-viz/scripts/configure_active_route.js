#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { primaryItinerary, tripFacts } from "../src/data/tripFacts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const publicPath = path.join(root, "public", "data", "hike_data.json");
const sourceMirrorPath = path.join(root, "src", "hike_data.json");
const mobilePath = path.resolve(
  root,
  "..",
  "DDG-Mobile",
  "DDG-Mobile",
  "Resources",
  "hike_data.json",
);
const inboundRoutePath = "/private/tmp/sjc-burney-route.json";
const returnRoutePath = "/private/tmp/ash-campbell-route.json";

const BURNEY_FALLS_PCT_ACCESS = [-121.65376551, 41.01104125];
const ASH_CAMP = [-122.0606252, 41.1170914];
const MILES_PER_METER = 1 / 1609.344;
const ACTIVE_WATER_SOURCES = [
  { routeMile: 0, pctMile: 1420.653, waypoint: "PCTAID_648", name: "Burney Falls State Park water", coordinates: [-121.65376551, 41.01104125], staticReliability: "facility-dependent" },
  { routeMile: 5.39, pctMile: 1426.04, waypoint: "PCTAID_650", name: "Rock Creek", coordinates: [-121.7136343, 41.0250791], staticReliability: "reliable-creek" },
  { routeMile: 8.62, pctMile: 1429.28, waypoint: "PCTAID_651", name: "Upper Jake Spring", coordinates: [-121.7513636, 41.0306833], staticReliability: "limited-off-trail" },
  { routeMile: 9.51, pctMile: 1430.17, waypoint: "PCTAID_652", name: "Screwdriver Creek", coordinates: [-121.7558923, 41.0376558], staticReliability: "seasonal-off-trail" },
  { routeMile: 13.56, pctMile: 1434.22, waypoint: "PCTAID_653", name: "Peavine Creek", coordinates: [-121.7848802, 41.0595609], staticReliability: "seasonal-alternate-access" },
  { routeMile: 17.78, pctMile: 1438.43, waypoint: "PCTAID_654", name: "Clark Spring", coordinates: [-121.7881085, 41.1015591], staticReliability: "seasonal-private-land-context" },
  { routeMile: 19.81, pctMile: 1440.47, waypoint: "PCTAID_655", name: "Deadman Creek", coordinates: [-121.7744761, 41.1188822], staticReliability: "private-land-context" },
  { routeMile: 21.36, pctMile: 1442.01, waypoint: "PCTAID_656", name: "Kosk Spring", coordinates: [-121.7713173, 41.1358169], staticReliability: "water-only-no-camp-assumption" },
  { routeMile: 28.16, pctMile: 1448.82, waypoint: "PCTAID_657", name: "Moosehead Creek", coordinates: [-121.8318419, 41.1771229], staticReliability: "reliable-but-brushy" },
  { routeMile: 28.57, pctMile: 1449.23, waypoint: "PCTAID_658", name: "Moosehead Creek alternate access", coordinates: [-121.8369645, 41.1751461], staticReliability: "limited-alternate" },
  { routeMile: 35.6, pctMile: 1456.26, waypoint: "PCTAID_659", name: "Alder Creek / Star City Creek", coordinates: [-121.9207581, 41.1646056], staticReliability: "seasonal-parser-date-incomplete" },
  { routeMile: 42.38, pctMile: 1463.04, waypoint: "PCTAID_661", name: "Deer Creek Spring", coordinates: [-121.9860782, 41.1356197], staticReliability: "spring" },
  { routeMile: 43.48, pctMile: 1464.13, waypoint: "PCTAID_662", name: "Deer Creek", coordinates: [-121.9874098, 41.1282766], staticReliability: "creek" },
  { routeMile: 44.6, pctMile: 1465.26, waypoint: "PCTAID_663", name: "Deer Creek second crossing", coordinates: [-122.0005176, 41.1294277], staticReliability: "creek" },
  { routeMile: 47.66, pctMile: 1468.31, waypoint: "PCTAID_664", name: "Butcherknife Creek tributary", coordinates: [-122.0251337, 41.1252769], staticReliability: "creek" },
  { routeMile: 48.01, pctMile: 1468.66, waypoint: "PCTAID_665", name: "Butcherknife Creek", coordinates: [-122.0265294, 41.1297141], staticReliability: "creek" },
  { routeMile: 48.19, pctMile: 1468.84, waypoint: "PCTAID_666", name: "McCloud drainage spring", coordinates: [-122.0284611, 41.1277224], staticReliability: "seasonal" },
  { routeMile: 48.37, pctMile: 1469.02, waypoint: "PCTAID_667", name: "McCloud drainage creek", coordinates: [-122.0295905, 41.1262207], staticReliability: "seasonal" },
  { routeMile: 48.72, pctMile: 1469.38, waypoint: "PCTAID_668", name: "McCloud drainage creek", coordinates: [-122.0321066, 41.1230707], staticReliability: "seasonal" },
  { routeMile: 51.844, pctMile: 1472.497, waypoint: "PCTAID_670", name: "Ash Camp / McCloud River", coordinates: [-122.0606252, 41.1170914], staticReliability: "major-drainage" },
];

function haversineMiles(a, b) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.7613;
  const deltaLatitude = toRadians(b[1] - a[1]);
  const deltaLongitude = toRadians(b[0] - a[0]);
  const value =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(a[1])) *
      Math.cos(toRadians(b[1])) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(value));
}

function nearestIndex(pathPoints, target) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  pathPoints.forEach((point, index) => {
    const distance = haversineMiles(point, target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function routeStats(pathPoints) {
  let distance = 0;
  let gain = 0;
  let loss = 0;
  let high = Number.NEGATIVE_INFINITY;
  let low = Number.POSITIVE_INFINITY;

  pathPoints.forEach((point, index) => {
    high = Math.max(high, point[2]);
    low = Math.min(low, point[2]);
    if (index === 0) return;
    distance += haversineMiles(pathPoints[index - 1], point);
    const elevationChange = point[2] - pathPoints[index - 1][2];
    if (elevationChange > 0) gain += elevationChange;
    else loss -= elevationChange;
  });

  return {
    distance: Number(distance.toFixed(3)),
    gain: Math.round(gain),
    loss: Math.round(loss),
    high: Math.round(high),
    low: Math.round(low),
  };
}

function routeGeometryFromOsrm(filePath, sampleEvery = 20) {
  if (!fs.existsSync(filePath)) return null;
  const response = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const route = response.routes?.[0];
  const coordinates = route?.geometry?.coordinates;
  if (!route || !Array.isArray(coordinates)) return null;

  const sampled = coordinates.filter(
    (_, index) => index % sampleEvery === 0 || index === coordinates.length - 1,
  );
  return {
    path: sampled,
    distanceMiles: Number((route.distance * MILES_PER_METER).toFixed(1)),
    durationHours: Number((route.duration / 3600).toFixed(1)),
    source: "OSRM road routing snapshot; verify live navigation before driving",
  };
}

function makeFeature({
  name,
  coordinates,
  day,
  routeMile,
  type,
  segment,
  pctMile,
  stopType,
  campStatus,
  packMode,
  notes,
}) {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [coordinates.longitude, coordinates.latitude] },
    properties: {
      name,
      day,
      itinerary: "express",
      segment,
      mile: pctMile,
      routeMile,
      type,
      stopType,
      campStatus,
      packMode,
      notes,
    },
  };
}

const data = JSON.parse(fs.readFileSync(publicPath, "utf8"));
const existingActivePath = data.route?.path ?? [];
const existingExtendedPath = data.route?.extendedPath ?? [];
const existingArchivedPreStartPath = data.route?.archivedPreStartPath ?? [];
const fullPath = existingArchivedPreStartPath.length
  ? [
      ...existingArchivedPreStartPath.slice(0, -1),
      ...existingActivePath,
      ...existingExtendedPath.slice(1),
    ]
  : existingExtendedPath.length
    ? [...existingActivePath, ...existingExtendedPath.slice(1)]
    : existingActivePath;

if (!fullPath.length) {
  throw new Error("The Garmin route path is missing");
}

const startIndex = nearestIndex(fullPath, BURNEY_FALLS_PCT_ACCESS);
const ashIndex = nearestIndex(fullPath, ASH_CAMP);
if (startIndex >= ashIndex) {
  throw new Error("Canonical Burney Falls start must precede Ash Camp");
}
const archivedPreStartPath = fullPath.slice(0, startIndex + 1);
const activePath = fullPath.slice(startIndex, ashIndex + 1);
const extendedPath = fullPath.slice(ashIndex);
const activeStats = routeStats(activePath);
const fullStats = routeStats(fullPath);

const retainedFeatures = (data.features ?? []).filter(
  (feature) => Number(feature.properties?.day) === -1,
);
const startCoordinates = {
  longitude: activePath[0][0],
  latitude: activePath[0][1],
};
const itineraryFeatures = [
  makeFeature({
    name: "Burney Falls State Park (Start)",
    coordinates: {
      longitude: BURNEY_FALLS_PCT_ACCESS[0],
      latitude: BURNEY_FALLS_PCT_ACCESS[1],
    },
    day: 0,
    routeMile: 0,
    pctMile: tripFacts.route.startPctMile,
    type: "Trailhead",
    segment: "Trip start",
  }),
  ...primaryItinerary.map((leg) =>
    makeFeature({
      name: leg.to,
      coordinates: leg.coordinates,
      day: leg.day,
      routeMile: leg.routeMileEnd,
      pctMile: leg.pctMileEnd,
      type:
        leg.stopType === "support-transfer"
          ? "Support Transfer"
          : leg.day === primaryItinerary.length
            ? "Finish"
            : "Camp",
      stopType: leg.stopType,
      campStatus: leg.campStatus,
      packMode: leg.packMode,
      notes: leg.note,
      segment:
        leg.day === primaryItinerary.length
          ? "Ash Camp pickup with Mikaela; FS Road 38N11 condition check required"
          : leg.stopType === "support-transfer"
            ? `${leg.distance.toFixed(1)} mi supported day-pack traverse; extract immediately and return to this exact crossing on Day 4`
            : `${leg.distance.toFixed(1)} mi; ${leg.water}`,
    }),
  ),
];

data.route = {
  ...data.route,
  name: "Burney Falls to Ash Camp",
  path: activePath,
  archivedPreStartPath,
  extendedPath,
  metadata: {
    ...data.route.metadata,
    source_of_truth_version: "2026-07-29-normalized-garmin-v3",
    geometry_source: tripFacts.route.geometrySource,
    elevation_source: tripFacts.route.elevationSource,
    start_name: tripFacts.route.start,
    start_coordinate: BURNEY_FALLS_PCT_ACCESS,
    start_pct_mile: tripFacts.route.startPctMile,
    active_endpoint: "Ash Camp",
    finish_coordinate: ASH_CAMP,
    finish_pct_mile: tripFacts.route.finishPctMile,
    active_points: activePath.length,
    active_distance_miles: tripFacts.route.officialMiles,
    active_gps_distance_miles: activeStats.distance,
    distance_display_miles: tripFacts.route.displayMiles,
    distance_method: "PCTA January 2026 centerline endpoints",
    archived_pre_start_points: archivedPreStartPath.length,
    archived_pre_start_status: "excluded-from-active-trip",
    full_track_points: fullPath.length,
    full_track_distance_miles: fullStats.distance,
    user_supplied_garmin_export_distance_miles:
      tripFacts.route.extendedAlternative.sourceTrackMiles,
    user_supplied_garmin_active_crop_miles: 51.153,
    user_supplied_garmin_source_sha256:
      "9073d39f82e0e6ee68f7acc050e857b235bf3ea8b527c4fa7e9110aca2d2e6e1",
    legacy_app_full_track_distance_miles:
      tripFacts.route.extendedAlternative.legacyAppMiles,
    full_track_reconciliation:
      "The supplied Garmin exports measure 80.826 miles. Existing archived app geometry measures 82.898 miles because it is a different legacy crop. Neither controls the active 51.844-mile trip.",
    extended_route_status: "historical-future-reference-only",
  },
  properties: {
    min_elevation: 2457,
    max_elevation: tripFacts.route.highPointFeet,
    total_gain_feet: tripFacts.route.totalGainFeet,
    total_loss_feet: tripFacts.route.totalLossFeet,
    elevation_accumulation_method:
      "User-supplied Garmin GPX resampled every 25m, centered 200m smoothing, cumulative 20-foot threshold carried continuously across day boundaries",
    segments: primaryItinerary.map((leg) => ({
      day: leg.day,
      distance: leg.distance,
      start: leg.from,
      end: leg.to,
      gain: leg.elevation.gain,
      loss: leg.elevation.loss,
      startElevation: leg.elevation.start,
      endElevation: leg.elevation.end,
      highPoint: leg.elevation.high,
      stopType: leg.stopType,
      packMode: leg.packMode,
    })),
  },
};

data.features = [...retainedFeatures, ...itineraryFeatures];
data.waterSources = ACTIVE_WATER_SOURCES.map(
  ({ routeMile, pctMile, waypoint, name, coordinates, staticReliability }) => ({
    mile: pctMile,
    pctMile,
    routeMile,
    waypoint,
    name,
    coordinates,
    report:
      "Static water location only. Merge with the newest timestamped Supabase/PCT Water/FarOut observation before relying on it.",
    reliability: staticReliability,
    reportStatus: "current-condition-check-required",
    locationSource: "PCTA 2026 mile remap with legacy waypoint coordinates",
    type: "water",
  }),
);
data.transport = [
  {
    name: "San Jose International Airport (SJC)",
    type: "airport",
    coordinates: [-121.9289, 37.3639],
    notes:
      "Working schedule: UA481 arrives August 28 at 10:36 PM PDT. Verify in United Manage Trip.",
  },
  {
    name: "Burney Falls Trailhead",
    type: "trailhead-parking",
    coordinates: startCoordinates,
    notes:
      "August 29 hiking start after sleeping near SJC and driving north early that morning.",
  },
  {
    name: "Bartle Gap Supported Transfer",
    type: "support-transfer",
    coordinates: [-121.81993729434907, 41.17064891383052],
    notes:
      "August 31 exact PCT pickup and September 1 exact-point re-entry. This is not a campsite. Confirm high-clearance road access, gate status, driver, pickup window, pack transfer, staged water, and no-contact fallback.",
  },
  {
    name: "Ash Camp Pickup",
    type: "shuttle-point",
    coordinates: ASH_CAMP,
    notes:
      "September 5 primary pickup; September 6 contingency. FS Road 38N11 is rough and must be rechecked.",
  },
];

const inboundRoute = routeGeometryFromOsrm(inboundRoutePath);
const returnRoute = routeGeometryFromOsrm(returnRoutePath);
const existingDriveSegments = data.driveSegments ?? [];
data.driveSegments = [
  inboundRoute
    ? {
        name: "SJC → Burney Falls",
        type: "drive",
        ...inboundRoute,
      }
    : existingDriveSegments.find(
        (segment) => segment.name === "SJC → Burney Falls",
      ),
  returnRoute
    ? {
        name: "Ash Camp → Campbell",
        type: "drive",
        ...returnRoute,
      }
    : existingDriveSegments.find(
        (segment) => segment.name === "Ash Camp → Campbell",
      ),
].filter(Boolean);

data.activePlan = {
  distanceMiles: tripFacts.route.officialMiles,
  gpsDistanceMiles: tripFacts.route.gpsMiles,
  distanceDisplayMiles: tripFacts.route.displayMiles,
  hikingDays: tripFacts.route.hikingDays,
  finish: tripFacts.route.finish,
  finishDate: tripFacts.dates.hikingFinish,
  contingencyDate: tripFacts.dates.contingency,
  userSuppliedSourceTrackMiles:
    tripFacts.route.extendedAlternative.sourceTrackMiles,
  legacyAppFullTrackMiles: tripFacts.route.extendedAlternative.legacyAppMiles,
  extendedRouteStatus: "future-trip-only",
  supportedTraverse: {
    date: "2026-08-31",
    startRouteMile: 14.287,
    endRouteMile: 26.878,
    distanceMiles: 12.591,
    packMode: "day-pack-supported",
    extraction: "Bartle Gap exact PCT crossing",
    status: "route-resolved-booking-and-road-check-required",
  },
};

const output = `${JSON.stringify(data, null, 2)}\n`;
fs.writeFileSync(publicPath, output);
if (fs.existsSync(sourceMirrorPath)) {
  fs.writeFileSync(sourceMirrorPath, output);
}
fs.writeFileSync(mobilePath, output);

console.log(
  `Configured ${tripFacts.route.officialMiles.toFixed(3)} official miles (${activeStats.distance.toFixed(
    3,
  )} Garmin miles) to Ash Camp; archived ${routeStats(archivedPreStartPath).distance.toFixed(
    1,
  )} pre-start miles and retained ${routeStats(extendedPath).distance.toFixed(
    1,
  )} post-Ash miles as non-active reference geometry.`,
);
