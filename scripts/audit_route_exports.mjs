#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const EARTH_RADIUS_MILES = 3958.7613;
const FEET_PER_METER = 3.280839895;
const BURNEY_FALLS_PCT_ACCESS = [-121.65376551, 41.01104125];
const ASH_CAMP = [-122.0606252, 41.1170914];

function haversineMiles(a, b) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const latitude1 = toRadians(a.lat);
  const latitude2 = toRadians(b.lat);
  const latitudeDelta = latitude2 - latitude1;
  const longitudeDelta = toRadians(b.lon - a.lon);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(value));
}

function parseAttributes(source) {
  return Object.fromEntries(
    [...source.matchAll(/([A-Za-z_:][\w:.-]*)=["']([^"']+)["']/g)].map(
      (match) => [match[1], match[2]],
    ),
  );
}

function parseGpx(text) {
  const points = [];
  const pointPattern =
    /<(trkpt|rtept)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  for (const match of text.matchAll(pointPattern)) {
    const attributes = parseAttributes(match[2]);
    const elevation = match[3].match(/<ele>([-+\d.]+)<\/ele>/i);
    if (!attributes.lon || !attributes.lat) continue;
    points.push({
      lon: Number(attributes.lon),
      lat: Number(attributes.lat),
      elevationMeters: elevation ? Number(elevation[1]) : null,
    });
  }
  return points;
}

function parseTcx(text) {
  const points = [];
  for (const match of text.matchAll(/<Trackpoint>([\s\S]*?)<\/Trackpoint>/gi)) {
    const latitude = match[1].match(
      /<LatitudeDegrees>([-+\d.]+)<\/LatitudeDegrees>/i,
    );
    const longitude = match[1].match(
      /<LongitudeDegrees>([-+\d.]+)<\/LongitudeDegrees>/i,
    );
    const elevation = match[1].match(
      /<AltitudeMeters>([-+\d.]+)<\/AltitudeMeters>/i,
    );
    if (!latitude || !longitude) continue;
    points.push({
      lon: Number(longitude[1]),
      lat: Number(latitude[1]),
      elevationMeters: elevation ? Number(elevation[1]) : null,
    });
  }
  return points;
}

function parseKml(text) {
  const blocks = [...text.matchAll(/<coordinates>([\s\S]*?)<\/coordinates>/gi)];
  const standardCoordinates = blocks.flatMap((match) =>
    match[1].trim().split(/\s+/),
  );
  const gxCoordinates = [...text.matchAll(/<gx:coord>([\s\S]*?)<\/gx:coord>/gi)].map(
    (match) => match[1].trim().split(/\s+/).join(","),
  );
  return [...standardCoordinates, ...gxCoordinates]
    .map((coordinate) => {
      const [lon, lat, elevation] = coordinate.split(",").map(Number);
      return {
        lon,
        lat,
        elevationMeters: Number.isFinite(elevation) ? elevation : null,
      };
    })
    .filter((point) => Number.isFinite(point.lon) && Number.isFinite(point.lat));
}

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/);
  const headers = rows[0].split(",").map((header) => header.trim().toLowerCase());
  const latitudeIndex = headers.indexOf("latitude");
  const longitudeIndex = headers.indexOf("longitude");
  const elevationIndex = headers.indexOf("elevation");
  return rows.slice(1).map((row) => {
    const values = row.split(",");
    return {
      lon: Number(values[longitudeIndex]),
      lat: Number(values[latitudeIndex]),
      elevationMeters:
        elevationIndex >= 0 ? Number(values[elevationIndex]) : null,
    };
  });
}

function flattenCoordinates(geometry) {
  if (geometry.type === "LineString") return geometry.coordinates;
  if (geometry.type === "MultiLineString") return geometry.coordinates.flat();
  return [];
}

function parseJson(text) {
  const data = JSON.parse(text);
  if (Array.isArray(data?.data?.trackData)) {
    return data.data.trackData.flat().map((point) => ({
      lon: Number(point.lon),
      lat: Number(point.lat),
      elevationMeters: Number.isFinite(Number(point.ele))
        ? Number(point.ele)
        : null,
    }));
  }
  if (data?.type === "FeatureCollection") {
    return data.features.flatMap((feature) =>
      flattenCoordinates(feature.geometry).map((coordinate) => ({
        lon: Number(coordinate[0]),
        lat: Number(coordinate[1]),
        elevationMeters: Number.isFinite(Number(coordinate[2]))
          ? Number(coordinate[2])
          : null,
      })),
    );
  }
  throw new Error("Unsupported JSON route export");
}

