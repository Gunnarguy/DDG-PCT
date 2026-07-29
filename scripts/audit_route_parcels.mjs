#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_DATA_PATH = path.resolve(
  process.cwd(),
  "pct-hike-viz/public/data/hike_data.json",
);
const PARCEL_SERVICE =
  "https://gis.shastacounty.gov/arcgis/rest/services/OpenData/ParcelAssesseeSitus/MapServer/0/query";
const MVUM_SERVICE =
  "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_MVUM_02/MapServer/1/query";
const ELEVATION_SERVICE =
  "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/getSamples";
const EARTH_RADIUS_MILES = 3958.7613;
const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.280839895;
const MIN_TRAIL_ROAD_SETBACK_METERS = 200 / FEET_PER_METER;
const MIN_PRIVATE_SETBACK_METERS = 0.25 * METERS_PER_MILE;

function haversineMiles(a, b) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(a[1]);
  const lat2 = toRadians(b[1]);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(b[0] - a[0]);
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

function pointInRing(point, ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    const intersects =
      y > point[1] !== previousY > point[1] &&
      point[0] <
        ((previousX - x) * (point[1] - y)) / (previousY - y) + x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInGeometry(point, geometry) {
  if (geometry.type === "Polygon") {
    if (!pointInRing(point, geometry.coordinates[0])) return false;
    return !geometry.coordinates
      .slice(1)
      .some((hole) => pointInRing(point, hole));
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) =>
      pointInGeometry(point, { type: "Polygon", coordinates: polygon }),
    );
  }

  return false;
}

function classifyOwner(owner = "") {
  const normalized = (owner ?? "").toUpperCase();
  if (
    normalized.includes("UNITED STATES FOREST SERVICE") ||
    normalized === "UNITED STATES OF AMERICA"
  ) {
    return "USFS/public";
  }
  if (normalized.includes("HEARST")) return "Hearst/private";
  if (normalized.includes("SIERRA PACIFIC")) return "SPI/private";
  if (normalized.includes("PONDOSA")) return "Pondosa/private";
  if (normalized.includes("SHASTA CASCADE")) return "Shasta Cascade/private";
  return owner ? "Other/private" : "Unknown";
}

function formatMiles(value) {
  return Number(value.toFixed(3));
}

function formatNumber(value, digits = 1) {
  return Number(value.toFixed(digits));
}

function coordinateToLocalMeters(coordinate, origin) {
  const latitudeRadians = (origin[1] * Math.PI) / 180;
  return [
    (coordinate[0] - origin[0]) * 111320 * Math.cos(latitudeRadians),
    (coordinate[1] - origin[1]) * 110540,
  ];
}

function localMetersToCoordinate(point, origin) {
  const latitudeRadians = (origin[1] * Math.PI) / 180;
  return [
    origin[0] + point[0] / (111320 * Math.cos(latitudeRadians)),
    origin[1] + point[1] / 110540,
  ];
}

function distancePointToSegmentMeters(point, start, end, origin) {
  const p = coordinateToLocalMeters(point, origin);
  const a = coordinateToLocalMeters(start, origin);
  const b = coordinateToLocalMeters(end, origin);
  const abX = b[0] - a[0];
  const abY = b[1] - a[1];
  const denominator = abX ** 2 + abY ** 2;
  const t =
    denominator === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((p[0] - a[0]) * abX + (p[1] - a[1]) * abY) / denominator),
        );
  return Math.hypot(p[0] - (a[0] + t * abX), p[1] - (a[1] + t * abY));
}

function nearestPointOnSegmentMeters(point, start, end, origin) {
  const p = coordinateToLocalMeters(point, origin);
  const a = coordinateToLocalMeters(start, origin);
  const b = coordinateToLocalMeters(end, origin);
  const abX = b[0] - a[0];
  const abY = b[1] - a[1];
  const denominator = abX ** 2 + abY ** 2;
  const t =
    denominator === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((p[0] - a[0]) * abX + (p[1] - a[1]) * abY) / denominator),
        );
  const localPoint = [a[0] + t * abX, a[1] + t * abY];
  return {
    coordinate: localMetersToCoordinate(localPoint, origin),
    distanceMeters: Math.hypot(p[0] - localPoint[0], p[1] - localPoint[1]),
  };
}

