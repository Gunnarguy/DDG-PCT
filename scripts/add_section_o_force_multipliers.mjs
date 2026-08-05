#!/usr/bin/env node

/**
 * Adds the "Section O force multipliers" gear module to both platforms from a
 * single definition.
 *
 * Web (planContent.js packPlanner) and iOS (gear_catalog.json) each carry their
 * own hand-maintained copy of the gear tree, so anything added by hand has to
 * be written twice and drifts the moment someone edits one. This writes both.
 *
 * Every item here is justified by a verified fact about THIS trip — the
 * measured dry-carry distance, the 2026 water reports, the parcel audit, the
 * Open-Meteo forecast — not by a generic "10 things I always pack" list. The
 * rationale lives in each item's detail so it survives being read out of
 * context on trail.
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IOS_CATALOG = path.join(
  ROOT,
  "DDG-Mobile",
  "DDG-Mobile",
  "Resources",
  "gear_catalog.json",
);
const WEB_PLAN_CONTENT = path.join(
  ROOT,
  "pct-hike-viz",
  "src",
  "data",
  "planContent.js",
);

const MODULE_ID = "section-o-force-multipliers";

/** oz → "X.Y lb" / "N oz" for the web `weight` string. */
const weightDisplay = (oz) =>
  oz >= 16 ? `${(oz / 16).toFixed(1)} lb` : `${oz} oz`;

