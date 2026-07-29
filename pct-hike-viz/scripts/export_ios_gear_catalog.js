#!/usr/bin/env node

import { build } from "esbuild";
import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputPath = path.resolve(
  root,
  "..",
  "DDG-Mobile",
  "DDG-Mobile",
  "Resources",
  "gear_catalog.json",
);

function parseWeightToPounds(raw) {
  if (raw == null) return 0;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const match = String(raw)
    .trim()
    .toLowerCase()
    .match(
      /([0-9]*\.?[0-9]+)\s*(lb|lbs|pound|pounds|oz|ounce|ounces|g|gram|grams)?/,
    );
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2];
  if (["oz", "ounce", "ounces"].includes(unit)) return value / 16;
  if (["g", "gram", "grams"].includes(unit)) return value / 453.59237;
  return value;
}

function itemWeight(item) {
  const quantity = Number(item.qty ?? 1) || 1;
  const eachPounds = Number.isFinite(item.weightEachLbs)
    ? item.weightEachLbs
    : parseWeightToPounds(item.weightEach);
  const totalPounds =
    eachPounds > 0
      ? eachPounds * quantity
      : parseWeightToPounds(item.weight);
  return {
    quantity,
    totalOunces: Number((totalPounds * 16).toFixed(3)),
    display:
      eachPounds > 0 && quantity > 1
        ? `${(eachPounds * 16).toFixed(1)} oz × ${quantity}`
        : item.weight ?? `${(totalPounds * 16).toFixed(1)} oz`,
  };
}

function weightBucket(item) {
  if (["carried", "worn", "consumable"].includes(item.weightBucket)) {
    return item.weightBucket;
  }
  if (
    (item.specs ?? []).some((spec) =>
      String(spec).toLowerCase().includes("consumable"),
    )
  ) {
    return "consumable";
  }
  return "carried";
}

const bundle = await build({
  stdin: {
    contents: `
      export { packPlanner } from "./src/data/planContent.js";
      export { resourcesIndex } from "./src/data/resourcesIndex.js";
    `,
    resolveDir: root,
    sourcefile: "ios-gear-catalog-entry.js",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(
  bundle.outputFiles[0].text,
).toString("base64")}`;
const { packPlanner, resourcesIndex } = await import(moduleUrl);
const referencedSourceIds = new Set(
  packPlanner.modules.flatMap((module) => [
    ...(module.sourceIds ?? []),
    ...module.items.flatMap((item) => item.sourceIds ?? []),
  ]),
);

const catalog = {
  version: packPlanner.version ?? 1,
  generatedFrom: "pct-hike-viz/src/data/planContent.js#packPlanner",
  packName: packPlanner.packName,
  capacityLiters: packPlanner.capacityLiters,
  baseWeightGoalPounds: packPlanner.baseWeightGoalLbs,
  consumablesStartPounds: packPlanner.consumablesStartLbs,
  summary: packPlanner.summary,
  sources: resourcesIndex
    .filter((source) => referencedSourceIds.has(source.id))
    .map((source) => ({
      id: source.id,
      title: source.title,
      url: source.url ?? null,
      category: source.category ?? source.type ?? "reference",
    })),
  modules: packPlanner.modules.map((module) => ({
    id: module.id,
    label: module.label,
    readiness: module.readiness,
    focus: module.focus,
    targetWeightPounds: module.weightLbs,
    targetVolumeLiters: module.volumeLiters,
    sourceIds: module.sourceIds ?? [],
    items: module.items.map((item) => {
      const weight = itemWeight(item);
      return {
        id: item.id,
        name: item.name,
        detail: item.detail ?? "",
        weightOunces: weight.totalOunces,
        weightDisplay: weight.display,
        weightBucket: weightBucket(item),
        quantity: weight.quantity,
        specs: item.specs ?? [],
        defaultPacked: item.defaultPacked ?? false,
        sourceIds: item.sourceIds ?? [],
      };
    }),
  })),
};

await fs.writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(
  `Wrote ${catalog.modules.reduce(
    (sum, module) => sum + module.items.length,
    0,
  )} iOS gear items to ${outputPath}`,
);