function geometryLines(geometry) {
  if (!geometry) return [];
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flat();
  }
  return [];
}

function distanceToGeometryMeters(point, geometry, origin) {
  let minimum = Number.POSITIVE_INFINITY;
  for (const line of geometryLines(geometry)) {
    for (let index = 1; index < line.length; index += 1) {
      minimum = Math.min(
        minimum,
        distancePointToSegmentMeters(point, line[index - 1], line[index], origin),
      );
    }
  }
  return minimum;
}

function distanceToFeaturesMeters(point, features, origin) {
  return features.reduce(
    (minimum, feature) =>
      Math.min(minimum, distanceToGeometryMeters(point, feature.geometry, origin)),
    Number.POSITIVE_INFINITY,
  );
}

function nearestFeaturePoint(point, features, origin) {
  let nearest = {
    feature: null,
    coordinate: null,
    distanceMeters: Number.POSITIVE_INFINITY,
  };
  for (const feature of features) {
    for (const line of geometryLines(feature.geometry)) {
      for (let index = 1; index < line.length; index += 1) {
        const result = nearestPointOnSegmentMeters(
          point,
          line[index - 1],
          line[index],
          origin,
        );
        if (result.distanceMeters < nearest.distanceMeters) {
          nearest = { feature, ...result };
        }
      }
    }
  }
  return nearest;
}

function nearestRoutePoint(point, routePoints, origin) {
  return routePoints.reduce((nearest, routePoint) => {
    const distanceMeters = Math.hypot(
      ...coordinateToLocalMeters(
        [
          point[0] - routePoint.coordinate[0] + origin[0],
          point[1] - routePoint.coordinate[1] + origin[1],
        ],
        origin,
      ),
    );
    return distanceMeters < nearest.distanceMeters
      ? { ...routePoint, distanceMeters }
      : nearest;
  }, { distanceMeters: Number.POSITIVE_INFINITY });
}

function mergeSegments(samples) {
  const segments = [];
  for (const sample of samples) {
    const key = `${sample.apn ?? "unknown"}|${sample.owner ?? "unknown"}`;
    const previous = segments.at(-1);
    if (previous?.key === key) {
      previous.endRouteMile = sample.routeMile;
      previous.endPctMile = sample.pctMile;
      previous.endCoordinate = sample.coordinate;
      continue;
    }

    segments.push({
      key,
      classification: sample.classification,
      owner: sample.owner,
      apn: sample.apn,
      startRouteMile: sample.routeMile,
      endRouteMile: sample.routeMile,
      startPctMile: sample.pctMile,
      endPctMile: sample.pctMile,
      startCoordinate: sample.coordinate,
      endCoordinate: sample.coordinate,
    });
  }

  return segments.map(({ key: _key, ...segment }) => ({
    ...segment,
    distanceMiles: formatMiles(
      segment.endRouteMile - segment.startRouteMile,
    ),
  }));
}

