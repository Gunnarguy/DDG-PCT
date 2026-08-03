import terrain from "./tripTerrain.generated.json";
import { primaryItinerary, tripFacts } from "./tripFacts";

// These classes are generated from non-overlapping 100m windows of the same
// normalized USGS 3DEP profile drawn in the elevation chart. They describe a
// planning-grade signal, not a surveyed trail-grade or a promise about footing.
export const slopeCategories = [
  {
    id: "easy",
    range: "0–5%",
    label: "Gentle grade",
    color: "#4CA723",
    emoji: "🟢",
    maxPercent: 5,
    description: "Mostly level or gently rolling in the 100m profile windows.",
  },
  {
    id: "moderate",
    range: "5–10%",
    label: "Moderate grade",
    color: "#F8FD55",
    emoji: "🟡",
    maxPercent: 10,
    description: "Noticeable climbing or descending; adjust pace and footing.",
  },
  {
    id: "steep",
    range: "10–15%",
    label: "Steep grade",
    color: "#F1B840",
    emoji: "🟠",
    maxPercent: 15,
    description: "Sustained enough to slow a loaded group or increase knee load.",
  },
  {
    id: "verySteep",
    range: "15%+",
    label: "Very steep grade",
    color: "#EE3323",
    emoji: "🔴",
    maxPercent: Number.POSITIVE_INFINITY,
    description: "The strongest 100m planning-grade windows in the normalized profile.",
  },
];

const gradeByDay = new Map(
  (terrain.gradeAnalysis?.days ?? []).map((day) => [Number(day.day), day]),
);

const narrativeByDay = {
  1: "Short opening leg after travel. Treat it as a shakedown rather than a free day.",
  2: "The largest climb, ending at a dry-camp candidate that still needs current field verification.",
  3: "The longest day, completed with day packs and a timed Bartle Gap extraction. Continuous travel through private timberland is mandatory.",
  4: "Exact-point Bartle Gap re-entry, followed by the climb to the route high point and dry camp.",
  5: "A short day with meaningful downhill. Keep the descent controlled rather than treating the mileage as automatic recovery.",
  6: "Mixed climbing and descending on accumulated fatigue.",
  7: "The knee-intensive sustained descent to Butcherknife Creek.",
  8: "Short final descent to the Ash Camp pickup, with the road-access plan still needing verification.",
};

function difficultyFor(leg) {
  if (leg.stopType === "support-transfer") return "Very strenuous";
  if (leg.terrainLoad.kneeLoad === "very-high" || leg.terrainLoad.kneeLoad === "high") {
    return "Strenuous (downhill)";
  }
  if (leg.terrainLoad.effortRank <= 3) return "Strenuous";
  if (leg.terrainLoad.effortRank >= 7) return "Easy–moderate";
  return "Moderate";
}

function categoryFor(grade) {
  return (
    slopeCategories.find(
      (category) => grade.maxAbsolutePercent < category.maxPercent,
    ) ?? slopeCategories.at(-1)
  );
}

export const sectionOTerrainProfile = Object.fromEntries(
  primaryItinerary.map((leg) => {
    const grade = gradeByDay.get(leg.day);
    const category = grade ? categoryFor(grade) : slopeCategories[0];
    return [
      `day${leg.day}`,
      {
        ...leg,
        elevationGain: leg.elevation.gain,
        elevationLoss: leg.elevation.loss,
        maxUphillPercent: grade?.maxUphillPercent ?? 0,
        maxDownhillPercent: grade?.maxDownhillPercent ?? 0,
        maxAbsolutePercent: grade?.maxAbsolutePercent ?? 0,
        maxAbsoluteAngleDegrees: grade?.maxAbsoluteAngleDegrees ?? 0,
        terrainBreakdown: grade?.mix ?? {},
        gradeWindowCount: grade?.windowCount ?? 0,
        difficulty: difficultyFor(leg),
        notes: narrativeByDay[leg.day] ?? "Current field verification required.",
        categoryEmoji: category.emoji,
        categoryLabel: category.label,
        estimatedTime: `${leg.timeEstimate.lowHours}–${leg.timeEstimate.highHours} hours`,
      },
    ];
  }),
);

const profileFor = (day) => sectionOTerrainProfile[`day${day}`];

export const terrainHazards = [
  {
    location: "Day 2: largest climb",
    concern: `+${profileFor(2).elevationGain.toLocaleString()} ft in ${profileFor(2).distance.toFixed(3)} miles, ending at a dry camp`,
    mitigation:
      "Start early, use a sustainable pace, and leave the last confirmed legal source with enough water for camp and the supported traverse.",
    coordinates: profileFor(2).coordinates,
  },
  {
    location: "Day 7: Butcherknife Creek descent",
    concern: `−${profileFor(7).elevationLoss.toLocaleString()} ft in ${profileFor(7).distance.toFixed(3)} miles`,
    mitigation:
      "Use poles, shorten stride, manage hotspots early, and allow more time than flat mileage suggests.",
    coordinates: profileFor(7).coordinates,
  },
];

export const getDayTerrainSummary = (day) => sectionOTerrainProfile[`day${day}`] ?? null;

export const terrainGradeMethod = {
  method: terrain.gradeAnalysis?.method ?? "Grade analysis unavailable.",
  windowMeters: terrain.gradeAnalysis?.windowMeters ?? 100,
  totalGainFeet: tripFacts.route.totalGainFeet,
  totalLossFeet: tripFacts.route.totalLossFeet,
};

export default {
  slopeCategories,
  sectionOTerrainProfile,
  terrainHazards,
  getDayTerrainSummary,
  terrainGradeMethod,
};
