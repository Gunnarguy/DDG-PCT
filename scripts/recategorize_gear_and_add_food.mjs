#!/usr/bin/env node

/**
 * Two changes to the gear tree, applied to web and iOS from one definition.
 *
 * 1. Empty the "custom" catch-all of things that are not optional. Trekking
 *    poles, a pack liner, cash, and permits were sitting next to "camera
 *    (optional)" and "book (optional)". Permits are required and a pack liner
 *    is core waterproofing; a bucket that mixes those with a paperback tells
 *    you nothing. Custom keeps only genuinely optional extras.
 *
 * 2. Add a food and rations module. Eight hiking days with a contingency day
 *    and no resupply anywhere on route makes food the heaviest single thing
 *    anyone carries, and the base kit only listed three snack items.
 *
 * Ration figures come from published thru-hiker planning guidance, cited per
 * item. They are planning ranges, not prescriptions — bodies differ, and the
 * point is to make the group arithmetic explicit rather than to dictate menus.
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IOS_CATALOG = path.join(
  ROOT, "DDG-Mobile", "DDG-Mobile", "Resources", "gear_catalog.json",
);
const WEB_PLAN_CONTENT = path.join(
  ROOT, "pct-hike-viz", "src", "data", "planContent.js",
);

const FOOD_MODULE_ID = "food-rations";

/** itemId -> module it should actually live in. */
const RELOCATIONS = {
  "trekking-poles": "layers-fuel",
  "pack-liner": "layers-fuel",
  wallet: "safety-hygiene",
  permits: "safety-hygiene",
};

const weightDisplay = (oz) =>
  oz >= 16 ? `${(oz / 16).toFixed(1)} lb` : `${oz} oz`;

