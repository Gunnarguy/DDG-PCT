#!/usr/bin/env node

// Compatibility entry point for anyone who previously ran this check. The
// old script compared the active route against a different historical GPX
// crop, which is no longer a valid authority. The canonical PCTA + USGS
// validation verifies the actual shipped route and the Garmin audit receipt.
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const result = spawnSync(
  process.execPath,
  [path.join(__dirname, "validate_canonical_terrain.mjs")],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
