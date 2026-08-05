#!/usr/bin/env node

/**
 * Builds a land-ownership overlay for the Burney Falls → Ash Camp route.
 *
 * Why this exists: the PCTA closure map shows only the parcels covered by one
 * alert. The county assessor layer shows every parcel, including private
 * owners that alert does not render (Pondosa Forest LLC at Kosk Spring,
 * Wyntoon Timberlands at the Day 5 water, Shasta Cascade Timberlands near
 * 1444). Reading a gap on the PCTA map as "public here" is exactly the
 * mistake this overlay is meant to prevent.
 *
 * The output is baked to GeoJSON rather than queried live so the map keeps
 * working offline in the field, which is the only place it actually matters.
 *
 * Ownership is classified from the assessee name. That is a planning screen
 * built on the county's current assessor roll — it is not a title report and
 * it is not a field boundary survey. Fence lines and signage on the ground win.
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PARCEL_SERVICE =
  "https://gis.shastacounty.gov/arcgis/rest/services/OpenData/ParcelAssesseeSitus/MapServer/0/query";
const TERRAIN_PATH = path.join(
  ROOT,
  "docs",
  "data",
  "canonical",
  "burney-ash-terrain-2026.json",
);
const OUTPUT_PATH = path.join(
  ROOT,
  "docs",
  "data",
  "canonical",
  "land-ownership-2026.geojson",
);
const WEB_OUTPUT_PATH = path.join(
  ROOT,
  "pct-hike-viz",
  "public",
  "data",
  "land_ownership.geojson",
);
const IOS_OUTPUT_PATH = path.join(
  ROOT,
  "DDG-Mobile",
  "DDG-Mobile",
  "Resources",
  "land_ownership.geojson",
);

/** Corridor half-width to query around the trail, in degrees (~0.6 mi). */
const CORRIDOR_PAD_DEGREES = 0.009;
/** Sample every Nth route point as a query envelope centre. */
const SAMPLE_STRIDE = 60;

/**
 * Public ownership patterns. Anything that does not match is treated as
 * private, because the safe default when ownership is unclear is "do not
 * camp here", never the reverse.
 */
const PUBLIC_PATTERNS = [
  /UNITED STATES/i,
  /FOREST SERVICE/i,
  /\bUSA\b/i,
  /BUREAU OF LAND/i,
  /STATE OF CALIF/i,
  /CALIFORNIA DEPT/i,
  /DEPARTMENT OF PARKS/i,
  /STATE PARK/i,
];

/** Known timberland owners along this corridor, for clearer labelling. */
const TIMBERLAND_PATTERNS = [
  /HEARST/i,
  /WYNTOON/i,
  /SIERRA PACIFIC/i,
  /\bSPI\b/i,
  /PONDOSA/i,
  /SHASTA CASCADE/i,
  /COLLINS/i,
  /TIMBER/i,
  /FOREST(?!\s+SERVICE)/i,
];

/**
 * Tribal land is neither "public access" nor ordinary private property, and
 * collapsing it into either is both legally and culturally wrong. It gets its
 * own class so the map never implies a right of entry.
 */
const TRIBAL_PATTERNS = [/TRIBE/i, /TRIBAL/i, /RANCHERIA/i, /INDIAN/i];

function classify(assessee) {
  const name = (assessee ?? "").trim();
  if (!name) return { ownership: "unknown", label: "Unknown owner" };
  if (TRIBAL_PATTERNS.some((pattern) => pattern.test(name))) {
    return { ownership: "tribal", label: name };
  }
  if (PUBLIC_PATTERNS.some((pattern) => pattern.test(name))) {
    return { ownership: "public", label: name };
  }
  if (TIMBERLAND_PATTERNS.some((pattern) => pattern.test(name))) {
    return { ownership: "private-timberland", label: name };
  }
  return { ownership: "private", label: name };
}

async function queryEnvelope(bbox) {
  const url = new URL(PARCEL_SERVICE);
  url.searchParams.set("geometry", bbox.join(","));
  url.searchParams.set("geometryType", "esriGeometryEnvelope");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "APN,Assessee,GIS_Acres");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("f", "geojson");

  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    throw new Error(`parcel query failed: HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (payload.error) {
    throw new Error(`parcel query error: ${JSON.stringify(payload.error)}`);
  }
  return payload.features ?? [];
}

async function main() {
  const terrain = JSON.parse(await fs.readFile(TERRAIN_PATH, "utf8"));
  const points = terrain.points;

  const envelopes = [];
  for (let index = 0; index < points.length; index += SAMPLE_STRIDE) {
    const [lon, lat] = points[index].coordinates;
    envelopes.push([
      lon - CORRIDOR_PAD_DEGREES,
      lat - CORRIDOR_PAD_DEGREES,
      lon + CORRIDOR_PAD_DEGREES,
      lat + CORRIDOR_PAD_DEGREES,
    ]);
  }

  console.log(
    `Querying ${envelopes.length} envelopes along ${terrain.route.officialPctaMiles} route miles…`,
  );

  const byApn = new Map();
  let failures = 0;
  for (const [index, bbox] of envelopes.entries()) {
    try {
      const features = await queryEnvelope(bbox);
      for (const feature of features) {
        const apn = feature.properties?.APN;
        if (!apn || byApn.has(apn)) continue;
        const { ownership, label } = classify(feature.properties?.Assessee);
        byApn.set(apn, {
          type: "Feature",
          geometry: feature.geometry,
          properties: {
            apn,
            assessee: (feature.properties?.Assessee ?? "").trim(),
            ownership,
            label,
            acres: feature.properties?.GIS_Acres ?? null,
          },
        });
      }
    } catch (error) {
      failures += 1;
      console.warn(`  envelope ${index} failed: ${error.message}`);
    }
    if ((index + 1) % 10 === 0) {
      console.log(`  ${index + 1}/${envelopes.length} — ${byApn.size} parcels so far`);
    }
  }

  if (byApn.size === 0) {
    console.error("✗ No parcels returned. Refusing to write an empty overlay.");
    process.exit(1);
  }

  const features = [...byApn.values()];
  const counts = features.reduce((tally, feature) => {
    const key = feature.properties.ownership;
    tally[key] = (tally[key] ?? 0) + 1;
    return tally;
  }, {});

  const collection = {
    type: "FeatureCollection",
    generatedAt: new Date().toISOString().slice(0, 10),
    source:
      "Shasta County ParcelAssesseeSitus assessor layer (current roll at generation time)",
    sourceUrl:
      "https://gis.shastacounty.gov/arcgis/rest/services/OpenData/ParcelAssesseeSitus/MapServer/0",
    caveat:
      "Planning screen from the county assessor roll. Not a title report and not a surveyed boundary. Ownership shown here does not by itself grant or deny access; the controlling rule for PCT passage on private timberland is the active PCTA alert. On the ground, posted signage and fence lines win.",
    routeContract: terrain.contractVersion,
    counts,
    features,
  };

  const serialized = JSON.stringify(collection);
  await Promise.all([
    fs.writeFile(OUTPUT_PATH, `${JSON.stringify(collection, null, 2)}\n`),
    fs.writeFile(WEB_OUTPUT_PATH, serialized),
    fs.writeFile(IOS_OUTPUT_PATH, serialized),
  ]);

  console.log(`\n✓ Wrote ${features.length} parcels`);
  console.table(counts);
  if (failures > 0) {
    console.warn(
      `⚠ ${failures} envelope quer${failures === 1 ? "y" : "ies"} failed; coverage may have gaps. Re-run to fill them.`,
    );
  }
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