const FOOD_ITEMS = [
  {
    id: "food-daily-ration",
    name: "Daily ration target (1.5–2.5 lb per person per day)",
    oz: 288, // 18 lb, the midpoint of 9 days at 2 lb
    quantity: 1,
    defaultPacked: true,
    detail:
      "Published thru-hiker planning puts food at roughly 1.5–2.5 lb per person per day, with 2 lb a common working number. This trip is eight hiking days plus one emergency day and there is no resupply anywhere on route, so plan nine days: about 13.5–22.5 lb per person at the trailhead, around 18 lb at 2 lb/day. That is the heaviest single thing anyone carries and it dominates the Day 1 and Day 2 pack weight before it starts burning down. Weigh your actual food bag before you leave Campbell rather than guessing.",
    specs: ["9 days including the emergency day", "~18 lb at 2 lb/day", "No resupply on route"],
    sourceIds: ["halfway-anywhere", "pcta-resupply", "erin-exploring-resupply"],
  },
  {
    id: "food-calorie-target",
    name: "Calorie plan (~3,000 carried per day)",
    oz: 0,
    quantity: 1,
    defaultPacked: true,
    detail:
      "Hikers commonly burn 4,000–6,000 calories a day on terrain like this but can realistically only carry and stomach about 3,000, so a deficit over eight days is normal and expected — do not try to close it with weight. The usual split is roughly 70% carbs, 20% fat, 10% protein. Fat is where calorie density lives: at 9 cal/g it is the cheapest way to raise calories per ounce, which is why olive oil and nut butters keep showing up in ultralight food bags.",
    specs: ["~3,000 cal/day carried", "≈70/20/10 carbs/fat/protein", "A deficit is normal"],
    sourceIds: ["halfway-anywhere", "erin-exploring-resupply", "bikehikesafari-resupply"],
  },
  {
    id: "food-bear-storage",
    name: "Bear-resistant food storage (confirm canister rule)",
    oz: 6,
    quantity: 1,
    defaultPacked: true,
    detail:
      "UNRESOLVED — confirm before you go. Published guidance places the hard canister requirement in the Trinity Alps Wilderness (Canyon Creek and Swift Creek drainages), with a bear-proof system of some kind required elsewhere in the Trinity Alps. The Burney Falls to Ash Camp corridor does not enter the Trinity Alps Wilderness, so a hard canister is probably not mandated here — but 'probably' is not a plan, and a canister is roughly 2 lb you either carry or do not. Ask the McCloud Ranger Station (530-964-2184) when you call about FS Road 38N11; it is the same phone call. Regardless of the rule, food gets stored bear-resistant every night.",
    specs: ["Verify with McCloud Ranger Station", "Bundle with the 38N11 road call", "Canister ≈ 2 lb if required"],
    sourceIds: ["pcta-permits", "usfs-castle-crags", "doc-day-plan"],
  },
  {
    id: "food-odor-bags",
    name: "Odor-proof liner bags",
    oz: 1,
    quantity: 3,
    defaultPacked: true,
    detail:
      "Sit inside whatever food storage you use. They cut the scent that draws bears and rodents to a hung bag or a stuff sack, and rodents are the likelier problem at established camps like Rock Creek — a mouse chewing through a pack pocket for a granola bar ruins gear you cannot replace for eight days. An ounce for three.",
    specs: ["Use inside the food bag", "Rodents are the likelier raider"],
    sourceIds: ["pcta-permits", "reddit-gear-recs"],
  },
  {
    id: "food-fuel-math",
    name: "Fuel sized for 8 days (not one canister by default)",
    oz: 7,
    quantity: 1,
    defaultPacked: true,
    detail:
      "A 100 g isobutane canister boils roughly 10–12 litres, which is about 2 minutes of burn per boil. Two hot meals and a morning coffee per person per day across three people for eight days will outrun a single small canister. Either carry a 230 g canister plus a 100 g reserve for the group, or decide deliberately to cold-soak and carry no stove at all. Do the arithmetic before the trip, not at the Day 3 dry camp — and note you cannot use a stove at all inside the private-timberland corridor.",
    specs: ["100 g ≈ 10–12 L boiled", "Three hikers, eight days", "No stoves in the private corridor"],
    sourceIds: ["doc-day-plan", "reddit-gear-recs", "halfway-anywhere"],
  },
  {
    id: "food-cold-soak-jar",
    name: "Cold-soak jar (stove-free option)",
    oz: 1.5,
    quantity: 1,
    defaultPacked: false,
    detail:
      "A screw-top plastic jar that rehydrates couscous, ramen, or instant potatoes in cold water over an hour or two while you walk. Worth serious consideration on this route for one reason that has nothing to do with weight: ignition sources are prohibited across the 12-mile private-timberland corridor, and late-summer NorCal fire restrictions can ban stoves outright with little notice. A cold-soak option means a stove ban does not become a food problem.",
    specs: ["No fuel, no flame", "Survives a fire-restriction stove ban", "1–2 hr soak while walking"],
    sourceIds: ["permit-pcta-campfire", "halfway-anywhere", "reddit-gear-recs"],
  },
  {
    id: "food-emergency-day",
    name: "Emergency day of food (separate, sealed)",
    oz: 32,
    quantity: 1,
    defaultPacked: true,
    detail:
      "Kept apart from the daily bags and not opened casually. Sep 6 is already the contingency day in this plan, and the Day 3 support transfer, the Ash Camp road, and the extraction all have failure modes that add a day. Two pounds of dense, no-cook calories — bars, nut butter, an extra dinner — removes food from the list of things that can go wrong if a pickup slips.",
    specs: ["Sealed and separate", "No-cook only", "Covers the Sep 6 contingency"],
    sourceIds: ["doc-day-plan", "pcta-resupply"],
  },
  {
    id: "food-trash-bag",
    name: "Dedicated trash bag (8 days of wrappers)",
    oz: 1,
    quantity: 1,
    defaultPacked: true,
    detail:
      "Everything packs out, including used toilet paper, and eight days of wrappers for three people is more volume than people expect. A dedicated odor-resistant bag keeps it from migrating through the pack. Nothing gets buried or burned — campfires and any ignition are prohibited across the private-timberland corridor regardless of what fire restrictions say elsewhere.",
    specs: ["Everything packs out", "8 days × 3 hikers", "No burning, ever"],
    sourceIds: ["permit-pcta-campfire", "pcta-permits"],
  },
];

const FOOD_MODULE_META = {
  id: FOOD_MODULE_ID,
  label: "Food + rations (8 days, no resupply)",
  readiness: "review",
  focus:
    "There is no store, no resupply, and no reliable transit anywhere on this route. Everything eaten between Burney Falls and Ash Camp leaves Campbell in a pack, which makes food the heaviest single item and the one worth weighing before departure rather than estimating.",
  targetWeightPounds: 20,
  targetVolumeLiters: 14,
  sourceIds: ["halfway-anywhere", "pcta-resupply", "erin-exploring-resupply", "doc-day-plan"],
};

// ---------------------------------------------------------------- iOS

async function updateIos() {
  const catalog = JSON.parse(await fs.readFile(IOS_CATALOG, "utf8"));
  const moduleById = new Map(catalog.modules.map((m) => [m.id, m]));

  let moved = 0;
  for (const [itemId, targetModuleId] of Object.entries(RELOCATIONS)) {
    const source = catalog.modules.find((m) => m.items.some((i) => i.id === itemId));
    const target = moduleById.get(targetModuleId);
    if (!source || !target || source.id === targetModuleId) continue;
    const index = source.items.findIndex((i) => i.id === itemId);
    const [item] = source.items.splice(index, 1);
    target.items.push(item);
    moved += 1;
  }

  catalog.modules = catalog.modules.filter((m) => m.id !== FOOD_MODULE_ID);
  catalog.modules.push({
    ...FOOD_MODULE_META,
    items: FOOD_ITEMS.map((item) => ({
      id: item.id,
      name: item.name,
      detail: item.detail,
      weightOunces: item.oz,
      weightDisplay: weightDisplay(item.oz),
      weightBucket: item.oz > 0 ? "consumable" : "carried",
      quantity: item.quantity,
      specs: item.specs,
      defaultPacked: item.defaultPacked,
      sourceIds: item.sourceIds,
    })),
  });

  await fs.writeFile(IOS_CATALOG, `${JSON.stringify(catalog, null, 2)}\n`);
  return { moved, modules: catalog.modules.length };
}