function nearestIndex(points, coordinate) {
  const target = { lon: coordinate[0], lat: coordinate[1] };
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  points.forEach((point, index) => {
    const distance = haversineMiles(point, target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return { index: bestIndex, distanceMiles: bestDistance };
}

function smoothedElevations(points) {
  return points.map((_, index) => {
    const elevations = points
      .slice(Math.max(0, index - 2), Math.min(points.length, index + 3))
      .map((point) => point.elevationMeters)
      .filter(Number.isFinite);
    return elevations.length
      ? elevations.reduce((sum, elevation) => sum + elevation, 0) /
          elevations.length
      : null;
  });
}

function elevationGainLoss(points) {
  const smoothed = smoothedElevations(points);
  let previous = smoothed.find(Number.isFinite);
  let gainMeters = 0;
  let lossMeters = 0;
  const thresholdMeters = 10 / FEET_PER_METER;
  for (const elevation of smoothed) {
    if (!Number.isFinite(elevation) || !Number.isFinite(previous)) continue;
    const difference = elevation - previous;
    if (Math.abs(difference) >= thresholdMeters) {
      if (difference > 0) gainMeters += difference;
      else lossMeters -= difference;
      previous = elevation;
    }
  }
  return {
    gainFeet: Math.round(gainMeters * FEET_PER_METER),
    lossFeet: Math.round(lossMeters * FEET_PER_METER),
  };
}

function summarizePoints(points) {
  let distanceMiles = 0;
  for (let index = 1; index < points.length; index += 1) {
    distanceMiles += haversineMiles(points[index - 1], points[index]);
  }
  const elevations = points
    .map((point) => point.elevationMeters)
    .filter(Number.isFinite);
  const start = nearestIndex(points, BURNEY_FALLS_PCT_ACCESS);
  const finish = nearestIndex(points, ASH_CAMP);
  const activePoints =
    start.index < finish.index
      ? points.slice(start.index, finish.index + 1)
      : [];
  let activeDistanceMiles = 0;
  for (let index = 1; index < activePoints.length; index += 1) {
    activeDistanceMiles += haversineMiles(
      activePoints[index - 1],
      activePoints[index],
    );
  }

  return {
    pointCount: points.length,
    distanceMiles: Number(distanceMiles.toFixed(3)),
    start: points[0] ? [points[0].lon, points[0].lat] : null,
    finish: points.at(-1) ? [points.at(-1).lon, points.at(-1).lat] : null,
    minimumElevationFeet: elevations.length
      ? Math.round(Math.min(...elevations) * FEET_PER_METER)
      : null,
    maximumElevationFeet: elevations.length
      ? Math.round(Math.max(...elevations) * FEET_PER_METER)
      : null,
    activeCrop: {
      startIndex: start.index,
      startOffsetFeet: Math.round(start.distanceMiles * 5280),
      finishIndex: finish.index,
      finishOffsetFeet: Math.round(finish.distanceMiles * 5280),
      pointCount: activePoints.length,
      distanceMiles: Number(activeDistanceMiles.toFixed(3)),
      ...elevationGainLoss(activePoints),
    },
  };
}

function geometryHash(points) {
  const normalized = points
    .map((point) =>
      [
        point.lon.toFixed(6),
        point.lat.toFixed(6),
        Number.isFinite(point.elevationMeters)
          ? point.elevationMeters.toFixed(1)
          : "",
      ].join(","),
    )
    .join("\n");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function coordinateHash(points) {
  const normalized = points
    .map((point) => [point.lon.toFixed(6), point.lat.toFixed(6)].join(","))
    .join("\n");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function portablePath(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  return relativePath.startsWith("..") ? path.basename(filePath) : relativePath;
}

async function parseFile(filePath) {
  const buffer = await fs.readFile(filePath);
  const text = buffer.toString("utf8");
  const extension = path.extname(filePath).toLowerCase();
  let points;
  if (extension === ".gpx") points = parseGpx(text);
  else if (extension === ".tcx") points = parseTcx(text);
  else if (extension === ".kml" || filePath.endsWith(".kml-2")) {
    points = parseKml(text);
  } else if (extension === ".csv") points = parseCsv(text);
  else if (extension === ".js") points = parseJson(text);
  else {
    return {
      file: portablePath(filePath),
      bytes: buffer.length,
      sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
      parseStatus: "binary-preserved-not-decoded",
    };
  }

  return {
    file: portablePath(filePath),
    bytes: buffer.length,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    geometrySha256: geometryHash(points),
    coordinateSha256: coordinateHash(points),
    parseStatus: "parsed",
    ...summarizePoints(points),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf("--output");
  const outputPath =
    outputIndex >= 0 ? path.resolve(args[outputIndex + 1]) : null;
  const files =
    outputIndex >= 0
      ? args.filter((_, index) => index !== outputIndex && index !== outputIndex + 1)
      : args;
  if (!files.length) {
    throw new Error("Pass one or more Garmin route export paths");
  }
  const exports = [];
  for (const file of files) exports.push(await parseFile(path.resolve(file)));
  const duplicateGroups = Object.entries(
    Object.groupBy(
      exports.filter((entry) => entry.geometrySha256),
      (entry) => entry.geometrySha256,
    ),
  ).map(([hash, entries]) => ({
    geometrySha256: hash,
    files: entries.map((entry) => entry.file),
  }));
  const result = {
        generatedAt: new Date().toISOString(),
        method: {
          distance: "Haversine point-to-point",
          activeCrop:
            "Nearest source points to canonical Burney Falls PCT access and Ash Camp coordinates",
          elevation:
            "Five-point moving average with cumulative 10-foot change threshold",
        },
        canonicalEndpoints: {
          start: BURNEY_FALLS_PCT_ACCESS,
          finish: ASH_CAMP,
        },
        duplicateGroups,
        exports,
      };
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, serialized);
    console.log(`Wrote Garmin export audit to ${outputPath}`);
  } else {
    process.stdout.write(serialized);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
