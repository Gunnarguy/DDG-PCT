#!/usr/bin/env node

// Compatibility entry point. Runtime integrity now means that the web and iOS
// files are byte-identical materializations of the checked-in PCTA + USGS
// terrain contract; the dedicated validator proves that offline.
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const result = spawnSync(
  process.execPath,
  [path.join(__dirname, "validate_runtime_bundles.mjs")],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;