// ---------------------------------------------------------------- web

const esc = (t) => t.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

function renderWebFoodModule() {
  const items = FOOD_ITEMS.map(
    (item) => `        {
          id: "${item.id}",
          name: "${esc(item.name)}",
          detail:
            "${esc(item.detail)}",
          weight: "${weightDisplay(item.oz)}",
          quantity: ${item.quantity},
          specs: [${item.specs.map((s) => `"${esc(s)}"`).join(", ")}],
          defaultPacked: ${item.defaultPacked},
          sourceIds: [${item.sourceIds.map((s) => `"${s}"`).join(", ")}],
        },`,
  ).join("\n");

  return `    {
      id: "${FOOD_MODULE_ID}",
      label: "${esc(FOOD_MODULE_META.label)}",
      weightLbs: ${FOOD_MODULE_META.targetWeightPounds},
      volumeLiters: ${FOOD_MODULE_META.targetVolumeLiters},
      readiness: "${FOOD_MODULE_META.readiness}",
      focus:
        "${esc(FOOD_MODULE_META.focus)}",
      sourceIds: [${FOOD_MODULE_META.sourceIds.map((s) => `"${s}"`).join(", ")}],
      items: [
${items}
      ],
    },
`;
}

/** Finds the balanced `[...]` for packPlanner.modules. */
function modulesArrayBounds(source) {
  const start = source.indexOf("export const packPlanner = {");
  if (start === -1) throw new Error("packPlanner not found");
  const open = source.indexOf("[", source.indexOf("modules: [", start));
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "[") depth += 1;
    else if (source[i] === "]") {
      depth -= 1;
      if (depth === 0) return { open, close: i };
    }
  }
  throw new Error("unbalanced modules array");
}

async function updateWeb() {
  let source = await fs.readFile(WEB_PLAN_CONTENT, "utf8");
  if (source.includes(`id: "${FOOD_MODULE_ID}"`)) {
    throw new Error("food module already present in planContent.js");
  }

  // Relocate by moving each item's object literal between modules. The web
  // file is source code, so this is done textually with balanced-brace
  // matching rather than by parsing.
  let moved = 0;
  for (const [itemId, targetModuleId] of Object.entries(RELOCATIONS)) {
    const marker = `          id: "${itemId}",`;
    const markerIndex = source.indexOf(marker);
    if (markerIndex === -1) continue;

    const objectStart = source.lastIndexOf("{", markerIndex);
    let depth = 0;
    let objectEnd = -1;
    for (let i = objectStart; i < source.length; i += 1) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") {
        depth -= 1;
        if (depth === 0) { objectEnd = i; break; }
      }
    }
    if (objectEnd === -1) continue;
    let sliceEnd = objectEnd + 1;
    if (source[sliceEnd] === ",") sliceEnd += 1;
    const block = source.slice(objectStart, sliceEnd);
    const lineStart = source.lastIndexOf("\n", objectStart) + 1;
    source = source.slice(0, lineStart) + source.slice(sliceEnd).replace(/^\n/, "");

    // Append into the target module's items array.
    const targetIdIndex = source.indexOf(`id: "${targetModuleId}",`);
    if (targetIdIndex === -1) continue;
    const itemsOpen = source.indexOf("items: [", targetIdIndex);
    let itemDepth = 0;
    let itemsClose = -1;
    for (let i = source.indexOf("[", itemsOpen); i < source.length; i += 1) {
      if (source[i] === "[") itemDepth += 1;
      else if (source[i] === "]") {
        itemDepth -= 1;
        if (itemDepth === 0) { itemsClose = i; break; }
      }
    }
    if (itemsClose === -1) continue;
    source = `${source.slice(0, itemsClose)}${block.trimEnd()}\n      ${source.slice(itemsClose)}`;
    moved += 1;
  }

  const bounds = modulesArrayBounds(source);
  source = `${source.slice(0, bounds.close)}${renderWebFoodModule()}  ${source.slice(bounds.close)}`;
  await fs.writeFile(WEB_PLAN_CONTENT, source);
  return moved;
}

const ios = await updateIos();
const webMoved = await updateWeb();
console.log(`✓ Recategorized and added "${FOOD_MODULE_META.label}"`);
console.log(`  iOS: ${ios.moved} items relocated, ${ios.modules} modules`);
console.log(`  web: ${webMoved} items relocated, food module appended`);
process.exit(0);
