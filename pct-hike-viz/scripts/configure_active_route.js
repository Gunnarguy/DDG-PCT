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

const ASH_CAMP = [-122.0606252, 41.1170914];
const MILES_PER_METER = 1 / 1609.344;
const ACTIVE_WATER_SOURCES = [
  [1420.7, "HM-START", "Burney Falls State Park water", -121.620709, 41.01348],
  [1424.7, "HM-ROCK", "Rock Creek", -121.7136343, 41.0250791],
  [1427.9, "HM-UPPER-JAKE", "Upper Jake Spring", -121.7513636, 41.0306833],
  [1428.5, "HM-SCREWDRIVER", "Screwdriver Creek", -121.7558923, 41.0376558],
  [1431.9, "HM-PEAVINE", "Peavine Creek", -121.7848802, 41.0595609],
  [1435.5, "HM-CLARK", "Clark Creek", -121.7881085, 41.1015591],
  [1437.0, "HM-DEADMAN", "Deadman Creek", -121.7744761, 41.1188822],
  [1438.7, "HM-KOSK", "Kosk Spring", -121.7713173, 41.1358169],
  [1445.1, "HM-MOOSEHEAD-1", "Moosehead Creek", -121.8318419, 41.1771229],
  [1445.4, "HM-MOOSEHEAD-2", "Moosehead Creek alternate access", -121.8369645, 41.1751461],
  [1453.4, "HM-STAR-CITY", "Alder Creek / Star City Creek", -121.9207581, 41.1646056],
  [1458.5, "HM-DEER-SPRING", "Deer Creek Spring", -121.9860782, 41.1356197],
  [1459.1, "HM-DEER-1", "Deer Creek", -121.9874098, 41.1282766],
  [1460.0, "HM-DEER-2", "Deer Creek second crossing", -122.0005176, 41.1294277],
  [1465.8, "HM-BUTCHER-TRIB", "Butcherknife Creek tributary", -122.0251337, 41.1252769],
  [1466.1, "HM-BUTCHER", "Butcherknife Creek", -122.0265294, 41.1297141],
  [1467.0, "HM-WA1467", "McCloud River drainage seasonal water", -122.0284611, 41.1277224],
  [1467.2, "HM-WA1467B", "McCloud River drainage seasonal water", -122.0295905, 41.1262207],
  [1468.0, "HM-WA1468", "McCloud River drainage seasonal water", -122.0321066, 41.1230707],
  [1472.0, "HM-ASH", "Ash Camp / McCloud River", -122.0606252, 41.1170914],
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
    distance: Number(distance.toFixed(1)),
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

function makeFeature({ name, coordinates, day, routeMile, type, segment, pctMile }) {
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
    },
  };
}

const data = JSON.parse(fs.readFileSync(publicPath, "utf8"));
const existingActivePath = data.route?.path ?? [];
const existingExtendedPath = data.route?.extendedPath ?? [];
const fullPath = existingExtendedPath.length
  ? [...existingActivePath, ...existingExtendedPath.slice(1)]
  : existingActivePath;

if (!fullPath.length) {
  throw new Error("The Garmin route path is missing");
}

const ashIndex = nearestIndex(fullPath, ASH_CAMP);
const activePath = fullPath.slice(0, ashIndex + 1);
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
    coordinates: startCoordinates,
    day: 0,
    routeMile: 0,
    pctMile: 1420.7,
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
      type: leg.day === 9 ? "Finish" : "Camp",
      segment:
        leg.day === 9
          ? "Ash Camp pickup with Mikaela; FS Road 38N11 condition check required"
          : `${leg.distance.toFixed(1)} mi; ${leg.water}`,
    }),
  ),
];

data.route = {
  ...data.route,
  name: "Burney Falls to Ash Camp",
  path: activePath,
  extendedPath,
  metadata: {
    ...data.route.metadata,
    active_endpoint: "Ash Camp",
    active_points: activePath.length,
    active_distance_miles: activeStats.distance,
    full_track_points: fullPath.length,
    full_track_distance_miles: fullStats.distance,
    extended_route_status: "future-trip-only",
  },
  properties: {
    min_elevation: activeStats.low,
    max_elevation: activeStats.high,
    total_gain_feet: activeStats.gain,
    total_loss_feet: activeStats.loss,
    segments: primaryItinerary.map((leg) => ({
      day: leg.day,
      distance: leg.distance,
      start: leg.from,
      end: leg.to,
      gain: leg.elevation.gain,
      loss: leg.elevation.loss,
    })),
  },
};

data.features = [...retainedFeatures, ...itineraryFeatures];
data.waterSources = ACTIVE_WATER_SOURCES.map(
  ([mile, waypoint, name, longitude, latitude]) => ({
    mile,
    waypoint,
    name,
    coordinates: [longitude, latitude],
    report:
      "Mapped water access only. Current flow and potability are unverified; check FarOut/PCT Water Report and ranger guidance immediately before relying on it.",
    reliability: "unverified",
    reportStatus: "current-condition-check-required",
    locationSource: "Halfmile 2023 GPS waypoint",
    type: "water",
  }),
);
data.transport = [
  {
    name: "San Jose International Airport (SJC)",
    type: "airport",
    coordinates: [-121.9289, 37.3639],
    notes: "Dan and Drew arrive August 28 at 6:05 PM.",
  },
  {
    name: "Burney Falls Trailhead",
    type: "trailhead-parking",
    coordinates: startCoordinates,
    notes: "August 29 hiking start; late-night staging access must be confirmed.",
  },
  {
    name: "Ash Camp Pickup",
    type: "shuttle-point",
    coordinates: ASH_CAMP,
    notes:
      "September 6 primary finish. FS Road 38N11 is rough; verify Kia Sportage access with the McCloud Ranger Station.",
  },
];

const inboundRoute = routeGeometryFromOsrm(inboundRoutePath);
const returnRoute = routeGeometryFromOsrm(returnRoutePath);
data.driveSegments = [
  inboundRoute && {
    name: "SJC → Burney Falls",
    type: "drive",
    ...inboundRoute,
  },
  returnRoute && {
    name: "Ash Camp → Campbell",
    type: "drive",
    ...returnRoute,
  },
].filter(Boolean);

data.activePlan = {
  distanceMiles: tripFacts.route.gpsMiles,
  hikingDays: tripFacts.route.hikingDays,
  finish: tripFacts.route.finish,
  finishDate: tripFacts.dates.hikingFinish,
  extendedRouteMiles: tripFacts.route.extendedAlternative.gpsMiles,
  extendedRouteStatus: "future-trip-only",
};

const output = `${JSON.stringify(data, null, 2)}\n`;
fs.writeFileSync(publicPath, output);
if (fs.existsSync(sourceMirrorPath)) {
  fs.writeFileSync(sourceMirrorPath, output);
}
fs.writeFileSync(mobilePath, output);

console.log(
  `Configured ${activeStats.distance.toFixed(1)} active miles to Ash Camp; retained ${(
    fullStats.distance - activeStats.distance
  ).toFixed(1)} extended miles for a future trip.`,
);
