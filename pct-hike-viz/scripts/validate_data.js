#!/usr/bin/env node
// Lightweight data sanity check to keep the runtime artifact authoritative.
import fs from "fs";
import process from "node:process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(path.join(__dirname, ".."));
const canonicalPath = path.join(root, "public", "data", "hike_data.json");
const mirrorPath = path.join(root, "src", "hike_data.json");

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return { raw, data: JSON.parse(raw) };
  } catch (err) {
    throw new Error(`Failed to read ${filePath}: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function sumRouteSegments(route) {
  const segments = route?.properties?.segments;
  if (!Array.isArray(segments) || !segments.length) return null;
  const total = segments.reduce(
    (sum, seg) => sum + (Number(seg.distance) || 0),
    0
  );
  return Number(total.toFixed(2));
}

function main() {
  const { raw: canonicalRaw, data: canonical } = readJson(canonicalPath);
  const mirrorExists = fs.existsSync(mirrorPath);
  const mirror = mirrorExists ? readJson(mirrorPath) : null;

  const routePath =
    canonical?.route?.path || canonical?.route?.geometry?.coordinates;
  assert(
    Array.isArray(routePath) && routePath.length > 0,
    "Route path missing or empty in canonical dataset"
  );

  const features = canonical?.features || [];
  assert(features.length > 0, "No features found in canonical dataset");

  const waterSources = canonical?.waterSources || [];
  assert(Array.isArray(waterSources), "waterSources must be an array");
  assert(waterSources.length > 0, "waterSources array is empty");
  assert(
    canonical?.route?.metadata?.active_endpoint === "Ash Camp",
    "Active endpoint must be Ash Camp"
  );
  assert(
    Math.abs(Number(canonical?.route?.metadata?.active_distance_miles) - 51.844) < 0.01,
    "Active route must measure 51.844 official PCTA 2026 miles"
  );
  assert(
    Math.abs(Number(canonical?.route?.metadata?.active_gps_distance_miles) - 51.664) < 0.1,
    "Cropped Garmin route must measure approximately 51.664 miles"
  );
  assert(
    Number(canonical?.route?.metadata?.start_pct_mile) === 1420.653 &&
      Number(canonical?.route?.metadata?.finish_pct_mile) === 1472.497,
    "PCTA 2026 start/finish miles are stale"
  );
  assert(
    Array.isArray(canonical?.route?.extendedPath) &&
      canonical.route.extendedPath.length > 1,
    "Future-route geometry must be retained separately"
  );
  assert(
    waterSources.every(
      (source) => source.reportStatus === "current-condition-check-required"
    ),
    "Static water points must require a current-condition check"
  );

  const activeFeatures = features.filter(
    (feature) => Number(feature.properties?.day) >= 0
  );
  assert(
    activeFeatures.length === 9 &&
      activeFeatures.at(-1)?.properties?.day === 8 &&
      activeFeatures.at(-1)?.properties?.name === "Ash Camp pickup",
    "Active itinerary must contain Day 0 plus eight legs ending at Ash Camp"
  );
  assert(
    !activeFeatures.some((feature) =>
      String(feature.properties?.name).toLowerCase().includes("kosk")
    ),
    "Kosk must not be an active overnight"
  );
  const day2 = activeFeatures.find(
    (feature) => Number(feature.properties?.day) === 2
  );
  const day3 = activeFeatures.find(
    (feature) => Number(feature.properties?.day) === 3
  );
  assert(
    day2?.properties?.name === "Pre-private USFS dry camp" &&
      Math.abs(Number(day2.properties.routeMile) - 14.287) < 0.001,
    "Day 2 must end at the screened pre-private USFS dry camp"
  );
  assert(
    day3?.properties?.name === "Bartle Gap supported extraction" &&
      day3?.properties?.type === "Support Transfer" &&
      day3?.properties?.stopType === "support-transfer" &&
      day3?.properties?.packMode === "day-pack-supported" &&
      Math.abs(Number(day3.properties.routeMile) - 26.878) < 0.001,
    "Day 3 must be the supported day-pack traverse to Bartle Gap, not a camp"
  );
  assert(
    Number(canonical?.route?.properties?.total_gain_feet) === 6524 &&
      Number(canonical?.route?.properties?.total_loss_feet) === 7050,
    "Continuous thresholded elevation totals are stale"
  );
  assert(
    Number(canonical?.activePlan?.userSuppliedSourceTrackMiles) === 80.826 &&
      Number(canonical?.activePlan?.legacyAppFullTrackMiles) === 82.898,
    "Long-route source measurements must remain explicitly reconciled"
  );

  const segmentMiles = sumRouteSegments(canonical.route);
  if (segmentMiles !== null) {
    assert(segmentMiles > 0, "Route segment distances sum to zero");
  }

  if (mirrorExists) {
    assert(
      mirror.raw === canonicalRaw,
      "src/hike_data.json is out of sync with public/data/hike_data.json"
    );
  }

  console.log("✓ hike_data.json sanity checks passed");
  if (segmentMiles !== null) {
    console.log(`  Segmented miles: ${segmentMiles}`);
  }
  console.log(`  Features: ${features.length}`);
  console.log(`  Water sources: ${waterSources.length}`);
  if (mirrorExists) {
    console.log("  Mirror check: in sync");
  } else {
    console.log("  Mirror check: skipped (src/hike_data.json not found)");
  }
}

try {
  main();
} catch (err) {
  console.error(`Validation failed: ${err.message}`);
  process.exit(1);
}