const ITEMS = [
  {
    id: "so-extra-reservoir-2l",
    name: "Extra 2L collapsible reservoir (carry two)",
    oz: 3,
    quantity: 2,
    defaultPacked: true,
    detail:
      "The single most important item on this list. The Day 2 camp is dry and there is no legal water between Peavine (PCT 1434.236) and Bartle Gap (1447.531) — every source in between sits on private timberland. That is roughly 13.3 miles, and 14.6 if the Day 3 driver does not appear and you continue to Moosehead. That span has to cover dinner, a dry overnight, breakfast, and a 12.59-mile day. Peak load leaving Peavine is about 10-11 L per person; the rest of this kit only holds about 5 L. Two extra reservoirs close the gap for 6 oz. They pack flat and weigh nothing when empty.",
    specs: ["2 L each", "Packs flat when empty", "Closes the dry-carry gap"],
    sourceIds: ["doc-day-plan", "doc-water-hat-creek", "farout-pct"],
  },
  {
    id: "so-water-scoop",
    name: "Wide-mouth scoop / cut-down bottle",
    oz: 0.5,
    quantity: 1,
    defaultPacked: true,
    detail:
      "Several sources on this route are shallow or barely moving, and a squeeze filter cannot draw from a puddle. The 2026 reports describe Upper Jake Spring as 'shallow flow', the Moosehead alternate as 'a strong trickle from a leaf spout, about one liter per 30 seconds', and multiple seasonal streams as trickling. A cut-down bottle or a small rigid scoop turns a twenty-minute fill into a two-minute one, three times a day, for half an ounce.",
    specs: ["Cut a smartwater bottle in half", "For shallow and trickle sources"],
    sourceIds: ["doc-water-hat-creek", "farout-pct"],
  },
  {
    id: "so-trekking-umbrella",
    name: "Reflective trekking umbrella",
    oz: 8,
    quantity: 1,
    defaultPacked: false,
    detail:
      "Open-Meteo showed 89.8°F at the Day 2 dry-camp elevation in early August, and this route has long exposed stretches with little canopy. A silver umbrella is portable shade: it drops perceived temperature substantially, and shade is the cheapest way to cut how much water you drink on a route where water is the binding constraint. Clips to a shoulder strap so it runs hands-free with poles. Skip it if the forecast turns windy — it becomes a sail.",
    specs: ["Reflective canopy", "Hands-free clip to pack strap", "Wind is its limit"],
    sourceIds: ["doc-day-plan", "reddit-norcal-tips", "halfway-anywhere"],
  },
  {
    id: "so-poison-oak-wash",
    name: "Poison oak wash + pre-exposure barrier",
    oz: 2,
    quantity: 1,
    defaultPacked: true,
    detail:
      "Not optional on this route. The PCT Water Report entry for the McCloud River at 1472.5 — your finish — carries an explicit 'Watch for Poison Oak' warning, and it is common at the lower elevations at both ends of this section. A barrier lotion before you walk and a wash after exposure is the difference between a normal week and eight days of misery you cannot escape. Wash within a couple of hours of contact for it to work.",
    specs: ["Apply barrier before, wash after", "Verified hazard at Ash Camp"],
    sourceIds: ["doc-water-hat-creek", "trailhiker-section-o", "usfs-castle-crags"],
  },
  {
    id: "so-packable-daypack",
    name: "Packable daypack for Day 3",
    oz: 3,
    quantity: 1,
    defaultPacked: true,
    detail:
      "Specific to this itinerary and easy to forget. On Day 3 you hand your overnight pack to the driver at Bartle Gap and cover 12.591 miles with day packs only — that is the whole reason Day 3 works. If your pack has no removable lid or daypack mode, you need something to carry water, food, layers, and first aid for a long day. Confirm before the trip which of the three of you actually has this covered.",
    specs: ["Day 3 supported traverse", "Or use a removable pack lid", "Confirm per hiker"],
    sourceIds: ["doc-day-plan", "reddit-gear-recs"],
  },
  {
    id: "so-smoke-mask",
    name: "N95 respirator (smoke)",
    oz: 1,
    quantity: 2,
    defaultPacked: true,
    detail:
      "Early September is NorCal fire season, and the air-quality reading for the corridor was already US AQI 72-88 (moderate) in early August with no active fire nearby. Smoke can arrive from a fire a hundred miles away without any closure applying to you. Two N95s weigh an ounce total and are the difference between hiking out through haze and having a genuinely bad time. Check the AQI forecast the morning you leave Campbell.",
    specs: ["Two per hiker", "For drifting smoke, not proximity to fire"],
    sourceIds: ["doc-day-plan", "reddit-norcal-tips"],
  },
  {
    id: "so-power-budget",
    name: "Second power bank or 20,000mAh upgrade",
    oz: 12,
    quantity: 1,
    defaultPacked: false,
    detail:
      "Eight days with no resupply and no charging anywhere on route. A single 10,000mAh bank is roughly two phone charges — thin once you add GPS position tracking on the map, a satellite messenger topping up, headlamp recharges, and cold nights draining batteries faster. Decide as a group: either everyone upgrades, or one person carries a second bank as the shared reserve. Navigation dying on Day 6 is a real failure, not an inconvenience.",
    specs: ["No charging on route", "Group decision, not per-hiker default"],
    sourceIds: ["doc-day-plan", "reddit-gear-recs"],
  },
  {
    id: "so-sleep-warmth-check",
    name: "Warm hat + long sleep bottoms",
    oz: 5,
    quantity: 1,
    defaultPacked: true,
    detail:
      "The daily temperature swing here is large: the same forecast that showed 89.8°F highs showed 57.6°F lows, and your camps sit between 3,069 and 6,092 ft, so the high camps run colder still. Days feel like summer and nights do not. A warm hat and dedicated dry sleep bottoms weigh almost nothing and are what actually determines whether you sleep, which determines how the next day goes.",
    specs: ["32°F+ diurnal swing", "Camps to 6,092 ft", "Never hike in sleep layers"],
    sourceIds: ["doc-day-plan", "wv-2017-log"],
  },
  {
    id: "so-electrolyte-scaleup",
    name: "Electrolytes sized for heat (3 per person per day)",
    oz: 6,
    quantity: 1,
    defaultPacked: true,
    detail:
      "The base kit lists 6-10 packets. On a hot, exposed, water-limited route that is roughly a third of what you want. At 3 per person per day across eight days you need about 24 each. They weigh almost nothing, they make marginal-tasting backcountry water drinkable, and cramping on the Day 3 traverse — where stopping is not legal and the driver is on a clock — is the worst possible place to learn you under-packed them.",
    specs: ["About 24 per hiker", "Also masks off-taste from silty sources"],
    sourceIds: ["doc-day-plan", "reddit-gear-recs", "halfway-anywhere"],
  },
  {
    id: "so-offline-maps-check",
    name: "Downloaded offline maps (pre-trip task)",
    oz: 0,
    quantity: 1,
    defaultPacked: true,
    detail:
      "Weighs nothing and is the most common preventable failure. GPS is satellite-based and works the entire route with no cell service, so your position dot is always live — but the basemap underneath it needs tiles that were cached while you had signal. Download the Apple Maps offline region covering Burney Falls to Ash Camp before leaving Campbell. The app's own trail line, camps, water, and ownership parcels are bundled and render offline regardless.",
    specs: ["Do it before leaving Campbell", "GPS works without cell; tiles do not"],
    sourceIds: ["doc-day-plan", "farout-pct"],
  },
];

