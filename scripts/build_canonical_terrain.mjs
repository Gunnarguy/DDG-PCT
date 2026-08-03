#!/usr/bin/env node

/**
 * Builds the versioned terrain contract for the active Burney Falls → Ash Camp
 * trip.  It deliberately keeps three different facts separate:
 *
 *   1. PCTA centerline + PCTA 2026 mile markers control geometry and mileage.
 *   2. USGS 3DEP controls the terrain/elevation profile.
 *   3. Gunnar's Garmin exports remain independent corroboration, not the
 *      authority that can silently move the route or its daily mileage.
 *
 * The generated JSON is intentionally an intermediate canonical artifact. A
 * separate bundle generator turns it into the web and iOS runtime files.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PCTA_CENTERLINE_SERVICE =
  "https://services5.arcgis.com/ZldHa25efPFpMmfB/arcgis/rest/services/PCTA_Centerline/FeatureServer";
const PCTA_MARKERS_SERVICE =
  "https://services5.arcgis.com/ZldHa25efPFpMmfB/arcgis/rest/services/PCT_Mile_Markers_2026/FeatureServer";
const USGS_3DEP_SERVICE =
  "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/getSamples";

const DEFAULT_SOURCE_OUTPUT = path.join(
  ROOT,
  "docs",
  "data",
  "source",
  "pcta-centerline-2026-burney-ash.geojson",
);
const DEFAULT_OUTPUT = path.join(
  ROOT,
  "docs",
  "data",
  "canonical",
  "burney-ash-terrain-2026.json",
);
const DEFAULT_DAY_SOURCE = path.join(
  ROOT,
  "pct-hike-viz",
  "public",
  "data",
  "hike_data.json",
);
const GARMIN_PRIMARY = path.join(
  ROOT,
  "docs",
  "data",
  "source",
  "garmin-section-o-80.826mi.gpx",
);
const GARMIN_ALTERNATE = path.join(
  ROOT,
  "docs",
  "data",
  "source",
  "garmin-section-o-alternate.gpx",
);

const START_PCT_MILE = 1420.653;
const FINISH_PCT_MILE = 1472.497;
const MILES_PER_METER = 1 / 1609.344;
const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.280839895;
const EARTH_RADIUS_METERS = 6_371_008.8;
const SAMPLE_INTERVAL_METERS = 25;
const SELECTED_SMOOTHING_METERS = 200;
const SELECTED_THRESHOLD_FEET = 20;
const TERRAIN_CONTRACT_VERSION = "2026-08-02-pcta-usgs-v1";

function parseArgs() {
  const args = process.argv.slice(2);
  const valueFor = (flag, fallback) => {
    const index = args.indexOf(flag);
    return index >= 0 && args[index + 1]
      ? path.resolve(args[index + 1])
      : fallback;
  };

  return {
    refreshPcta: args.includes("--refresh-pcta"),
    sourceOutput: valueFor("--source-output", DEFAULT_SOURCE_OUTPUT),
    output: valueFor("--output", DEFAULT_OUTPUT),
    daySource: valueFor("--day-source", DEFAULT_DAY_SOURCE),
  };
}

function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function haversineMeters(a, b) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitude1 = radians(a[1]);
  const latitude2 = radians(b[1]);
  const latitudeDelta = latitude2 - latitude1;
  const longitudeDelta = radians(b[0] - a[0]);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(value));
}

function localMeters(coordinate, origin) {
  const latitudeRadians = (origin[1] * Math.PI) / 180;
  return [
    (coordinate[0] - origin[0]) * 111_320 * Math.cos(latitudeRadians),
    (coordinate[1] - origin[1]) * 110_540,
  ];
}

function distanceSquaredDegrees(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

function cumulativeStations(points) {
  let stationMeters = 0;
  return points.map((coordinate, index) => {
    if (index > 0) stationMeters += haversineMeters(points[index - 1], coordinate);
    return stationMeters;
  });
}

function nearestVertexIndex(points, target) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += 1) {
    const distance = distanceSquaredDegrees(points[index], target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function nearestPointOnSegment(target, start, end) {
  const origin = target;
  const [targetX, targetY] = localMeters(target, origin);
  const [startX, startY] = localMeters(start, origin);
  const [endX, endY] = localMeters(end, origin);
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const denominator = segmentX ** 2 + segmentY ** 2;
  const ratio = denominator
    ? Math.max(
        0,
        Math.min(
          1,
          ((targetX - startX) * segmentX + (targetY - startY) * segmentY) /
            denominator,
        ),
      )
    : 0;
  const coordinate = [
    start[0] + (end[0] - start[0]) * ratio,
    start[1] + (end[1] - start[1]) * ratio,
  ];
  return {
    ratio,
    coordinate,
    distanceMeters: haversineMeters(target, coordinate),
  };
}

function nearestPointOnPolyline(points, stations, target) {
  let best = {
    index: 0,
    ratio: 0,
    coordinate: points[0],
    stationMeters: 0,
    distanceMeters: Number.POSITIVE_INFINITY,
  };

  for (let index = 1; index < points.length; index += 1) {
    const candidate = nearestPointOnSegment(target, points[index - 1], points[index]);
    if (candidate.distanceMeters < best.distanceMeters) {
      const segmentMeters = stations[index] - stations[index - 1];
      best = {
        index: index - 1,
        ...candidate,
        stationMeters: stations[index - 1] + segmentMeters * candidate.ratio,
      };
    }
  }
  return best;
}

function pointAtStation(points, stations, targetStation) {
  if (targetStation <= 0) return [...points[0]];
  const finalStation = stations.at(-1);
  if (targetStation >= finalStation) return [...points.at(-1)];

  let low = 0;
  let high = stations.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (stations[middle] < targetStation) low = middle + 1;
    else high = middle - 1;
  }

  const index = Math.max(1, low);
  const previousStation = stations[index - 1];
  const nextStation = stations[index];
  const ratio =
    nextStation > previousStation
      ? (targetStation - previousStation) / (nextStation - previousStation)
      : 0;
  return [
    points[index - 1][0] + (points[index][0] - points[index - 1][0]) * ratio,
    points[index - 1][1] + (points[index][1] - points[index - 1][1]) * ratio,
  ];
}

function buildPolylineBetweenStations(points, stations, startStation, finishStation) {
  const crop = [pointAtStation(points, stations, startStation)];
  for (let index = 1; index < points.length - 1; index += 1) {
    if (stations[index] > startStation && stations[index] < finishStation) {
      crop.push([...points[index]]);
    }
  }
  crop.push(pointAtStation(points, stations, finishStation));
  return crop;
}

function stationForMile(markerStations, mile) {
  const direct = markerStations.find((marker) => marker.mile === mile);
  if (direct) return direct.stationMeters;

  const lower = markerStations.filter((marker) => marker.mile < mile).at(-1);
  const upper = markerStations.find((marker) => marker.mile > mile);
  if (!lower || !upper) {
    throw new Error(`PCTA marker data cannot interpolate PCT mile ${mile}`);
  }
  const ratio = (mile - lower.mile) / (upper.mile - lower.mile);
  return lower.stationMeters + (upper.stationMeters - lower.stationMeters) * ratio;
}

function mileForStation(markerStations, stationMeters) {
  const direct = markerStations.find(
    (marker) => Math.abs(marker.stationMeters - stationMeters) < 0.0001,
  );
  if (direct) return direct.mile;

  const lower = markerStations.filter((marker) => marker.stationMeters < stationMeters).at(-1);
  const upper = markerStations.find((marker) => marker.stationMeters > stationMeters);
  if (!lower || !upper) {
    throw new Error(`PCTA marker data cannot interpolate route station ${stationMeters}`);
  }
  const ratio =
    (stationMeters - lower.stationMeters) /
    (upper.stationMeters - lower.stationMeters);
  return lower.mile + (upper.mile - lower.mile) * ratio;
}

async function fetchJson(url, params = {}, options = {}) {
  const search = new URLSearchParams(params);
  const target = search.size ? `${url}?${search}` : url;
  const response = await fetch(target, options);
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (payload?.error) {
    throw new Error(`${url} returned ${JSON.stringify(payload.error)}`);
  }
  return payload;
}

async function fetchPctaSource() {
  const [service, centerline, markerCollection] = await Promise.all([
    fetchJson(PCTA_CENTERLINE_SERVICE, { f: "json" }),
    fetchJson(`${PCTA_CENTERLINE_SERVICE}/0/query`, {
      where: "1=1",
      outFields: "OBJECTID",
      returnGeometry: "true",
      returnZ: "false",
      outSR: "4326",
      f: "geojson",
    }),
    fetchJson(`${PCTA_MARKERS_SERVICE}/0/query`, {
      where: "Mile >= 1420 AND Mile <= 1473 AND RouteID = 'PCT'",
      outFields: "Mile,Mile_SoBo,RouteID,lat,lon",
      returnGeometry: "true",
      outSR: "4326",
      orderByFields: "Mile ASC",
      f: "geojson",
    }),
  ]);

  const centerlineFeature = centerline.features?.[0];
  const fullLine = centerlineFeature?.geometry?.coordinates;
  if (!Array.isArray(fullLine) || fullLine.length < 2) {
    throw new Error("PCTA Centerline response did not contain a LineString");
  }

  const startControl = [-121.65376551, 41.01104125];
  const finishControl = [-122.0606252, 41.1170914];
  const roughStart = nearestVertexIndex(fullLine, startControl);
  const roughFinish = nearestVertexIndex(fullLine, finishControl);
  if (roughStart >= roughFinish) {
    throw new Error("PCTA centerline was not ordered south-to-north around the active route");
  }

  // The 2026 marker query lets us set exact official mileage on a precise
  // centerline crop. The extra vertices cover the half-mile markers just
  // outside the trip endpoints.
  const paddingVertices = 3_000;
  const windowStart = Math.max(0, roughStart - paddingVertices);
  const windowFinish = Math.min(fullLine.length - 1, roughFinish + paddingVertices);
  const windowLine = fullLine.slice(windowStart, windowFinish + 1);
  const windowStations = cumulativeStations(windowLine);

  const markerStations = (markerCollection.features ?? [])
    .map((feature) => {
      const mile = Number(feature.properties?.Mile);
      const coordinate = feature.geometry?.coordinates;
      if (!Number.isFinite(mile) || !Array.isArray(coordinate)) return null;
      const snapped = nearestPointOnPolyline(windowLine, windowStations, coordinate);
      return {
        mile,
        coordinate: coordinate.map((value) => round(value, 9)),
        snappedCoordinate: snapped.coordinate.map((value) => round(value, 9)),
        stationMeters: snapped.stationMeters,
        offsetFeet: snapped.distanceMeters * FEET_PER_METER,
      };
    })
    .filter(Boolean)
    .sort((first, second) => first.mile - second.mile);

  if (markerStations.length < 100) {
    throw new Error(`PCTA marker query returned only ${markerStations.length} relevant markers`);
  }
  for (let index = 1; index < markerStations.length; index += 1) {
    if (markerStations[index].stationMeters <= markerStations[index - 1].stationMeters) {
      throw new Error("PCTA 2026 marker stations are not strictly northbound");
    }
  }

  const startStation = stationForMile(markerStations, START_PCT_MILE);
  const finishStation = stationForMile(markerStations, FINISH_PCT_MILE);
  const rawPath = buildPolylineBetweenStations(
    windowLine,
    windowStations,
    startStation,
    finishStation,
  );
  const rawStations = cumulativeStations(rawPath);
  const routeMeters = rawStations.at(-1);
  const routeMiles = routeMeters * MILES_PER_METER;

  if (Math.abs(routeMiles - (FINISH_PCT_MILE - START_PCT_MILE)) > 0.03) {
    throw new Error(
      `PCTA geometry length ${routeMiles.toFixed(3)} mi does not agree with marker span ${(FINISH_PCT_MILE - START_PCT_MILE).toFixed(3)} mi`,
    );
  }

  const routeMarkerStations = markerStations
    .filter(
      (marker) =>
        marker.stationMeters >= startStation - 0.01 &&
        marker.stationMeters <= finishStation + 0.01,
    )
    .map((marker) => ({
      ...marker,
      stationMeters: round(marker.stationMeters - startStation, 4),
      routeMile: round(marker.mile - START_PCT_MILE, 6),
      offsetFeet: round(marker.offsetFeet, 1),
    }));

  return {
    rawPath,
    markerStations: routeMarkerStations,
    sourceMetadata: {
      capturedAt: new Date().toISOString(),
      centerlineService: PCTA_CENTERLINE_SERVICE,
      markerService: PCTA_MARKERS_SERVICE,
      serviceDescription: service.serviceDescription ?? null,
      serviceItemId: service.serviceItemId ?? null,
      serviceCurrentVersion: service.currentVersion ?? null,
      centerlineObjectId: centerlineFeature.properties?.OBJECTID ?? null,
      fullCenterlinePointCount: fullLine.length,
      cropRawPointCount: rawPath.length,
      cropNativeMeters: round(routeMeters, 3),
      cropNativeMiles: round(routeMiles, 6),
      startPctaMile: START_PCT_MILE,
      finishPctaMile: FINISH_PCT_MILE,
      officialPctaMiles: round(FINISH_PCT_MILE - START_PCT_MILE, 6),
      startControlCoordinate: startControl,
      finishControlCoordinate: finishControl,
    },
  };
}

async function readCachedPctaSource(sourcePath) {
  const payload = JSON.parse(await fs.readFile(sourcePath, "utf8"));
  const rawPath = payload.features?.find(
    (feature) => feature.geometry?.type === "LineString",
  )?.geometry?.coordinates;
  const markerStations = payload.metadata?.markerStations;
  if (!Array.isArray(rawPath) || rawPath.length < 2 || !Array.isArray(markerStations)) {
    throw new Error(`Cached PCTA source ${sourcePath} has an invalid schema`);
  }
  return {
    rawPath,
    markerStations,
    sourceMetadata: payload.metadata?.sourceMetadata ?? {},
  };
}

async function writePctaSource(sourcePath, source) {
  const content = {
    type: "FeatureCollection",
    name: "PCTA 2026-mile-marker-calibrated Burney Falls to Ash Camp centerline crop",
    metadata: {
      sourceMetadata: source.sourceMetadata,
      markerStations: source.markerStations,
      geometrySha256: hash(
        source.rawPath
          .map((coordinate) => coordinate.map((value) => Number(value).toFixed(9)).join(","))
          .join("\n"),
      ),
      purpose:
        "Canonical PCTA geometry source crop. Runtime terrain values are sampled separately from USGS 3DEP.",
    },
    features: [
      {
        type: "Feature",
        properties: {
          name: "Burney Falls PCT access to Ash Camp",
          startPctMile: START_PCT_MILE,
          finishPctMile: FINISH_PCT_MILE,
        },
        geometry: { type: "LineString", coordinates: source.rawPath },
      },
    ],
  };
  await fs.mkdir(path.dirname(sourcePath), { recursive: true });
  await fs.writeFile(sourcePath, `${JSON.stringify(content, null, 2)}\n`);
}

function readDayStops(source) {
  const features = source.features ?? [];
  const stops = features
    .filter((feature) => {
      const day = Number(feature.properties?.day);
      return Number.isInteger(day) && day >= 0 && day <= 8;
    })
    .map((feature) => {
      const properties = feature.properties ?? {};
      const day = Number(properties.day);
      const routeMile = Number(properties.routeMile);
      const pctMile = Number.isFinite(Number(properties.pctMile))
        ? Number(properties.pctMile)
        : START_PCT_MILE + routeMile;
      const coordinates = feature.geometry?.coordinates;
      if (!Number.isFinite(routeMile) || !Array.isArray(coordinates)) {
        throw new Error(`Day ${day} in runtime source has no usable route mile or coordinates`);
      }
      return {
        day,
        name: properties.name ?? `Day ${day}`,
        routeMile,
        pctMile,
        fieldCoordinates: coordinates.slice(0, 2),
        stopType: properties.stopType ?? (day === 8 ? "finish" : "camp"),
        campStatus: properties.campStatus ?? null,
        packMode: properties.packMode ?? (day === 3 ? "day-pack-supported" : "overnight-pack"),
        notes: properties.notes ?? "",
      };
    })
    .sort((first, second) => first.day - second.day);

  if (stops.length !== 9 || stops[0].day !== 0 || stops.at(-1).day !== 8) {
    throw new Error("Expected Day 0 plus eight active itinerary stops in the current source dataset");
  }
  if (Math.abs(stops[0].pctMile - START_PCT_MILE) > 0.001) {
    throw new Error("Current Day 0 no longer matches the official Burney Falls PCTA mile");
  }
  if (Math.abs(stops.at(-1).pctMile - FINISH_PCT_MILE) > 0.001) {
    throw new Error("Current Day 8 no longer matches the official Ash Camp PCTA mile");
  }
  return stops;
}

function resampleRoute(rawPath, markerStations, dayStops) {
  const rawStations = cumulativeStations(rawPath);
  const rawTotalMeters = rawStations.at(-1);
  const markerAbsoluteStations = [
    { mile: START_PCT_MILE, stationMeters: 0 },
    ...markerStations.map((marker) => ({
      mile: marker.mile,
      stationMeters: marker.stationMeters,
    })),
    { mile: FINISH_PCT_MILE, stationMeters: rawTotalMeters },
  ]
    .sort((first, second) => first.mile - second.mile)
    .filter(
      (marker, index, markers) =>
        index === 0 || marker.mile !== markers[index - 1].mile,
    );

  const mandatory = dayStops.map((stop) => ({
    day: stop.day,
    routeMile: stop.routeMile,
    pctMile: stop.pctMile,
    stationMeters: stationForMile(markerAbsoluteStations, stop.pctMile),
  }));
  const targets = new Map();
  for (
    let stationMeters = 0;
    stationMeters < rawTotalMeters;
    stationMeters += SAMPLE_INTERVAL_METERS
  ) {
    targets.set(round(stationMeters, 6), { stationMeters });
  }
  targets.set(round(rawTotalMeters, 6), { stationMeters: rawTotalMeters });
  mandatory.forEach((boundary) => {
    targets.set(round(boundary.stationMeters, 6), boundary);
  });

  const route = [...targets.values()]
    .sort((first, second) => first.stationMeters - second.stationMeters)
    .map((target) => {
      const pctMile = Number.isFinite(target.pctMile)
        ? target.pctMile
        : mileForStation(markerAbsoluteStations, target.stationMeters);
      return {
        coordinates: pointAtStation(rawPath, rawStations, target.stationMeters),
        stationMeters: target.stationMeters,
        routeMile: Number.isFinite(target.routeMile)
          ? target.routeMile
          : pctMile - START_PCT_MILE,
        pctMile,
        boundaryDay: target.day ?? null,
      };
    });

  for (const dayStop of dayStops) {
    const index = route.findIndex((point) => point.boundaryDay === dayStop.day);
    if (index < 0) throw new Error(`Unable to insert exact Day ${dayStop.day} PCTA boundary`);
    dayStop.pointIndex = index;
    dayStop.trailCoordinates = route[index].coordinates;
    dayStop.trailOffsetFeet = round(
      haversineMeters(dayStop.fieldCoordinates, dayStop.trailCoordinates) * FEET_PER_METER,
      0,
    );
  }

  return route;
}

async function fetchUsgsElevations(route) {
  const samples = new Array(route.length);
  const tiles = new Map();
  const batchSize = 300;
  // 3DEP occasionally returns a transient 502 under concurrent multipoint
  // load. Sequential batches are slower but materially safer for the one
  // pre-trip terrain receipt we are producing.
  const workers = 1;
  let nextBatch = 0;
  const batches = [];
  for (let start = 0; start < route.length; start += batchSize) {
    batches.push({ start, points: route.slice(start, start + batchSize) });
  }

  async function worker() {
    while (nextBatch < batches.length) {
      const batchIndex = nextBatch;
      nextBatch += 1;
      const batch = batches[batchIndex];
      const body = new URLSearchParams({
        f: "json",
        geometry: JSON.stringify({
          points: batch.points.map((point) => point.coordinates),
          spatialReference: { wkid: 4326 },
        }),
        geometryType: "esriGeometryMultipoint",
        sampleDistance: "1",
        outFields:
          "Name,ProductName,Source,VerticalDatum,AcquisitionDate,pubdate,title",
      });
      let payload = null;
      let finalStatus = null;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const response = await fetch(USGS_3DEP_SERVICE, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body,
        });
        finalStatus = response.status;
        if (response.ok) {
          payload = await response.json();
          break;
        }
        if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 3) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
      if (!payload) {
        throw new Error(
          `USGS 3DEP elevation service returned HTTP ${finalStatus} for batch ${batchIndex + 1}`,
        );
      }
      if (!Array.isArray(payload.samples)) {
        throw new Error(`USGS 3DEP did not return samples for batch ${batchIndex + 1}`);
      }
      for (const sample of payload.samples) {
        const locationId = Number(sample.locationId);
        const elevationMeters = Number(sample.value);
        if (!Number.isInteger(locationId) || !Number.isFinite(elevationMeters)) continue;
        samples[batch.start + locationId] = {
          elevationFeet: elevationMeters * FEET_PER_METER,
          attributes: sample.attributes ?? {},
        };
      }
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  if (samples.some((sample) => !sample || !Number.isFinite(sample.elevationFeet))) {
    throw new Error("USGS 3DEP did not return a usable elevation for every route point");
  }
  samples.forEach((sample) => {
    const key = sample.attributes.title ?? "USGS 3DEP";
    const existing = tiles.get(key) ?? { count: 0, attributes: sample.attributes };
    existing.count += 1;
    tiles.set(key, existing);
  });
  return {
    samples,
    sourceTiles: [...tiles.entries()].map(([title, value]) => ({
      title,
      pointCount: value.count,
      productName: value.attributes.ProductName ?? null,
      source: value.attributes.Source ?? null,
      verticalDatum: value.attributes.VerticalDatum ?? null,
      acquisitionDate: value.attributes.AcquisitionDate ?? null,
      publicationDate: value.attributes.pubdate ?? null,
    })),
  };
}

function smoothElevations(points, windowMeters) {
  const radius = windowMeters / 2;
  const prefix = [0];
  points.forEach((point) => {
    prefix.push(prefix.at(-1) + point.usgsElevationFeet);
  });

  let lower = 0;
  let upper = 0;
  return points.map((point, index) => {
    while (
      lower < index &&
      points[lower].stationMeters < point.stationMeters - radius
    ) {
      lower += 1;
    }
    while (
      upper + 1 < points.length &&
      points[upper + 1].stationMeters <= point.stationMeters + radius
    ) {
      upper += 1;
    }
    return (prefix[upper + 1] - prefix[lower]) / (upper - lower + 1);
  });
}

function calculateMetrics(points, dayStops, smoothingMeters, thresholdFeet) {
  const smoothed = smoothElevations(points, smoothingMeters);
  const bounds = dayStops.map((stop) => ({
    ...stop,
    index: stop.pointIndex,
  }));
  const daily = bounds.slice(1).map((boundary, index) => {
    const start = bounds[index];
    const elevations = smoothed.slice(start.index, boundary.index + 1);
    return {
      day: boundary.day,
      startRouteMile: start.routeMile,
      endRouteMile: boundary.routeMile,
      startPctMile: start.pctMile,
      endPctMile: boundary.pctMile,
      distanceMiles: boundary.routeMile - start.routeMile,
      startElevationFeet: smoothed[start.index],
      endElevationFeet: smoothed[boundary.index],
      highPointFeet: Math.max(...elevations),
      lowPointFeet: Math.min(...elevations),
      gainFeet: 0,
      lossFeet: 0,
    };
  });

  const threshold = thresholdFeet;
  let lastCountedElevation = smoothed[0];
  let dayIndex = 0;
  for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
    while (
      dayIndex < daily.length - 1 &&
      pointIndex > bounds[dayIndex + 1].index
    ) {
      dayIndex += 1;
    }
    const change = smoothed[pointIndex] - lastCountedElevation;
    if (Math.abs(change) < threshold) continue;
    if (change > 0) daily[dayIndex].gainFeet += change;
    else daily[dayIndex].lossFeet -= change;
    lastCountedElevation = smoothed[pointIndex];
  }

  const roundedDaily = daily.map((day) => ({
    ...day,
    distanceMiles: round(day.distanceMiles, 3),
    startElevationFeet: Math.round(day.startElevationFeet),
    endElevationFeet: Math.round(day.endElevationFeet),
    highPointFeet: Math.round(day.highPointFeet),
    lowPointFeet: Math.round(day.lowPointFeet),
    gainFeet: Math.round(day.gainFeet),
    lossFeet: Math.round(day.lossFeet),
  }));

  return {
    smoothingMeters,
    thresholdFeet,
    totalGainFeet: roundedDaily.reduce((sum, day) => sum + day.gainFeet, 0),
    totalLossFeet: roundedDaily.reduce((sum, day) => sum + day.lossFeet, 0),
    minElevationFeet: Math.round(Math.min(...smoothed)),
    maxElevationFeet: Math.round(Math.max(...smoothed)),
    daily: roundedDaily,
    smoothedElevations: smoothed,
  };
}

function parseGpx(text) {
  return [...text.matchAll(/<(trkpt|rtept)\b([^>]*)>([\s\S]*?)<\/\1>/gi)]
    .map((match) => {
      const latitude = match[2].match(/\blat=["']([-+\d.]+)["']/i);
      const longitude = match[2].match(/\blon=["']([-+\d.]+)["']/i);
      const elevation = match[3].match(/<ele>([-+\d.]+)<\/ele>/i);
      return {
        coordinates: [Number(longitude?.[1]), Number(latitude?.[1])],
        elevationFeet: Number(elevation?.[1]) * FEET_PER_METER,
      };
    })
    .filter(
      (point) =>
        Number.isFinite(point.coordinates[0]) &&
        Number.isFinite(point.coordinates[1]) &&
        Number.isFinite(point.elevationFeet),
    );
}

function resampleGarmin(points) {
  const coordinates = points.map((point) => point.coordinates);
  const stations = cumulativeStations(coordinates);
  const targets = [];
  for (let stationMeters = 0; stationMeters < stations.at(-1); stationMeters += SAMPLE_INTERVAL_METERS) {
    targets.push(stationMeters);
  }
  targets.push(stations.at(-1));
  return targets.map((targetStation) => {
    if (targetStation <= 0) return { ...points[0], stationMeters: 0 };
    let low = 0;
    let high = stations.length - 1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (stations[middle] < targetStation) low = middle + 1;
      else high = middle - 1;
    }
    const index = Math.max(1, low);
    const start = stations[index - 1];
    const end = stations[index];
    const ratio = end > start ? (targetStation - start) / (end - start) : 0;
    return {
      coordinates: [
        points[index - 1].coordinates[0] +
          (points[index].coordinates[0] - points[index - 1].coordinates[0]) * ratio,
        points[index - 1].coordinates[1] +
          (points[index].coordinates[1] - points[index - 1].coordinates[1]) * ratio,
      ],
      elevationFeet:
        points[index - 1].elevationFeet +
        (points[index].elevationFeet - points[index - 1].elevationFeet) * ratio,
      stationMeters: targetStation,
    };
  });
}

function median(values) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function nearestPointIndex(points, coordinate) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length; index += 1) {
    const distance = distanceSquaredDegrees(points[index].coordinates, coordinate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

async function auditGarminSource(sourcePath, route) {
  try {
    const source = await fs.readFile(sourcePath);
    const allPoints = parseGpx(source.toString("utf8"));
    const startIndex = nearestPointIndex(allPoints, route[0].coordinates);
    const finishIndex = nearestPointIndex(allPoints, route.at(-1).coordinates);
    if (startIndex >= finishIndex) {
      throw new Error("active route endpoints were not northbound in this Garmin source");
    }
    const cropped = allPoints.slice(startIndex, finishIndex + 1);
    const resampled = resampleGarmin(cropped);
    const differences = route.map((point) => {
      const index = nearestPointIndex(resampled, point.coordinates);
      return Math.abs(resampled[index].elevationFeet - point.usgsElevationFeet);
    });
    const routeDistanceMeters = cumulativeStations(
      cropped.map((point) => point.coordinates),
    ).at(-1);
    return {
      status: "audited",
      path: path.relative(ROOT, sourcePath),
      sha256: hash(source),
      originalPointCount: allPoints.length,
      activeCropPointCount: cropped.length,
      activeCropNativeMiles: round(routeDistanceMeters * MILES_PER_METER, 3),
      comparisonToRawUsgs3dep: {
        matchedPoints: differences.length,
        meanAbsoluteDifferenceFeet: Math.round(
          differences.reduce((sum, difference) => sum + difference, 0) / differences.length,
        ),
        medianAbsoluteDifferenceFeet: Math.round(median(differences)),
        maxAbsoluteDifferenceFeet: Math.round(Math.max(...differences)),
      },
    };
  } catch (error) {
    return {
      status: "unavailable",
      path: path.relative(ROOT, sourcePath),
      detail: error.message,
    };
  }
}

function sourcePoints(points, metric) {
  return points.map((point, index) => ({
    coordinates: point.coordinates.map((value) => round(value, 9)),
    routeMile: round(point.routeMile, 6),
    pctMile: round(point.pctMile, 6),
    stationMeters: round(point.stationMeters, 3),
    usgsElevationFeet: round(point.usgsElevationFeet, 2),
    normalizedElevationFeet: round(metric.smoothedElevations[index], 2),
    boundaryDay: point.boundaryDay,
  }));
}

async function main() {
  const options = parseArgs();
  const [daySource, cachedSourceExists] = await Promise.all([
    fs.readFile(options.daySource, "utf8").then(JSON.parse),
    fs.access(options.sourceOutput).then(
      () => true,
      () => false,
    ),
  ]);
  const dayStops = readDayStops(daySource);

  let pctaSource;
  if (options.refreshPcta || !cachedSourceExists) {
    console.log("Fetching the authoritative PCTA centerline and 2026 mile markers…");
    pctaSource = await fetchPctaSource();
    await writePctaSource(options.sourceOutput, pctaSource);
  } else {
    console.log("Using the checked-in PCTA centerline crop receipt…");
    pctaSource = await readCachedPctaSource(options.sourceOutput);
  }

  const route = resampleRoute(pctaSource.rawPath, pctaSource.markerStations, dayStops);
  console.log(`Sampling USGS 3DEP terrain at ${route.length} centerline points…`);
  const terrain = await fetchUsgsElevations(route);
  route.forEach((point, index) => {
    point.usgsElevationFeet = terrain.samples[index].elevationFeet;
  });

  const models = [
    [100, 10],
    [150, 10],
    [200, 10],
    [300, 10],
    [150, 20],
    [SELECTED_SMOOTHING_METERS, SELECTED_THRESHOLD_FEET],
  ].map(([smoothingMeters, thresholdFeet]) =>
    calculateMetrics(route, dayStops, smoothingMeters, thresholdFeet),
  );
  const selected = models.find(
    (model) =>
      model.smoothingMeters === SELECTED_SMOOTHING_METERS &&
      model.thresholdFeet === SELECTED_THRESHOLD_FEET,
  );

  const [primaryGarmin, alternateGarmin] = await Promise.all([
    auditGarminSource(GARMIN_PRIMARY, route),
    auditGarminSource(GARMIN_ALTERNATE, route),
  ]);

  const routeNativeMeters = route.at(-1).stationMeters;
  const artifact = {
    schemaVersion: 1,
    contractVersion: TERRAIN_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    purpose:
      "Canonical terrain contract for the active PCTA Burney Falls PCT access to Ash Camp itinerary.",
    route: {
      name: "Burney Falls PCT access to Ash Camp",
      startPctMile: START_PCT_MILE,
      finishPctMile: FINISH_PCT_MILE,
      officialPctaMiles: round(FINISH_PCT_MILE - START_PCT_MILE, 6),
      extractedCenterlineMiles: round(routeNativeMeters * MILES_PER_METER, 6),
      samplingIntervalMeters: SAMPLE_INTERVAL_METERS,
      pointCount: route.length,
      geometrySource:
        "PCTA authoritative Centerline Feature Service, calibrated to PCTA 2026 half-mile markers",
      elevationSource:
        "USGS 3DEP elevation service (bare-earth DEM); retained Garmin tracks are comparison evidence",
      elevationMethod:
        "25m resampling, centered 200m moving mean, continuous 20ft hysteresis carried across day boundaries",
    },
    sourceReceipts: {
      pcta: {
        ...pctaSource.sourceMetadata,
        sourceCrop: path.relative(ROOT, options.sourceOutput),
        sourceCropSha256: hash(
          pctaSource.rawPath
            .map((coordinate) => coordinate.map((value) => Number(value).toFixed(9)).join(","))
            .join("\n"),
        ),
      },
      usgs3dep: {
        endpoint: USGS_3DEP_SERVICE,
        fetchedAt: new Date().toISOString(),
        sourceTiles: terrain.sourceTiles,
      },
      garmin: {
        primary: primaryGarmin,
        alternate: alternateGarmin,
      },
    },
    dayBoundaries: dayStops.map((stop) => ({
      day: stop.day,
      name: stop.name,
      routeMile: round(stop.routeMile, 6),
      pctMile: round(stop.pctMile, 6),
      trailCoordinates: stop.trailCoordinates.map((value) => round(value, 9)),
      fieldCoordinates: stop.fieldCoordinates.map((value) => round(value, 9)),
      fieldToTrailOffsetFeet: stop.trailOffsetFeet,
      stopType: stop.stopType,
      campStatus: stop.campStatus,
      packMode: stop.packMode,
      notes: stop.notes,
    })),
    methodology: {
      resampling:
        "Route is sampled at a fixed 25m physical interval with every official day boundary inserted exactly.",
      smoothing:
        "A centered 200m moving mean produces the display/metric terrain curve from USGS 3DEP values.",
      accumulation:
        "A single 20ft hysteresis accumulator continues across all day boundaries so a campsite split cannot create fake climbing.",
      accuracyNote:
        "Geometry and route mileage are authoritative PCTA references. Cumulative climbing is model-derived and should be reported with method/version, not as impossible foot-level certainty.",
    },
    selectedModel: {
      smoothingMeters: selected.smoothingMeters,
      thresholdFeet: selected.thresholdFeet,
      totalGainFeet: selected.totalGainFeet,
      totalLossFeet: selected.totalLossFeet,
      minElevationFeet: selected.minElevationFeet,
      maxElevationFeet: selected.maxElevationFeet,
      daily: selected.daily,
    },
    sensitivity: models.map((model) => ({
      smoothingMeters: model.smoothingMeters,
      thresholdFeet: model.thresholdFeet,
      totalGainFeet: model.totalGainFeet,
      totalLossFeet: model.totalLossFeet,
    })),
    points: sourcePoints(route, selected),
  };

  await fs.mkdir(path.dirname(options.output), { recursive: true });
  await fs.writeFile(options.output, `${JSON.stringify(artifact, null, 2)}\n`);

  console.log(`Wrote canonical terrain contract to ${path.relative(ROOT, options.output)}`);
  console.table({
    "PCTA official miles": artifact.route.officialPctaMiles,
    "Centerline extracted miles": artifact.route.extractedCenterlineMiles,
    "USGS normalized gain ft": artifact.selectedModel.totalGainFeet,
    "USGS normalized loss ft": artifact.selectedModel.totalLossFeet,
    "USGS normalized high ft": artifact.selectedModel.maxElevationFeet,
    "Route samples": artifact.route.pointCount,
  });
}

main().catch((error) => {
  console.error(`Canonical terrain build failed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
