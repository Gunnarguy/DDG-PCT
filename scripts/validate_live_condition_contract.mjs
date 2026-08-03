#!/usr/bin/env node

/**
 * Guard the live-condition payload against stale Garmin distance values and
 * make it impossible to deploy it against a different terrain contract than
 * the web and iOS route bundles.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const runtimePath = path.join(root, "pct-hike-viz/public/data/hike_data.json");
const functionPath = path.join(
  root,
  "pct-hike-viz/supabase/functions/trail-conditions/index.ts",
);
const webClientPath = path.join(
  root,
  "pct-hike-viz/src/services/trailConditionsService.js",
);
const iosModelPath = path.join(
  root,
  "DDG-Mobile/DDG-Mobile/Models/TrailConditionModels.swift",
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const runtime = JSON.parse(fs.readFileSync(runtimePath, "utf8"));
  const source = fs.readFileSync(functionPath, "utf8");
  const webClient = fs.readFileSync(webClientPath, "utf8");
  const iosModel = fs.readFileSync(iosModelPath, "utf8");
  const metadata = runtime.route?.metadata ?? {};

  assert(
    !/\bgpsMiles\s*:/.test(source),
    "live condition function still exposes a stale gpsMiles route fact",
  );
  assert(
    source.includes(`version: \"${metadata.source_of_truth_version}\"`),
    "live condition function plan version does not match generated runtime metadata",
  );
  assert(
    source.includes(`dataContractSha256: \"${metadata.data_contract_sha256}\"`),
    "live condition function terrain hash does not match generated runtime metadata",
  );
  assert(
    source.includes(`officialMiles: ${metadata.active_distance_miles}`),
    "live condition function official mileage does not match the PCTA runtime route",
  );
  assert(
    source.includes(`centerlineGeometryMiles: ${metadata.active_centerline_geometry_miles}`),
    "live condition function centerline geometry mileage is stale",
  );
  assert(
    webClient.includes(`CURRENT_TERRAIN_CONTRACT_SHA256 =\n  "${metadata.data_contract_sha256}"`),
    "web condition client does not require the canonical terrain hash",
  );
  assert(
    webClient.includes("snapshot?.routeFacts?.dataContractSha256 === CURRENT_TERRAIN_CONTRACT_SHA256"),
    "web condition client does not reject mismatched terrain hashes",
  );
  assert(
    iosModel.includes(`static let currentTerrainContractHash =\n        "${metadata.data_contract_sha256}"`),
    "iOS condition client does not require the canonical terrain hash",
  );
  assert(
    iosModel.includes("routeFacts?.dataContractSha256 == Self.currentTerrainContractHash"),
    "iOS condition client does not reject mismatched terrain hashes",
  );

  console.log("✓ Live condition payload is pinned to the canonical PCTA + USGS terrain contract");
} catch (error) {
  console.error(`Live condition contract validation failed: ${error.message}`);
  process.exitCode = 1;
}
