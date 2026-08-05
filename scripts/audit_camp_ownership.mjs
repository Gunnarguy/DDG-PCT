#!/usr/bin/env node

/**
 * Point-in-polygon check of every camp, stop, and water source against the
 * baked land-ownership overlay.
 *
 * This answers one question and answers it the same way every time: is this
 * spot somewhere we may legally stop? It exists because a coarse
 * "USFS/open-access mapping" screen had rated the Day 5 water as public when
 * the county assessor roll puts it on Wyntoon Timberlands. Eyeballing a
 * closure map is how that kind of thing gets missed.
 *
 * Run after scripts/build_land_ownership.mjs.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const read = (...segments) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, ...segments), "utf8"));

const ownership = read("pct-hike-viz", "public", "data", "land_ownership.geojson");
const terrain = read("docs", "data", "canonical", "burney-ash-terrain-2026.json");
const runtime = read("pct-hike-viz", "public", "data", "hike_data.json");

function pointInRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const straddles = yi > point[1] !== yj > point[1];
    if (straddles && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Respects interior rings so a hole in a parcel is not counted as inside it. */
function pointInFeature(point, feature) {
  const polygons =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
  for (const polygon of polygons) {
    if (!pointInRing(point, polygon[0])) continue;
    let inHole = false;
    for (let i = 1; i < polygon.length; i += 1) {
      if (pointInRing(point, polygon[i])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

function ownerAt(point) {
  if (!point) return null;
  for (const feature of ownership.features) {
    if (pointInFeature(point, feature)) return feature.properties;
  }
  return null;
}

const problems = [];

function describe(properties) {
  if (!properties) {
    return { flag: "no-parcel", detail: "No assessed parcel (treat as federal/unassessed)" };
  }
  return { flag: properties.ownership, detail: properties.assessee };
}

console.log("═".repeat(74));
console.log("Camp, stop, and water ownership audit");
console.log("═".repeat(74));
console.log(
  `Overlay: ${ownership.features.length} parcels, generated ${ownership.generatedAt}`,
);

console.log("\n── Camps and stops ──");
for (const boundary of terrain.dayBoundaries) {
  const properties =
    ownerAt(boundary.trailCoordinates) ?? ownerAt(boundary.fieldCoordinates);
  const { flag, detail } = describe(properties);
  const legalToStop = flag === "public" || flag === "no-parcel";
  if (!legalToStop && boundary.stopType === "camp") {
    problems.push(
      `Day ${boundary.day} camp "${boundary.name}" is on ${flag} land (${detail}). A camp cannot sit here.`,
    );
  }
  console.log(
    `${legalToStop ? "OK " : "!! "} Day ${String(boundary.day).padEnd(2)} PCT ${String(boundary.pctMile).padEnd(10)} ${boundary.name.slice(0, 34).padEnd(36)} ${flag.padEnd(20)} ${detail}`,
  );
}

console.log("\n── Water sources ──");
for (const source of runtime.waterSources) {
  const { flag, detail } = describe(ownerAt(source.coordinates));
  const collectable = flag === "public" || flag === "no-parcel";
  console.log(
    `${collectable ? "OK " : "!! "} PCT ${String(source.pctMile).padEnd(10)} ${source.name.slice(0, 32).padEnd(34)} ${flag.padEnd(20)} ${detail}`,
  );
}

const privateWater = runtime.waterSources.filter((source) => {
  const { flag } = describe(ownerAt(source.coordinates));
  return flag !== "public" && flag !== "no-parcel";
});

console.log("\n── Reading ──");
console.log(
  "Camps must be on public land. Water on private timberland is not a planned",
);
console.log(
  "collection point: the PCTA alert allows passage but prohibits extended stops,",
);
console.log("so size every carry against the public-land sources only.");

if (privateWater.length > 0) {
  console.log(
    `\n${privateWater.length} water source(s) sit on private land and must not anchor a carry:`,
  );
  for (const source of privateWater) {
    console.log(`  · ${source.name} @ PCT ${source.pctMile}`);
  }
}

console.log("\n" + "═".repeat(74));
if (problems.length > 0) {
  problems.forEach((problem) => console.log(`✗ ${problem}`));
  process.exit(1);
}
console.log("Result: every camp and stop-to-sleep location is on public land.");