async function fetchParcels(bounds) {
  const params = new URLSearchParams({
    f: "geojson",
    where: "1=1",
    geometry: bounds.join(","),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "APN_Dash,ASMT,Assessee,GIS_Acres,Current_Doc_Date",
    outSR: "4326",
    returnGeometry: "true",
  });
  const response = await fetch(`${PARCEL_SERVICE}?${params}`);
  if (!response.ok) {
    throw new Error(`Parcel service returned HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchMvumRoads(bounds) {
  const params = new URLSearchParams({
    f: "geojson",
    where: "symbol IN ('1','2','3','4','11','12')",
    geometry: bounds.join(","),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields:
      "name,symbol,mvum_symbol_name,jurisdiction,operationalmaintlevel,surfacetype,seasonal,passengervehicle,passengervehicle_datesopen,highclearancevehicle,highclearancevehicle_datesopen,forestname,districtname,routestatus",
    outSR: "4326",
    returnGeometry: "true",
  });
  const response = await fetch(`${MVUM_SERVICE}?${params}`);
  if (!response.ok) {
    throw new Error(`MVUM service returned HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchElevationSamples(points) {
  const samples = [];
  const batchSize = 300;
  for (let start = 0; start < points.length; start += batchSize) {
    const batch = points.slice(start, start + batchSize);
    const params = new URLSearchParams({
      f: "json",
      geometry: JSON.stringify({
        points: batch,
        spatialReference: { wkid: 4326 },
      }),
      geometryType: "esriGeometryMultipoint",
      sampleDistance: "1",
      outFields: "Name,ProductName,Source,VerticalDatum,AcquisitionDate,pubdate,title",
    });
    const response = await fetch(ELEVATION_SERVICE, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params,
    });
    if (!response.ok) {
      throw new Error(`USGS elevation service returned HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (!Array.isArray(payload.samples)) {
      throw new Error(
        `USGS elevation service returned no samples: ${JSON.stringify(payload)}`,
      );
    }
    samples.push(...payload.samples);
  }
  return samples;
}

function candidateGrid(routePoints, startRouteMile, endRouteMile) {
  const windowPoints = routePoints.filter(
    (point) =>
      point.routeMile >= startRouteMile - 0.15 &&
      point.routeMile <= endRouteMile + 0.15,
  );
  const longitudes = windowPoints.map((point) => point.coordinate[0]);
  const latitudes = windowPoints.map((point) => point.coordinate[1]);
  const padding = 0.006;
  const step = 0.00022;
  const points = [];
  for (
    let longitude = Math.min(...longitudes) - padding;
    longitude <= Math.max(...longitudes) + padding;
    longitude += step
  ) {
    for (
      let latitude = Math.min(...latitudes) - padding;
      latitude <= Math.max(...latitudes) + padding;
      latitude += step
    ) {
      points.push([longitude, latitude]);
    }
  }
  return { points, windowPoints };
}

async function screenCampWindow({
  name,
  startRouteMile,
  endRouteMile,
  routePoints,
  parcelCollection,
  roadCollection,
  origin,
}) {
  const { points, windowPoints } = candidateGrid(
    routePoints,
    startRouteMile,
    endRouteMile,
  );
  const privateFeatures = parcelCollection.features.filter(
    (feature) =>
      classifyOwner(feature.properties?.Assessee ?? "") !== "USFS/public",
  );
  const legallyBuffered = points
    .map((coordinate) => {
      const parcel = parcelCollection.features.find((feature) =>
        pointInGeometry(coordinate, feature.geometry),
      );
      const owner = parcel?.properties?.Assessee ?? null;
      if (classifyOwner(owner) !== "USFS/public") return null;

      const nearestRoute = nearestRoutePoint(coordinate, windowPoints, origin);
      const roadDistanceMeters = distanceToFeaturesMeters(
        coordinate,
        roadCollection.features,
        origin,
      );
      const nearestRoad = nearestFeaturePoint(
        coordinate,
        roadCollection.features,
        origin,
      );
      const privateDistanceMeters = distanceToFeaturesMeters(
        coordinate,
        privateFeatures,
        origin,
      );
      if (
        nearestRoute.distanceMeters < MIN_TRAIL_ROAD_SETBACK_METERS ||
        nearestRoute.distanceMeters > 350 ||
        roadDistanceMeters < MIN_TRAIL_ROAD_SETBACK_METERS ||
        privateDistanceMeters < MIN_PRIVATE_SETBACK_METERS
      ) {
        return null;
      }

      return {
        coordinate,
        routeMile: nearestRoute.routeMile,
        pctMile: nearestRoute.pctMile,
        trailDistanceMeters: nearestRoute.distanceMeters,
        roadDistanceMeters,
        nearestRoadName: nearestRoad.feature?.properties?.name ?? null,
        nearestRoadCoordinate: nearestRoad.coordinate,
        nearestRoadClass:
          nearestRoad.feature?.properties?.mvum_symbol_name ?? null,
        nearestRoadMaintenance:
          nearestRoad.feature?.properties?.operationalmaintlevel ?? null,
        nearestRoadSurface:
          nearestRoad.feature?.properties?.surfacetype ?? null,
        nearestRoadPassengerDates:
          nearestRoad.feature?.properties?.passengervehicle_datesopen ?? null,
        privateDistanceMeters,
        owner,
        apn: parcel?.properties?.APN_Dash ?? null,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.trailDistanceMeters - b.trailDistanceMeters ||
        b.privateDistanceMeters - a.privateDistanceMeters,
    )
    .slice(0, 160);

  const terrainRadiusMeters = 12;
  const samplePoints = [];
  const offsets = [
    [0, 0],
    [terrainRadiusMeters, 0],
    [-terrainRadiusMeters, 0],
    [0, terrainRadiusMeters],
    [0, -terrainRadiusMeters],
    [terrainRadiusMeters, terrainRadiusMeters],
    [terrainRadiusMeters, -terrainRadiusMeters],
    [-terrainRadiusMeters, terrainRadiusMeters],
    [-terrainRadiusMeters, -terrainRadiusMeters],
  ];
  for (const candidate of legallyBuffered) {
    const center = coordinateToLocalMeters(candidate.coordinate, origin);
    for (const offset of offsets) {
      samplePoints.push(
        localMetersToCoordinate(
          [center[0] + offset[0], center[1] + offset[1]],
          origin,
        ),
      );
    }
  }
  const elevationSamples = await fetchElevationSamples(samplePoints);
  const sampleByLocationId = new Map(
    elevationSamples.map((sample) => [sample.locationId, sample]),
  );

  const screened = legallyBuffered
    .map((candidate, candidateIndex) => {
      const centerSample = sampleByLocationId.get(candidateIndex * offsets.length);
      if (!centerSample) return null;
      const centerMeters = Number(centerSample.value);
      const grades = offsets.slice(1).map((offset, offsetIndex) => {
        const sample = sampleByLocationId.get(
          candidateIndex * offsets.length + offsetIndex + 1,
        );
        if (!sample) return Number.POSITIVE_INFINITY;
        const runMeters = Math.hypot(offset[0], offset[1]);
        return (Math.abs(Number(sample.value) - centerMeters) / runMeters) * 100;
      });
      const maxSlopePercent = Math.max(...grades);
      const meanSlopePercent =
        grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
      return {
        ...candidate,
        coordinate: candidate.coordinate.map((value) => formatNumber(value, 6)),
        routeMile: formatNumber(candidate.routeMile, 3),
        pctMile: formatNumber(candidate.pctMile, 3),
        elevationFeet: formatNumber(centerMeters * FEET_PER_METER, 0),
        trailDistanceFeet: formatNumber(
          candidate.trailDistanceMeters * FEET_PER_METER,
          0,
        ),
        roadDistanceFeet: formatNumber(
          candidate.roadDistanceMeters * FEET_PER_METER,
          0,
        ),
        nearestRoadCoordinate: candidate.nearestRoadCoordinate?.map((value) =>
          formatNumber(value, 6),
        ),
        privateDistanceMiles: formatMiles(
          candidate.privateDistanceMeters / METERS_PER_MILE,
        ),
        meanSlopePercent: formatNumber(meanSlopePercent, 1),
        maxSlopePercent: formatNumber(maxSlopePercent, 1),
        terrainSource: centerSample.attributes?.title ?? "USGS 3DEP",
        terrainPublicationDate: centerSample.attributes?.pubdate ?? null,
      };
    })
    .filter(
      (candidate) =>
        candidate &&
        candidate.meanSlopePercent <= 8 &&
        candidate.maxSlopePercent <= 14,
    )
    .sort(
      (a, b) =>
        a.meanSlopePercent - b.meanSlopePercent ||
        a.maxSlopePercent - b.maxSlopePercent ||
        a.trailDistanceFeet - b.trailDistanceFeet,
    );

  const separated = [];
  for (const candidate of screened) {
    if (
      separated.every(
        (existing) =>
          haversineMiles(existing.coordinate, candidate.coordinate) >= 0.06,
      )
    ) {
      separated.push(candidate);
    }
    if (separated.length === 8) break;
  }

  return {
    name,
    routeWindow: [startRouteMile, endRouteMile],
    rulesApplied: {
      minimumTrailRoadSetbackFeet: 200,
      minimumPrivatePropertySetbackMiles: 0.25,
      maximumTrailAccessFeet: formatNumber(350 * FEET_PER_METER, 0),
      terrainRadiusFeet: formatNumber(terrainRadiusMeters * FEET_PER_METER, 0),
      maximumMeanSlopePercent: 8,
      maximumSampleSlopePercent: 14,
    },
    gridPointsTested: points.length,
    legallyBufferedPoints: legallyBuffered.length,
    terrainPassingPoints: screened.length,
    candidates: separated,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf("--output");
  const outputPath =
    outputIndex >= 0 ? path.resolve(args[outputIndex + 1]) : null;
  const positionalArgs =
    outputIndex >= 0
      ? args.filter((_, index) => index !== outputIndex && index !== outputIndex + 1)
      : args;
  const dataPath = path.resolve(positionalArgs[0] ?? DEFAULT_DATA_PATH);
  const data = JSON.parse(await fs.readFile(dataPath, "utf8"));
  const route = data.route.path;
  const pctStart = Number(data.route.metadata?.pct_start_mile ?? 1420.653);

  let cumulative = 0;
  const routePoints = route.map((coordinate, index) => {
    if (index > 0) cumulative += haversineMiles(route[index - 1], coordinate);
    return {
      coordinate: coordinate.slice(0, 2),
      routeMile: cumulative,
      pctMile: pctStart + cumulative,
    };
  });

  const corridor = routePoints.filter(
    (point) => point.routeMile >= 13 && point.routeMile <= 29,
  );
  const longitudes = corridor.map((point) => point.coordinate[0]);
  const latitudes = corridor.map((point) => point.coordinate[1]);
  const padding = 0.01;
  const bounds = [
    Math.min(...longitudes) - padding,
    Math.min(...latitudes) - padding,
    Math.max(...longitudes) + padding,
    Math.max(...latitudes) + padding,
  ];
  const parcelCollection = await fetchParcels(bounds);
  const roadCollection = await fetchMvumRoads(bounds);

  const samples = corridor.map((point) => {
    const parcel = parcelCollection.features.find((feature) =>
      pointInGeometry(point.coordinate, feature.geometry),
    );
    const owner = parcel?.properties?.Assessee ?? null;
    return {
      ...point,
      routeMile: formatMiles(point.routeMile),
      pctMile: formatMiles(point.pctMile),
      owner,
      apn: parcel?.properties?.APN_Dash ?? null,
      classification: classifyOwner(owner),
    };
  });

  const landmarks = [
    ["Peavine camp", 13.636],
    ["Clark Spring", 17.78],
    ["Deadman Creek", 19.81],
    ["Kosk Spring", 21.36],
    ["Historical PCT 1444 saddle campsite", 1444 - pctStart],
    ["Bartle Gap access", 1447.53 - pctStart],
    ["Moosehead camp", 28.165],
  ].map(([name, targetRouteMile]) => {
    const nearest = samples.reduce((best, sample) =>
      Math.abs(sample.routeMile - targetRouteMile) <
      Math.abs(best.routeMile - targetRouteMile)
        ? sample
        : best,
    );
    return { name, ...nearest };
  });

  const origin = [
    (bounds[0] + bounds[2]) / 2,
    (bounds[1] + bounds[3]) / 2,
  ];
  const campWindows = [];
  for (const window of [
    {
      name: "Pre-private USFS dry camp",
      startRouteMile: 14.3,
      endRouteMile: 14.65,
    },
    {
      name: "Post-Bartle USFS dry camp",
      startRouteMile: 27.2,
      endRouteMile: 27.65,
    },
  ]) {
    campWindows.push(
      await screenCampWindow({
        ...window,
        routePoints,
        parcelCollection,
        roadCollection,
        origin,
      }),
    );
  }

  const result = {
    generatedAt: new Date().toISOString(),
    source: PARCEL_SERVICE,
    dataPath: path.relative(process.cwd(), dataPath),
    pctStart,
    bounds,
    parcelCount: parcelCollection.features.length,
    mvumRoadCount: roadCollection.features.length,
    ownershipSegments: mergeSegments(samples),
    landmarks,
    campScreening: {
      planningMeaning:
        "Desktop GIS screening only. A passing point satisfies mapped ownership/setback/slope rules but still requires on-foot confirmation for vegetation, hazards, durable surfaces, and three-person capacity.",
      ownershipSource: PARCEL_SERVICE,
      motorVehicleSource: MVUM_SERVICE,
      terrainSource: ELEVATION_SERVICE,
      windows: campWindows,
    },
  };

  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, serialized);
    console.log(`Wrote corridor audit to ${outputPath}`);
  } else {
    process.stdout.write(serialized);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
