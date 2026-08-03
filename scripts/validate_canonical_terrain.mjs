#!/usr/bin/env node

/**
 * Fast, offline validation for the frozen PCTA + USGS terrain contract.
 * This is intentionally separate from the networked builder so CI can prove
 * that checked-in route geometry, day boundaries, and metrics still agree.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const artifactPath = path.join(
  root,
  "docs",
  "data",
  "canonical",
  "burney-ash-terrain-2026.json",
);
const sourcePath = path.join(
  root,
  "docs",
  "data",
  "source",
  "pcta-centerline-2026-burney-ash.geojson",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hashGeometry(coordinates) {
  return crypto
    .createHash("sha256")
    .update(
      coordinates
        .map((coordinate) => coordinate.map((value) => Number(value).toFixed(9)).join(","))
        .join("\n"),
    )
    .digest("hex");
}

function main() {
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const points = artifact.points;
  const boundaries = artifact.dayBoundaries;
  const selected = artifact.selectedModel;

  assert(artifact.schemaVersion === 1, "unexpected terrain-contract schema version");
  assert(artifact.route?.officialPctaMiles === 51.844, "official PCTA mileage must be 51.844");
  assert(points.length > 3_000, "terrain contract has too few route samples");
  assert(boundaries.length === 9, "need Day 0 plus eight active day boundaries");
  assert(selected?.daily?.length === 8, "need eight normalized daily terrain profiles");
  assert(
    Array.isArray(artifact.sourceReceipts?.usgs3dep?.sourceTiles) &&
      artifact.sourceReceipts.usgs3dep.sourceTiles.length > 0,
    "USGS 3DEP source receipt is missing",
  );
  assert(
    artifact.sourceReceipts?.garmin?.primary?.status === "audited" &&
      artifact.sourceReceipts?.garmin?.alternate?.status === "audited",
    "both distinct Garmin elevation streams must remain corroborated",
  );

  const sourceCoordinates = source.features?.find(
    (feature) => feature.geometry?.type === "LineString",
  )?.geometry?.coordinates;
  assert(Array.isArray(sourceCoordinates), "PCTA source crop is missing its line geometry");
  assert(
    hashGeometry(sourceCoordinates) === artifact.sourceReceipts?.pcta?.sourceCropSha256,
    "PCTA source crop geometry hash does not match the terrain contract receipt",
  );

  let previousRouteMile = -1;
  let boundaryIndex = 0;
  for (const boundary of boundaries) {
    assert(boundary.day === boundaryIndex, `expected Day ${boundaryIndex}, received Day ${boundary.day}`);
    assert(boundary.routeMile > previousRouteMile, `Day ${boundary.day} is not strictly northbound`);
    const point = points.find((candidate) => candidate.boundaryDay === boundary.day);
    assert(point, `Day ${boundary.day} does not exist as an exact route sample`);
    assert(
      Math.abs(point.routeMile - boundary.routeMile) < 0.000001 &&
        Math.abs(point.pctMile - boundary.pctMile) < 0.000001,
      `Day ${boundary.day} route/PCT mile drifted from its exact source boundary`,
    );
    previousRouteMile = boundary.routeMile;
    boundaryIndex += 1;
  }
  assert(
    Math.abs(boundaries.at(-1).routeMile - artifact.route.officialPctaMiles) < 0.000001,
    "finish route mile must equal the official PCTA trip distance",
  );

  points.forEach((point, index) => {
    assert(
      Array.isArray(point.coordinates) &&
        point.coordinates.length === 2 &&
        point.coordinates.every(Number.isFinite) &&
        Number.isFinite(point.routeMile) &&
        Number.isFinite(point.pctMile) &&
        Number.isFinite(point.usgsElevationFeet) &&
        Number.isFinite(point.normalizedElevationFeet),
      `route point ${index} is malformed`,
    );
  });

  const totalMiles = selected.daily.reduce((sum, day) => sum + day.distanceMiles, 0);
  const totalGain = selected.daily.reduce((sum, day) => sum + day.gainFeet, 0);
  const totalLoss = selected.daily.reduce((sum, day) => sum + day.lossFeet, 0);
  assert(Math.abs(totalMiles - 51.844) < 0.001, "daily PCTA mileage does not total 51.844");
  assert(totalGain === selected.totalGainFeet, "daily gain does not equal total gain");
  assert(totalLoss === selected.totalLossFeet, "daily loss does not equal total loss");

  console.log("✓ Canonical PCTA + USGS terrain contract is internally consistent");
  console.table({
    "Official PCTA miles": artifact.route.officialPctaMiles,
    "Centerline geometry miles": artifact.route.extractedCenterlineMiles,
    "Normalized gain ft": selected.totalGainFeet,
    "Normalized loss ft": selected.totalLossFeet,
    "Normalized high ft": selected.maxElevationFeet,
    "Exact day boundaries": boundaries.length,
    "Terrain samples": points.length,
  });
}

try {
  main();
} catch (error) {
  console.error(`Canonical terrain validation failed: ${error.message}`);
  process.exitCode = 1;
}
