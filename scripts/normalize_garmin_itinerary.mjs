#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const defaultSourcePath = path.join(
  root,
  "docs",
  "data",
  "source",
  "garmin-section-o-80.826mi.gpx",
);
const hikeDataPath = path.join(
  root,
  "pct-hike-viz",
  "public",
  "data",
  "hike_data.json",
);
const feetPerMeter = 3.280839895;
const earthRadiusMeters = 6_371_008.8;

function parseArguments() {
  const args = process.argv.slice(2);
  const outputIndex = args.indexOf("--output");
  const sourceIndex = args.indexOf("--source");
  return {
    outputPath:
      outputIndex >= 0 ? path.resolve(args[outputIndex + 1]) : null,
    sourcePath:
      sourceIndex >= 0
        ? path.resolve(args[sourceIndex + 1])
        : defaultSourcePath,
  };
}

function parseGpx(source) {
  return [
    ...source.matchAll(
      /<(trkpt|rtept)\b([^>]*)>([\s\S]*?)<\/\1>/gi,
    ),
  ]
    .map((match) => {
      const latitude = match[2].match(/\blat=["']([-+\d.]+)["']/i);
      const longitude = match[2].match(/\blon=["']([-+\d.]+)["']/i);
      const elevation = match[3].match(/<ele>([-+\d.]+)<\/ele>/i);
      return {
        latitude: Number(latitude?.[1]),
        longitude: Number(longitude?.[1]),
        elevationMeters: Number(elevation?.[1]),
      };
    })
    .filter(
      (point) =>
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude) &&
        Number.isFinite(point.elevationMeters),
    );
}

function haversineMeters(first, second) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitude1 = radians(first.latitude);
  const latitude2 = radians(second.latitude);
  const latitudeDelta = latitude2 - latitude1;
  const longitudeDelta = radians(second.longitude - first.longitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(value));
}

function withCumulativeDistance(points) {
  let cumulativeMeters = 0;
  return points.map((point, index) => {
    if (index > 0) {
      cumulativeMeters += haversineMeters(points[index - 1], point);
    }
    return { ...point, cumulativeMeters };
  });
}

function nearestIndex(points, coordinate) {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  points.forEach((point, index) => {
    const distance = haversineMeters(point, {
      latitude: coordinate[1],
      longitude: coordinate[0],
    });
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return { index: bestIndex, offsetMeters: bestDistance };
}

function interpolate(first, second, targetMeters) {
  const span = second.cumulativeMeters - first.cumulativeMeters;
  const ratio = span > 0 ? (targetMeters - first.cumulativeMeters) / span : 0;
  return {
    latitude: first.latitude + (second.latitude - first.latitude) * ratio,
    longitude: first.longitude + (second.longitude - first.longitude) * ratio,
    elevationMeters:
      first.elevationMeters +
      (second.elevationMeters - first.elevationMeters) * ratio,
    cumulativeMeters: targetMeters,
  };
}

function resample(points, intervalMeters = 25) {
  const lastDistance = points.at(-1).cumulativeMeters;
  const result = [];
  let sourceIndex = 1;
  for (
    let targetMeters = 0;
    targetMeters < lastDistance;
    targetMeters += intervalMeters
  ) {
    while (
      sourceIndex < points.length - 1 &&
      points[sourceIndex].cumulativeMeters < targetMeters
    ) {
      sourceIndex += 1;
    }
    result.push(
      interpolate(points[sourceIndex - 1], points[sourceIndex], targetMeters),
    );
  }
  result.push({ ...points.at(-1), cumulativeMeters: lastDistance });
  return result;
}

function smoothElevations(points, windowMeters) {
  const radius = windowMeters / 2;
  const prefix = [0];
  points.forEach((point) => {
    prefix.push(prefix.at(-1) + point.elevationMeters);
  });

  let lower = 0;
  let upper = 0;
  return points.map((point, index) => {
    while (
      lower < index &&
      points[lower].cumulativeMeters < point.cumulativeMeters - radius
    ) {
      lower += 1;
    }
    while (
      upper + 1 < points.length &&
      points[upper + 1].cumulativeMeters <= point.cumulativeMeters + radius
    ) {
      upper += 1;
    }
    return (prefix[upper + 1] - prefix[lower]) / (upper - lower + 1);
  });
}

function normalizedMetrics({
  points,
  boundaries,
  smoothingMeters,
  thresholdFeet,
}) {
  const elevations = smoothElevations(points, smoothingMeters);
  const thresholdMeters = thresholdFeet / feetPerMeter;
  const daily = boundaries.slice(1).map((boundary, index) => {
    const start = boundaries[index];
    const dayElevations = elevations.slice(start.index, boundary.index + 1);
    return {
      day: boundary.day,
      startIndex: start.index,
      endIndex: boundary.index,
      sourceDistanceMiles: Number(
        (
          (points[boundary.index].cumulativeMeters -
            points[start.index].cumulativeMeters) /
          1609.344
        ).toFixed(3),
      ),
      startFeet: Math.round(elevations[start.index] * feetPerMeter),
      endFeet: Math.round(elevations[boundary.index] * feetPerMeter),
      highPointFeet: Math.round(Math.max(...dayElevations) * feetPerMeter),
      gainFeet: 0,
      lossFeet: 0,
    };
  });

  let lastCounted = elevations[boundaries[0].index];
  let dayIndex = 0;
  for (
    let pointIndex = boundaries[0].index + 1;
    pointIndex <= boundaries.at(-1).index;
    pointIndex += 1
  ) {
    while (
      dayIndex < daily.length - 1 &&
      pointIndex > daily[dayIndex].endIndex
    ) {
      dayIndex += 1;
    }
    const change = elevations[pointIndex] - lastCounted;
    if (Math.abs(change) < thresholdMeters) continue;
    if (change > 0) daily[dayIndex].gainFeet += change * feetPerMeter;
    else daily[dayIndex].lossFeet -= change * feetPerMeter;
    lastCounted = elevations[pointIndex];
  }

  daily.forEach((day) => {
    day.gainFeet = Math.round(day.gainFeet);
    day.lossFeet = Math.round(day.lossFeet);
    delete day.startIndex;
    delete day.endIndex;
  });

  return {
    smoothingMeters,
    thresholdFeet,
    totalGainFeet: daily.reduce((sum, day) => sum + day.gainFeet, 0),
    totalLossFeet: daily.reduce((sum, day) => sum + day.lossFeet, 0),
    daily,
  };
}

function portablePath(filePath) {
  return path.relative(root, filePath);
}

function main() {
  const { outputPath, sourcePath } = parseArguments();
  const sourceBuffer = fs.readFileSync(sourcePath);
  const hikeData = JSON.parse(fs.readFileSync(hikeDataPath, "utf8"));
  const allPoints = parseGpx(sourceBuffer.toString("utf8"));
  const stops = hikeData.features
    .filter((feature) => {
      const day = Number(feature.properties?.day);
      return (
        feature.properties?.itinerary === "express" &&
        Number.isInteger(day) &&
        day >= 0 &&
        day <= 8
      );
    })
    .sort((first, second) => first.properties.day - second.properties.day);

  const start = nearestIndex(allPoints, stops[0].geometry.coordinates);
  const finish = nearestIndex(allPoints, stops.at(-1).geometry.coordinates);
  const cropped = withCumulativeDistance(
    allPoints.slice(start.index, finish.index + 1),
  );
  const points = resample(cropped);
  const boundaries = stops.map((stop) => {
    const nearest = nearestIndex(points, stop.geometry.coordinates);
    return {
      day: stop.properties.day,
      name: stop.properties.name,
      index: nearest.index,
      routeMile: stop.properties.routeMile,
      sourceMile: Number(
        (points[nearest.index].cumulativeMeters / 1609.344).toFixed(3),
      ),
      offsetFeet: Math.round(nearest.offsetMeters * feetPerMeter),
    };
  });

  const sensitivity = [
    [100, 10],
    [150, 10],
    [200, 10],
    [300, 10],
    [150, 20],
    [200, 20],
  ].map(([smoothingMeters, thresholdFeet]) =>
    normalizedMetrics({
      points,
      boundaries,
      smoothingMeters,
      thresholdFeet,
    }),
  );
  const selected = sensitivity.find(
    (entry) => entry.smoothingMeters === 200 && entry.thresholdFeet === 20,
  );
  const officialSegments = hikeData.route.properties.segments;

  const result = {
    generatedAt: new Date().toISOString(),
    source: {
      path: portablePath(sourcePath),
      sha256: crypto.createHash("sha256").update(sourceBuffer).digest("hex"),
      originalPointCount: allPoints.length,
      cropPointCount: cropped.length,
      resampledPointCount: points.length,
      cropDistanceMiles: Number(
        (points.at(-1).cumulativeMeters / 1609.344).toFixed(3),
      ),
      elevationUnits: "meters in GPX; converted to feet for output",
    },
    method: {
      resampling:
        "Linear interpolation every 25 meters so export point density cannot change totals",
      smoothing:
        "Centered moving mean over a fixed physical distance, not a fixed number of points",
      accumulation:
        "Continuous hysteresis threshold carried across all day boundaries",
      selectedModel:
        "200-meter smoothing with a 20-foot hysteresis threshold",
      caution:
        "Elevation gain/loss remains model-derived. Daily official mileage continues to use the PCTA 2026 milebook rather than this lower-resolution Garmin export.",
    },
    boundaries,
    selected: {
      ...selected,
      daily: selected.daily.map((day, index) => ({
        ...day,
        officialMiles: officialSegments[index].distance,
        start: officialSegments[index].start,
        end: officialSegments[index].end,
      })),
    },
    sensitivity: sensitivity.map((entry) => ({
      smoothingMeters: entry.smoothingMeters,
      thresholdFeet: entry.thresholdFeet,
      totalGainFeet: entry.totalGainFeet,
      totalLossFeet: entry.totalLossFeet,
    })),
  };
  const serialized = `${JSON.stringify(result, null, 2)}\n`;
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, serialized);
    console.log(`Wrote normalized itinerary audit to ${outputPath}`);
  } else {
    process.stdout.write(serialized);
  }
}

main();
