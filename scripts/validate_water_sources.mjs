#!/usr/bin/env node
/**
 * Cross-checks the canonical water sources carried in the generated runtime
 * bundle against the official "PCT Water Report -- Northern California" CSV.
 *
 * This reads the generated bundle directly rather than importing planContent.js.
 * The previous version imported the legacy six-day narrative shape, could not
 * resolve under plain Node ESM, and — once it did run — compared a generic
 * placeholder string against the report and reported eight false "missing"
 * rows every time. A validator that always fails teaches people to ignore it.
 *
 * Three separate things are reported, because they are not the same question:
 *
 *   1. Do our canonical sources line up with the report's mileage?
 *   2. Which report sources are NOT in our plan? Some exclusions are
 *      deliberate and documented in docs/2026-trip-source-of-truth.md
 *      (Strider Creek was nearly dry; Gold Creek has access/trespass
 *      concerns). Those are listed so the decision stays visible, not silent.
 *   3. How old is the newest field observation? "Mapped" is not "flowing",
 *      and a source last seen in 2022 is not evidence about 2026.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CSV_PATH = path.join(
  ROOT,
  "docs",
  "data",
  "source",
  "pct-water-norcal-2026-08-02.csv",
);
const BUNDLE_PATH = path.join(
  ROOT,
  "pct-hike-viz",
  "public",
  "data",
  "hike_data.json",
);

/** Sources intentionally left out of the plan, with the reason on record. */
const DOCUMENTED_EXCLUSIONS = new Map([
  [1422.4, "Lake Britton Dam is a crossing/gate, not a planned water source. 2026-07-09: level too low on the east shore, water dirty with pollen."],
  [1437.2, "Unnamed seasonal spring: reported DRY 2026-07-10. Not carryable."],
  [1445.4, "Unnamed seasonal stream: reported DRY 2026-07-11. Not carryable."],
  [1459.7, "Gold Creek: flowing 2026-07-04, but access has documented private-property concerns, so it stays out of the plan."],
  [1461.1, "Unnamed seasonal stream: only trickling 2026-07-16; too marginal to plan a carry against."],
  [1465.5, "Unnamed seasonal stream: flowing 2026-07-17, but it sits between two strong Deer Creek sources and adds nothing to the plan."],
  [1470.3, "Strider Creek: 'very slowly trickling, basically dry' 2026-07-12. Not a dependable carry point."],
  [1470.9, "Ash Camp Campground: the plan uses the McCloud River at 1472.497."],
]);

const MATCH_TOLERANCE_MILES = 0.2;

const bundle = JSON.parse(fs.readFileSync(BUNDLE_PATH, "utf8"));
const canonical = bundle.waterSources ?? [];
if (canonical.length === 0) {
  console.error("✗ No canonical water sources found in the runtime bundle.");
  process.exit(1);
}

const startMile = Math.min(...canonical.map((s) => s.pctMile));
const endMile = Math.max(...canonical.map((s) => s.pctMile));

const rows = parse(fs.readFileSync(CSV_PATH, "utf8"), {
  relax_column_count: true,
  skip_empty_lines: true,
});

const headerText = rows.slice(0, 3).flat().join(" ");
const snapshotLabel =
  headerText.match(/Updated\s+([0-9/]+)/i)?.[1] ?? "unknown";

// Columns: 0 section, 1 mile, 2 PCTA id, 3 description, 4 reports, 5 last date.
const reportSources = rows
  .map((row) => ({
    mile: Number.parseFloat(row[1]),
    description: (row[3] ?? "").replace(/\s+/g, " ").trim(),
    lastReport: (row[5] ?? "").trim(),
  }))
  .filter(
    (row) =>
      Number.isFinite(row.mile) &&
      row.mile >= startMile - 0.1 &&
      row.mile <= endMile + 0.1,
  );

const nearest = (mile, list, key) =>
  list.reduce((best, candidate) => {
    const delta = Math.abs(candidate[key] - mile);
    return best === null || delta < Math.abs(best[key] - mile) ? candidate : best;
  }, null);

console.log("═".repeat(66));
console.log("DDG Section O — canonical water sources vs PCT Water Report");
console.log("═".repeat(66));
console.log(`Report snapshot : ${path.basename(CSV_PATH)} (header: ${snapshotLabel})`);
console.log(`Plan coverage   : PCT miles ${startMile} – ${endMile}`);
console.log(`Canonical       : ${canonical.length} sources`);
console.log(`Report in range : ${reportSources.length} sources`);

// 1. Mileage alignment.
const drift = [];
const unmatchedCanonical = [];
for (const source of canonical) {
  const match = nearest(source.pctMile, reportSources, "mile");
  const delta = match ? Math.abs(match.mile - source.pctMile) : Infinity;
  if (delta > MATCH_TOLERANCE_MILES) {
    unmatchedCanonical.push(source);
  } else if (delta > 0.05) {
    drift.push({ source, match, delta });
  }
}