const MODULE_META = {
  id: MODULE_ID,
  label: "Section O force multipliers",
  readiness: "review",
  focus:
    "Small items that specifically solve this route's measured problems: a 13-14 mile dry carry with no legal collection, 89°F exposed days against 57°F nights, verified poison oak at the finish, and a Day 3 traverse where stopping is not an option.",
  targetWeightPounds: 2.5,
  targetVolumeLiters: 3,
  sourceIds: ["doc-day-plan", "doc-water-hat-creek", "farout-pct", "reddit-norcal-tips"],
};

async function updateIosCatalog() {
  const raw = await fs.readFile(IOS_CATALOG, "utf8");
  const catalog = JSON.parse(raw);
  catalog.modules = catalog.modules.filter((module) => module.id !== MODULE_ID);
  catalog.modules.push({
    ...MODULE_META,
    items: ITEMS.map((item) => ({
      id: item.id,
      name: item.name,
      detail: item.detail,
      weightOunces: item.oz,
      weightDisplay: weightDisplay(item.oz),
      weightBucket: "carried",
      quantity: item.quantity,
      specs: item.specs,
      defaultPacked: item.defaultPacked,
      sourceIds: item.sourceIds,
    })),
  });
  await fs.writeFile(IOS_CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);
  return catalog.modules.length;
}

function renderWebModule() {
  const esc = (text) => text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const itemBlocks = ITEMS.map(
    (item) => `        {
          id: "${item.id}",
          name: "${esc(item.name)}",
          detail:
            "${esc(item.detail)}",
          weight: "${weightDisplay(item.oz)}",
          quantity: ${item.quantity},
          specs: [${item.specs.map((spec) => `"${esc(spec)}"`).join(", ")}],
          defaultPacked: ${item.defaultPacked},
          sourceIds: [${item.sourceIds.map((id) => `"${id}"`).join(", ")}],
        },`,
  ).join("\n");

  return `    {
      id: "${MODULE_ID}",
      label: "${esc(MODULE_META.label)}",
      weightLbs: ${MODULE_META.targetWeightPounds},
      volumeLiters: ${MODULE_META.targetVolumeLiters},
      readiness: "${MODULE_META.readiness}",
      focus:
        "${esc(MODULE_META.focus)}",
      sourceIds: [${MODULE_META.sourceIds.map((id) => `"${id}"`).join(", ")}],
      items: [
${itemBlocks}
      ],
    },
`;
}

async function updateWebPlanContent() {
  let source = await fs.readFile(WEB_PLAN_CONTENT, "utf8");
  if (source.includes(`id: "${MODULE_ID}"`)) {
    throw new Error(
      "planContent.js already contains the module; remove it before regenerating.",
    );
  }
  // Insert as the last module in packPlanner.modules, just before the closing
  // bracket of that array.
  const anchor = "export const packPlanner = {";
  const start = source.indexOf(anchor);
  if (start === -1) throw new Error("could not find packPlanner in planContent.js");
  const modulesStart = source.indexOf("modules: [", start);
  if (modulesStart === -1) throw new Error("could not find packPlanner.modules");

  // Walk to the matching close bracket of the modules array.
  let depth = 0;
  let index = source.indexOf("[", modulesStart);
  const arrayOpen = index;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) throw new Error("unbalanced modules array");
  const arrayClose = index;
  const before = source.slice(0, arrayClose);
  const after = source.slice(arrayClose);
  source = `${before}${renderWebModule()}  ${after}`;
  void arrayOpen;
  await fs.writeFile(WEB_PLAN_CONTENT, source);
}

const iosModuleCount = await updateIosCatalog();
await updateWebPlanContent();
console.log(`✓ Added "${MODULE_META.label}" with ${ITEMS.length} items`);
console.log(`  iOS gear_catalog.json  → ${iosModuleCount} modules`);
console.log(`  web planContent.js     → packPlanner.modules updated`);
process.exit(0);
