#!/usr/bin/env node
// Lightweight data sanity check to keep the runtime artifact authoritative.
import fs from "fs";
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