console.log("\n── 1. Mileage alignment ──");
if (drift.length === 0 && unmatchedCanonical.length === 0) {
  console.log(`✓ All ${canonical.length} canonical sources match the report within 0.05 mi.`);
} else {
  drift.forEach(({ source, match, delta }) =>
    console.log(
      `~ ${source.name}: plan ${source.pctMile} vs report ${match.mile} (Δ ${delta.toFixed(2)} mi)`,
    ),
  );
  unmatchedCanonical.forEach((source) =>
    console.log(`✗ ${source.name} @ ${source.pctMile}: no report source within ${MATCH_TOLERANCE_MILES} mi`),
  );
}

// 2. Report sources absent from the plan.
console.log("\n── 2. Report sources not carried in the plan ──");
let undocumented = 0;
for (const row of reportSources) {
  const match = nearest(row.mile, canonical, "pctMile");
  if (match && Math.abs(match.pctMile - row.mile) <= MATCH_TOLERANCE_MILES) continue;
  const reason = DOCUMENTED_EXCLUSIONS.get(row.mile);
  if (reason) {
    console.log(`  (deliberate) ${row.mile}: ${row.description || "—"}\n               ${reason}`);
  } else {
    undocumented += 1;
    console.log(`? ${row.mile}: ${row.description || "—"} — no exclusion reason on record`);
  }
}
if (undocumented === 0) {
  console.log("✓ Every omitted report source has a documented reason.");
}

// 3. Observation age — the part that actually decides whether to trust it.
console.log("\n── 3. Field-observation age ──");
const years = new Map();
for (const row of reportSources) {
  const year = row.lastReport.match(/(\d{2})$/)?.[1];
  const label = year ? `20${year}` : "no date";
  years.set(label, (years.get(label) ?? 0) + 1);
}
[...years.entries()]
  .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
  .forEach(([year, count]) => console.log(`  ${year}: ${count} source${count === 1 ? "" : "s"}`));

const newestYear = Math.max(
  ...[...years.keys()].map((y) => Number.parseInt(y, 10)).filter(Number.isFinite),
);
const TRIP_YEAR = 2026;
const TRIP_START = "2026-08-29";
if (Number.isFinite(newestYear) && TRIP_YEAR - newestYear >= 2) {
  console.log(
    `\n⚠ Newest field observation in this snapshot is ${newestYear} — ${TRIP_YEAR - newestYear} years before the trip.`,
  );
  console.log("  This snapshot documents WHERE water is mapped, not whether it flows in 2026.");
  console.log("  Refresh https://pctwater.com/ and current FarOut comments before the carry plan is final.");
}

// 4. Current status of the sources we actually plan to use. This is the part
//    that changes the packing list, so it prints last and loudest.
console.log("\n── 4. Planned-source status (from the snapshot) ──");
const dry = [];
const marginal = [];
let oldestPlanned = null;
for (const source of canonical) {
  const observation = source.latestObservation;
  if (!observation) continue;
  if (observation.status === "reported-dry") dry.push(source);
  else if (observation.status === "reported-marginal") marginal.push(source);
  if (!oldestPlanned || observation.observedOn < oldestPlanned.latestObservation.observedOn) {
    oldestPlanned = source;
  }
}
if (dry.length === 0 && marginal.length === 0) {
  console.log("✓ No planned source is reported dry or marginal in this snapshot.");
}
for (const source of dry) {
  console.log(
    `✗ DRY  ${source.name} @ ${source.pctMile} — "${source.latestObservation.note}" (${source.latestObservation.observer}, ${source.latestObservation.observedOn})`,
  );
}
for (const source of marginal) {
  console.log(
    `~ THIN ${source.name} @ ${source.pctMile} — "${source.latestObservation.note}" (${source.latestObservation.observer}, ${source.latestObservation.observedOn})`,
  );
}
if (oldestPlanned) {
  console.log(
    `\nWeakest evidence among planned sources: ${oldestPlanned.name} @ ${oldestPlanned.pctMile}, last seen ${oldestPlanned.latestObservation.observedOn}.`,
  );
}
console.log(
  `\nSeasonal caveat: hiking starts ${TRIP_START}. Any reading from June or July is\nweeks ahead of trip conditions in a drying season — read marginal as worse, never better.`,
);

console.log("\n" + "═".repeat(66));
if (unmatchedCanonical.length > 0 || undocumented > 0) {
  console.log("Result: review required — see flagged rows above.");
  process.exit(1);
}
if (dry.length > 0) {
  console.log(
    `Result: reconciled, but ${dry.length} planned source(s) reported DRY — the carry plan must not depend on them.`,
  );
  process.exit(1);
}
console.log("Result: canonical water sources reconcile with the report snapshot.");
