#!/usr/bin/env node

/**
 * Materializes the single PCTA + USGS terrain contract into the three runtime
 * bundle locations. No consumer may hand-edit route geometry or elevation:
 *
 *   docs/data/canonical/burney-ash-terrain-2026.json
 *       -> pct-hike-viz/public/data/hike_data.json
 *       -> pct-hike-viz/src/hike_data.json (tooling mirror)
 *       -> DDG-Mobile/DDG-Mobile/Resources/hike_data.json
 *
 *   docs/data/canonical/trip-operations-2026.json
 *       -> pct-hike-viz/src/data/tripOperations.generated.json
 *       -> DDG-Mobile/DDG-Mobile/Resources/trip_operations.json
 *
 *   docs/data/canonical/field-brief-2026.json
 *       -> pct-hike-viz/public/data/field_brief.json
 *       -> pct-hike-viz/src/data/fieldBrief.generated.json
 *       -> DDG-Mobile/DDG-Mobile/Resources/field_brief.json
 *       -> docs/DDG-Field-Brief-2026.md
 *
 * The source template preserves narrative, driving, towns, and condition
 * metadata that is not terrain-derived. It is never used as a source for
 * active-route geometry or daily elevation math.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(
  ROOT,
  "docs",
  "data",
  "source",
  "hike_data-template.json",
);
const TERRAIN_PATH = path.join(
  ROOT,
  "docs",
  "data",
  "canonical",
  "burney-ash-terrain-2026.json",
);
const WEB_RUNTIME_PATH = path.join(
  ROOT,
  "pct-hike-viz",
  "public",
  "data",
  "hike_data.json",
);
const WEB_MIRROR_PATH = path.join(ROOT, "pct-hike-viz", "src", "hike_data.json");
const IOS_RUNTIME_PATH = path.join(
  ROOT,
  "DDG-Mobile",
  "DDG-Mobile",
  "Resources",
  "hike_data.json",
);
const WEB_TERRAIN_FACTS_PATH = path.join(
  ROOT,
  "pct-hike-viz",
  "src",
  "data",
  "tripTerrain.generated.json",
);
const OPERATIONS_SOURCE_PATH = path.join(
  ROOT,
  "docs",
  "data",
  "canonical",
  "trip-operations-2026.json",
);
const WEB_OPERATIONS_PATH = path.join(
  ROOT,
  "pct-hike-viz",
  "src",
  "data",
  "tripOperations.generated.json",
);
const IOS_OPERATIONS_PATH = path.join(
  ROOT,
  "DDG-Mobile",
  "DDG-Mobile",
  "Resources",
  "trip_operations.json",
);
const FLIGHT_STATUS_OPERATIONS_PATH = path.join(
  ROOT,
  "pct-hike-viz",
  "supabase",
  "functions",
  "flight-status",
  "trip_operations.json",
);
const FLIGHT_STATUS_OPERATIONS_MODULE_PATH = path.join(
  ROOT,
  "pct-hike-viz",
  "supabase",
  "functions",
  "flight-status",
  "trip_operations.ts",
);
const FIELD_BRIEF_SOURCE_PATH = path.join(
  ROOT,
  "docs",
  "data",
  "canonical",
  "field-brief-2026.json",
);
const WEB_FIELD_BRIEF_PATH = path.join(
  ROOT,
  "pct-hike-viz",
  "src",
  "data",
  "fieldBrief.generated.json",
);
const WEB_FIELD_BRIEF_PUBLIC_PATH = path.join(
  ROOT,
  "pct-hike-viz",
  "public",
  "data",
  "field_brief.json",
);
const WEB_FIELD_BRIEF_MARKDOWN_PATH = path.join(
  ROOT,
  "pct-hike-viz",
  "public",
  "data",
  "DDG-Field-Brief-2026.md",
);
const IOS_FIELD_BRIEF_PATH = path.join(
  ROOT,
  "DDG-Mobile",
  "DDG-Mobile",
  "Resources",
  "field_brief.json",
);
const FIELD_BRIEF_MARKDOWN_PATH = path.join(
  ROOT,
  "docs",
  "DDG-Field-Brief-2026.md",
);
const GRADE_WINDOW_METERS = 100;
const GRADE_BUCKETS = [
  { id: "easy", label: "0–5% gentle", maxPercent: 5 },
  { id: "moderate", label: "5–10% moderate", maxPercent: 10 },
  { id: "steep", label: "10–15% steep", maxPercent: 15 },
  { id: "verySteep", label: "15%+ very steep", maxPercent: Number.POSITIVE_INFINITY },
];

function parseArgs() {
  return {
    bootstrapTemplate: process.argv.includes("--bootstrap-template"),
  };
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function round(value, places = 3) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function haversineFeet(a, b) {
  const radians = (value) => (value * Math.PI) / 180;
  const latitude1 = radians(a[1]);
  const latitude2 = radians(b[1]);
  const latitudeDelta = latitude2 - latitude1;
  const longitudeDelta = radians(b[0] - a[0]);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) *
      Math.cos(latitude2) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.sqrt(value)) * 3.280839895;
}

function normalizeCoordinates(value) {
  const longitude = Array.isArray(value)
    ? Number(value[0])
    : Number(value?.longitude ?? value?.lon ?? value?.lng);
  const latitude = Array.isArray(value)
    ? Number(value[1])
    : Number(value?.latitude ?? value?.lat);
  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude) ||
    longitude < -180 ||
    longitude > 180 ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }
  return [longitude, latitude];
}

function nearestRoutePoint(points, coordinates) {
  let nearest = null;
  let nearestSquaredDegrees = Number.POSITIVE_INFINITY;
  for (const point of points) {
    const candidate = point.coordinates;
    const squaredDegrees =
      (candidate[0] - coordinates[0]) ** 2 +
      (candidate[1] - coordinates[1]) ** 2;
    if (squaredDegrees < nearestSquaredDegrees) {
      nearest = point;
      nearestSquaredDegrees = squaredDegrees;
    }
  }
  return nearest;
}

function byDay(entries) {
  return new Map(entries.map((entry) => [Number(entry.day), entry]));
}

function normalizedElevationAtStation(points, stationMeters) {
  if (stationMeters <= points[0].stationMeters) {
    return Number(points[0].normalizedElevationFeet);
  }
  if (stationMeters >= points.at(-1).stationMeters) {
    return Number(points.at(-1).normalizedElevationFeet);
  }

  let lowerIndex = 0;
  let upperIndex = points.length - 1;
  while (upperIndex - lowerIndex > 1) {
    const middle = Math.floor((lowerIndex + upperIndex) / 2);
    if (points[middle].stationMeters <= stationMeters) lowerIndex = middle;
    else upperIndex = middle;
  }

  const lower = points[lowerIndex];
  const upper = points[upperIndex];
  const spanMeters = upper.stationMeters - lower.stationMeters;
  if (spanMeters <= 0) return Number(lower.normalizedElevationFeet);
  const fraction = (stationMeters - lower.stationMeters) / spanMeters;
  return (
    Number(lower.normalizedElevationFeet) +
    (Number(upper.normalizedElevationFeet) - Number(lower.normalizedElevationFeet)) *
      fraction
  );
}

function gradeBucketFor(absolutePercent) {
  return GRADE_BUCKETS.find((bucket) => absolutePercent < bucket.maxPercent);
}

/**
 * Grade is deliberately calculated from the same normalized elevation profile
 * that the apps render. These are planning-grade values—not a claim about
 * every root, rock, or GPS point on the physical trail.
 */
function buildGradeAnalysis(terrain) {
  const boundaryByDay = byDay(terrain.dayBoundaries);
  const points = terrain.points;
  const pointForRouteMile = (routeMile) =>
    points.find(
      (point) => Math.abs(Number(point.routeMile) - Number(routeMile)) < 0.000001,
    );

  const days = terrain.selectedModel.daily.map((metric) => {
    const start = pointForRouteMile(metric.startRouteMile);
    const finish = pointForRouteMile(metric.endRouteMile);
    if (!start || !finish) {
      throw new Error(`Cannot calculate grade: Day ${metric.day} is missing a terrain boundary`);
    }

    const bucketMeters = Object.fromEntries(
      GRADE_BUCKETS.map((bucket) => [bucket.id, 0]),
    );
    let maxUphillPercent = 0;
    let maxDownhillPercent = 0;
    let windowCount = 0;
    let stationMeters = start.stationMeters;

    while (stationMeters < finish.stationMeters - 0.001) {
      const nextStationMeters = Math.min(
        stationMeters + GRADE_WINDOW_METERS,
        finish.stationMeters,
      );
      const horizontalMeters = nextStationMeters - stationMeters;
      const elevationDeltaFeet =
        normalizedElevationAtStation(points, nextStationMeters) -
        normalizedElevationAtStation(points, stationMeters);
      const gradePercent =
        (elevationDeltaFeet * 0.3048 * 100) / horizontalMeters;
      const absolutePercent = Math.abs(gradePercent);
      const bucket = gradeBucketFor(absolutePercent);

      bucketMeters[bucket.id] += horizontalMeters;
      if (gradePercent > 0) maxUphillPercent = Math.max(maxUphillPercent, gradePercent);
      else maxDownhillPercent = Math.max(maxDownhillPercent, absolutePercent);
      windowCount += 1;
      stationMeters = nextStationMeters;
    }

    const totalMeters = Object.values(bucketMeters).reduce(
      (sum, value) => sum + value,
      0,
    );
    const maxAbsolutePercent = Math.max(maxUphillPercent, maxDownhillPercent);
    const endBoundary = boundaryByDay.get(metric.day);
    return {
      day: metric.day,
      windowCount,
      maxUphillPercent: round(maxUphillPercent, 1),
      maxDownhillPercent: round(maxDownhillPercent, 1),
      maxAbsolutePercent: round(maxAbsolutePercent, 1),
      maxAbsoluteAngleDegrees: round(
        (Math.atan(maxAbsolutePercent / 100) * 180) / Math.PI,
        1,
      ),
      mix: Object.fromEntries(
        GRADE_BUCKETS.map((bucket) => [
          bucket.id,
          {
            label: bucket.label,
            meters: round(bucketMeters[bucket.id], 1),
            percent: round((bucketMeters[bucket.id] / totalMeters) * 100, 1),
          },
        ]),
      ),
      stopType: endBoundary?.stopType ?? "camp",
    };
  });

  return {
    method:
      "Non-overlapping 100m windows from the rendered USGS 3DEP normalized elevation profile; use as a planning-grade indicator, not a surveyed trail-grade claim.",
    windowMeters: GRADE_WINDOW_METERS,
    classes: GRADE_BUCKETS.map(({ id, label }) => ({ id, label })),
    days,
  };
}

function defaultSegmentText(day, metric, boundary) {
  if (boundary.stopType === "support-transfer") {
    return `${metric.distanceMiles.toFixed(1)} mi day-pack-supported continuous traverse; extract at the agreed field pin and return to the exact PCTA crossing before Day 4.`;
  }
  if (boundary.stopType === "finish") {
    return `${metric.distanceMiles.toFixed(1)} mi to the Ash Camp pickup. Confirm FS Road 38N11 before Mikaela drives it.`;
  }
  return `${metric.distanceMiles.toFixed(1)} mi · +${metric.gainFeet.toLocaleString()} ft / −${metric.lossFeet.toLocaleString()} ft`;
}

function runtimeFeatures(template, terrain) {
  const oldActiveByDay = byDay(
    (template.features ?? []).filter((feature) => Number(feature.properties?.day) >= 0),
  );
  const metricsByDay = byDay(terrain.selectedModel.daily);
  const retained = (template.features ?? []).filter(
    (feature) => Number(feature.properties?.day) < 0,
  );

  const active = terrain.dayBoundaries.map((boundary) => {
    const previous = oldActiveByDay.get(boundary.day);
    const metric = boundary.day > 0 ? metricsByDay.get(boundary.day) : null;
    const type =
      boundary.day === 0
        ? "Trailhead"
        : boundary.stopType === "support-transfer"
          ? "Support Transfer"
          : boundary.day === 8
            ? "Finish"
            : "Camp";
    const preservedProperties = previous?.properties ?? {};
    return {
      type: "Feature",
      // The icon stays at the real field/camp/pickup coordinate. Route colors,
      // graph position, and daily boundaries use properties.trailCoordinates.
      geometry: { type: "Point", coordinates: boundary.fieldCoordinates },
      properties: {
        ...preservedProperties,
        name: boundary.name,
        day: boundary.day,
        itinerary: "express",
        mile: boundary.pctMile,
        pctMile: boundary.pctMile,
        routeMile: boundary.routeMile,
        type,
        stopType: boundary.stopType,
        campStatus: boundary.campStatus,
        packMode: boundary.packMode,
        trailCoordinates: boundary.trailCoordinates,
        fieldCoordinates: boundary.fieldCoordinates,
        fieldToTrailOffsetFeet: boundary.fieldToTrailOffsetFeet,
        startElevation:
          metric ? `${metric.startElevationFeet.toLocaleString()} ft` : undefined,
        endElevation:
          metric ? `${metric.endElevationFeet.toLocaleString()} ft` : undefined,
        gainFeet: metric?.gainFeet,
        lossFeet: metric?.lossFeet,
        highPointFeet: metric?.highPointFeet,
        lowPointFeet: metric?.lowPointFeet,
        segment:
          preservedProperties.segment ??
          (metric ? defaultSegmentText(boundary.day, metric, boundary) : "Trip start"),
        notes: boundary.notes || preservedProperties.notes || "",
      },
    };
  });

  return [...retained, ...active];
}

function runtimeWaterSources(template, terrain) {
  return (template.waterSources ?? [])
    .map((source) => {
      const coordinates = normalizeCoordinates(source.coordinates);
      if (!coordinates) return null;
      const nearest = nearestRoutePoint(terrain.points, coordinates);
      const trailOffsetFeet = haversineFeet(coordinates, nearest.coordinates);
      return {
        ...source,
        coordinates,
        mile: round(nearest.pctMile, 3),
        pctMile: round(nearest.pctMile, 3),
        routeMile: round(nearest.routeMile, 3),
        trailCoordinates: nearest.coordinates,
        trailOffsetFeet: Math.round(trailOffsetFeet),
        locationSource:
          "PCTA 2026 centerline projection; water coordinate retained at its actual reported location",
        reportStatus:
          source.reportStatus ?? "current-condition-check-required",
        type: source.type ?? "water",
      };
    })
    .filter(Boolean)
    .sort((first, second) => first.routeMile - second.routeMile);
}

function runtimeTransport(template, terrain) {
  const dayByName = new Map(
    terrain.dayBoundaries.map((boundary) => [boundary.name, boundary]),
  );
  const replacements = [
    ["Burney Falls Trailhead", terrain.dayBoundaries[0]],
    ["Bartle Gap Supported Transfer", terrain.dayBoundaries.find((boundary) => boundary.day === 3)],
    ["Ash Camp Pickup", terrain.dayBoundaries.at(-1)],
  ];
  const replacementByName = new Map(replacements.filter(([, boundary]) => boundary));

  return (template.transport ?? [])
    .map((point) => {
      const coordinates = normalizeCoordinates(point.coordinates);
      if (!coordinates) return null;
      const boundary = replacementByName.get(point.name) ?? dayByName.get(point.name);
      return {
        ...point,
        coordinates: boundary?.fieldCoordinates ?? coordinates,
        ...(boundary
          ? {
              trailCoordinates: boundary.trailCoordinates,
              fieldToTrailOffsetFeet: boundary.fieldToTrailOffsetFeet,
            }
          : {}),
      };
    })
    .filter(Boolean);
}

function runtimeDriveSegments(template) {
  return (template.driveSegments ?? [])
    .map((segment, index) => {
      const path = (segment.path ?? []).map(normalizeCoordinates).filter(Boolean);
      if (path.length < 2) return null;
      return {
        ...segment,
        id:
          segment.id ??
          (index === 0 ? "drive-in" : index === 1 ? "drive-home" : `drive-${index}`),
        routeRole:
          segment.routeRole ?? (index === 0 ? "drive-in" : index === 1 ? "drive-home" : "drive"),
        path,
      };
    })
    .filter(Boolean);
}

function runtimeSegments(terrain) {
  const boundariesByDay = byDay(terrain.dayBoundaries);
  return terrain.selectedModel.daily.map((metric) => {
    const start = boundariesByDay.get(metric.day - 1);
    const end = boundariesByDay.get(metric.day);
    return {
      day: metric.day,
      distance: metric.distanceMiles,
      routeMileStart: metric.startRouteMile,
      routeMileEnd: metric.endRouteMile,
      pctMileStart: metric.startPctMile,
      pctMileEnd: metric.endPctMile,
      start: start.name,
      end: end.name,
      gain: metric.gainFeet,
      loss: metric.lossFeet,
      startElevation: metric.startElevationFeet,
      endElevation: metric.endElevationFeet,
      highPoint: metric.highPointFeet,
      lowPoint: metric.lowPointFeet,
      stopType: end.stopType,
      campStatus: end.campStatus,
      packMode: end.packMode,
      trailEndCoordinates: end.trailCoordinates,
      fieldEndCoordinates: end.fieldCoordinates,
      fieldToTrailOffsetFeet: end.fieldToTrailOffsetFeet,
    };
  });
}

function buildRuntimeData(template, terrain, terrainHash) {
  const runtime = structuredClone(template);
  const routePath = terrain.points.map((point) => [
    ...point.coordinates,
    point.normalizedElevationFeet,
    point.routeMile,
  ]);
  const segments = runtimeSegments(terrain);
  const boundaryByDay = byDay(terrain.dayBoundaries);
  const retainedMetadata = { ...(runtime.route?.metadata ?? {}) };
  [
    "source",
    "points_total",
    "simplified_step",
    "simplified_points",
    "active_endpoint",
    "active_points",
    "active_distance_miles",
    "active_gps_distance_miles",
    "full_track_points",
    "full_track_distance_miles",
    "extended_route_status",
    "archived_pre_start_points",
    "archived_pre_start_status",
    "user_supplied_garmin_export_distance_miles",
    "user_supplied_garmin_active_crop_miles",
    "user_supplied_garmin_source_sha256",
    "legacy_app_full_track_distance_miles",
    "full_track_reconciliation",
  ].forEach((key) => delete retainedMetadata[key]);

  runtime.route = {
    ...runtime.route,
    name: terrain.route.name,
    path: routePath,
    metadata: {
      ...retainedMetadata,
      source: terrain.route.geometrySource,
      points_total: routePath.length,
      simplified_step: "25m fixed physical sampling",
      simplified_points: routePath.length,
      source_of_truth_version: terrain.contractVersion,
      data_contract: "docs/data/canonical/burney-ash-terrain-2026.json",
      data_contract_sha256: terrainHash,
      generated_at: terrain.generatedAt,
      geometry_source: terrain.route.geometrySource,
      elevation_source: terrain.route.elevationSource,
      elevation_unit: "feet",
      elevation_display_model:
        "USGS 3DEP, 25m resampling, centered 200m mean; normalized values are the rendered profile",
      elevation_accumulation_method: terrain.route.elevationMethod,
      start_name: "Burney Falls PCT access",
      start_coordinate: boundaryByDay.get(0).trailCoordinates,
      start_field_coordinate: boundaryByDay.get(0).fieldCoordinates,
      start_pct_mile: terrain.route.startPctMile,
      finish_coordinate: boundaryByDay.get(8).trailCoordinates,
      finish_field_coordinate: boundaryByDay.get(8).fieldCoordinates,
      finish_pct_mile: terrain.route.finishPctMile,
      active_endpoint: "Ash Camp",
      active_points: routePath.length,
      active_distance_miles: terrain.route.officialPctaMiles,
      active_centerline_geometry_miles: terrain.route.extractedCenterlineMiles,
      distance_display_miles: Number(terrain.route.officialPctaMiles.toFixed(1)),
      distance_method:
        "PCTA 2026 mile-marker-calibrated centerline; route-path coordinates retain their separately measured physical length",
      terrain_usgs_3dep_fetched_at: terrain.sourceReceipts.usgs3dep.fetchedAt,
      terrain_usgs_3dep_tiles: terrain.sourceReceipts.usgs3dep.sourceTiles.map(
        (tile) => tile.title,
      ),
      garmin_primary_active_crop_miles:
        terrain.sourceReceipts.garmin.primary.activeCropNativeMiles,
      garmin_alternate_active_crop_miles:
        terrain.sourceReceipts.garmin.alternate.activeCropNativeMiles,
      historicalGarminEvidence: {
        suppliedEndToEndMiles: 80.826,
        legacyAppEndToEndMiles: 82.898,
        activeCropMiles:
          terrain.sourceReceipts.garmin.primary.activeCropNativeMiles,
        note:
          "Garmin exports are retained only as corroboration. They do not control the active PCTA route geometry, mileage, or elevation profile.",
      },
    },
    properties: {
      ...(runtime.route?.properties ?? {}),
      min_elevation: terrain.selectedModel.minElevationFeet,
      max_elevation: terrain.selectedModel.maxElevationFeet,
      total_gain_feet: terrain.selectedModel.totalGainFeet,
      total_loss_feet: terrain.selectedModel.totalLossFeet,
      elevation_accumulation_method: terrain.route.elevationMethod,
      segments,
    },
  };

  runtime.features = runtimeFeatures(template, terrain);
  runtime.waterSources = runtimeWaterSources(template, terrain);
  runtime.transport = runtimeTransport(template, terrain);
  runtime.driveSegments = runtimeDriveSegments(template);
  runtime.activePlan = {
    ...(runtime.activePlan ?? {}),
    distanceMiles: terrain.route.officialPctaMiles,
    centerlineGeometryMiles: terrain.route.extractedCenterlineMiles,
    distanceDisplayMiles: Number(terrain.route.officialPctaMiles.toFixed(1)),
    hikingDays: terrain.selectedModel.daily.length,
    finish: "Ash Camp / McCloud River",
    terrainContractSha256: terrainHash,
    elevation: {
      gainFeet: terrain.selectedModel.totalGainFeet,
      lossFeet: terrain.selectedModel.totalLossFeet,
      highPointFeet: terrain.selectedModel.maxElevationFeet,
      source: terrain.route.elevationSource,
      method: terrain.route.elevationMethod,
    },
  };
  runtime.dataContract = {
    schemaVersion: 1,
    terrainContract: "docs/data/canonical/burney-ash-terrain-2026.json",
    terrainContractSha256: terrainHash,
    generatedAt: terrain.generatedAt,
    sourceReceipts: {
      pctaCropSha256: terrain.sourceReceipts.pcta.sourceCropSha256,
      usgs3depFetchedAt: terrain.sourceReceipts.usgs3dep.fetchedAt,
      garminPrimarySha256: terrain.sourceReceipts.garmin.primary.sha256,
      garminAlternateSha256: terrain.sourceReceipts.garmin.alternate.sha256,
    },
  };

  return runtime;
}

function buildWebTerrainFacts(terrain, terrainHash) {
  const boundaryByDay = byDay(terrain.dayBoundaries);
  const gradeAnalysis = buildGradeAnalysis(terrain);
  return {
    schemaVersion: 2,
    generatedAt: terrain.generatedAt,
    terrainContractSha256: terrainHash,
    route: {
      officialPctaMiles: terrain.route.officialPctaMiles,
      extractedCenterlineMiles: terrain.route.extractedCenterlineMiles,
      startPctMile: terrain.route.startPctMile,
      finishPctMile: terrain.route.finishPctMile,
      totalGainFeet: terrain.selectedModel.totalGainFeet,
      totalLossFeet: terrain.selectedModel.totalLossFeet,
      minElevationFeet: terrain.selectedModel.minElevationFeet,
      maxElevationFeet: terrain.selectedModel.maxElevationFeet,
      geometrySource: terrain.route.geometrySource,
      elevationSource: terrain.route.elevationSource,
      elevationMethod: terrain.route.elevationMethod,
      gradeMethod: gradeAnalysis.method,
    },
    dayBoundaries: terrain.dayBoundaries,
    days: terrain.selectedModel.daily.map((metric) => ({
      ...metric,
      from: boundaryByDay.get(metric.day - 1).name,
      to: boundaryByDay.get(metric.day).name,
      stopType: boundaryByDay.get(metric.day).stopType,
      campStatus: boundaryByDay.get(metric.day).campStatus,
      packMode: boundaryByDay.get(metric.day).packMode,
      trailEndCoordinates: boundaryByDay.get(metric.day).trailCoordinates,
      fieldEndCoordinates: boundaryByDay.get(metric.day).fieldCoordinates,
      fieldToTrailOffsetFeet: boundaryByDay.get(metric.day).fieldToTrailOffsetFeet,
    })),
    sensitivity: terrain.sensitivity,
    gradeAnalysis,
    sourceReceipts: terrain.sourceReceipts,
  };
}

function buildRuntimeOperations(operations, terrain, terrainHash) {
  const boundaryByDay = byDay(terrain.dayBoundaries);
  const start = boundaryByDay.get(0);
  const dayThree = boundaryByDay.get(3);
  const finish = boundaryByDay.get(8);

  if (!start || !dayThree || !finish) {
    throw new Error("Canonical terrain is missing a required operations boundary");
  }

  return {
    ...structuredClone(operations),
    generatedAt: terrain.generatedAt,
    terrainContract: "docs/data/canonical/burney-ash-terrain-2026.json",
    terrainContractSha256: terrainHash,
    canonicalRoute: {
      name: terrain.route.name,
      officialPctaMiles: terrain.route.officialPctaMiles,
      centerlineGeometryMiles: terrain.route.extractedCenterlineMiles,
      terrainContractVersion: terrain.contractVersion,
      dataContractSha256: terrainHash,
      start: {
        name: start.name,
        routeMile: start.routeMile,
        pctMile: start.pctMile,
        trailCoordinates: start.trailCoordinates,
        fieldCoordinates: start.fieldCoordinates,
      },
      finish: {
        name: finish.name,
        routeMile: finish.routeMile,
        pctMile: finish.pctMile,
        trailCoordinates: finish.trailCoordinates,
        fieldCoordinates: finish.fieldCoordinates,
      },
    },
    dayThreeSupport: {
      ...structuredClone(operations.dayThreeSupport),
      routeMile: dayThree.routeMile,
      pctMile: dayThree.pctMile,
      trailCoordinates: dayThree.trailCoordinates,
      fieldCoordinates: dayThree.fieldCoordinates,
      fieldToTrailOffsetFeet: dayThree.fieldToTrailOffsetFeet,
    },
    finishPlan: {
      ...structuredClone(operations.finishPlan),
      routeMile: finish.routeMile,
      pctMile: finish.pctMile,
      fieldCoordinates: finish.fieldCoordinates,
      trailCoordinates: finish.trailCoordinates,
    },
  };
}

function buildRuntimeFieldBrief(fieldBrief, operations, terrain, terrainHash) {
  const boundaryByDay = byDay(terrain.dayBoundaries);
  const focusByDay = byDay(fieldBrief.dayFocus ?? []);
  const referencedSourceIDs = new Set([
    ...(fieldBrief.sourceIds ?? []),
    ...((fieldBrief.emergency?.contacts ?? []).flatMap((contact) => contact.sourceIds ?? [])),
  ]);
  const sources = (operations.sources ?? []).filter((source) =>
    referencedSourceIDs.has(source.id),
  );

  if (sources.length !== referencedSourceIDs.size) {
    const resolved = new Set(sources.map((source) => source.id));
    const missing = [...referencedSourceIDs].filter((id) => !resolved.has(id));
    throw new Error(`Field brief references missing operational sources: ${missing.join(", ")}`);
  }

  const daily = terrain.selectedModel.daily.map((metric) => {
    const start = boundaryByDay.get(metric.day - 1);
    const finish = boundaryByDay.get(metric.day);
    const focus = focusByDay.get(metric.day);
    if (!start || !finish || !focus) {
      throw new Error(`Field brief is missing the canonical focus for Day ${metric.day}`);
    }
    return {
      ...structuredClone(focus),
      ...metric,
      startName: start.name,
      endName: finish.name,
      stopType: finish.stopType,
      campStatus: finish.campStatus,
      packMode: finish.packMode,
      routeMileStart: metric.startRouteMile,
      routeMileEnd: metric.endRouteMile,
      pctMileStart: metric.startPctMile,
      pctMileEnd: metric.endPctMile,
    };
  });

  return {
    ...structuredClone(fieldBrief),
    generatedAt: terrain.generatedAt,
    terrainContract: "docs/data/canonical/burney-ash-terrain-2026.json",
    terrainContractVersion: terrain.contractVersion,
    terrainContractSha256: terrainHash,
    route: {
      name: terrain.route.name,
      officialPctaMiles: terrain.route.officialPctaMiles,
      centerlineGeometryMiles: terrain.route.extractedCenterlineMiles,
      totalGainFeet: terrain.selectedModel.totalGainFeet,
      totalLossFeet: terrain.selectedModel.totalLossFeet,
      minElevationFeet: terrain.selectedModel.minElevationFeet,
      maxElevationFeet: terrain.selectedModel.maxElevationFeet,
      hikingDays: terrain.selectedModel.daily.length,
    },
    daily,
    operations: {
      status: operations.status,
      dayThreeSupport: structuredClone(operations.dayThreeSupport),
      finishPlan: structuredClone(operations.finishPlan),
      gates: structuredClone(operations.gates ?? []),
    },
    sources,
  };
}

function markdownEscape(value = "") {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function renderFieldBriefMarkdown(brief) {
  const sourceByID = new Map((brief.sources ?? []).map((source) => [source.id, source]));
  const sourceLinks = (ids) =>
    ids
      .map((id) => sourceByID.get(id))
      .filter(Boolean)
      .map((source) =>
        source.url
          ? `[${markdownEscape(source.title)}](${source.url})`
          : markdownEscape(source.title),
      )
      .join("; ");

  const lines = [
    "# DDG Field Brief — Burney Falls PCT access → Ash Camp",
    "",
    `> Generated from the canonical terrain and operations artifacts on ${brief.generatedAt}. Do not hand-edit this file; edit its source JSON and run \`npm run data:generate\`.`,
    "",
    "## Route contract",
    "",
    `- **Official distance:** ${brief.route.officialPctaMiles.toFixed(3)} PCTA miles (${brief.route.centerlineGeometryMiles.toFixed(3)} mi measured geometry)` ,
    `- **Terrain:** +${brief.route.totalGainFeet.toLocaleString()} ft / −${brief.route.totalLossFeet.toLocaleString()} ft; ${brief.route.minElevationFeet.toLocaleString()}–${brief.route.maxElevationFeet.toLocaleString()} ft`,
    `- **Finish:** Ash Camp pickup at route mile ${brief.operations.finishPlan.routeMile.toFixed(3)} / PCT mile ${brief.operations.finishPlan.pctMile.toFixed(3)}` ,
    `- **Contract:** ${brief.terrainContractVersion} · SHA-256 \`${brief.terrainContractSha256}\``,
    "",
    "## Non-negotiable operating rules",
    "",
    ...brief.operationalRules.map((rule) => `- **${markdownEscape(rule.title)}:** ${markdownEscape(rule.detail)}`),
    "",
    "## Open verification gates",
    "",
    "| Gate | Owner | Due | Blocks |",
    "| --- | --- | --- | --- |",
    ...brief.operations.gates.map(
      (gate) =>
        `| ${markdownEscape(gate.title)} | ${markdownEscape(gate.owner)} | ${markdownEscape(gate.due)} | ${markdownEscape(gate.blocks)} |`,
    ),
    "",
    "## Day-by-day field card",
    "",
    "| Day | Miles | Up / down | End | Field focus |",
    "| --- | ---: | ---: | --- | --- |",
    ...brief.daily.map(
      (day) =>
        `| ${day.day} | ${day.distanceMiles.toFixed(3)} | +${day.gainFeet.toLocaleString()} / −${day.lossFeet.toLocaleString()} ft | ${markdownEscape(day.endName)} | ${markdownEscape(day.detail)} |`,
    ),
    "",
    "## Day 3 supported traverse",
    "",
    `- **Exact PCTA boundary:** route mile ${brief.operations.dayThreeSupport.routeMile.toFixed(3)} / PCT mile ${brief.operations.dayThreeSupport.pctMile.toFixed(3)}` ,
    `- **Field pickup pin offset:** ${brief.operations.dayThreeSupport.fieldToTrailOffsetFeet.toFixed(0)} ft from the trail boundary; it is not a campsite.`,
    `- **Target hiker window:** ${markdownEscape(brief.operations.dayThreeSupport.targetHikerWindow)}; driver ready ${markdownEscape(brief.operations.dayThreeSupport.driverReadyBy)}.`,
    `- **No-show rule:** ${markdownEscape(brief.operations.dayThreeSupport.noShowRule)}` ,
    "",
    "## Emergency coordination",
    "",
    brief.emergency.disclaimer,
    "",
    ...brief.emergency.actions.map((action, index) => `${index + 1}. **${markdownEscape(action.title)}** — ${markdownEscape(action.detail)}`),
    "",
    "### Contacts",
    "",
    "| Contact | Number | Use it for |",
    "| --- | --- | --- |",
    ...brief.emergency.contacts.map(
      (contact) =>
        `| ${markdownEscape(contact.title)} | ${markdownEscape(contact.value)} | ${markdownEscape(contact.when)} |`,
    ),
    "",
    "### Check-in protocol",
    "",
    ...brief.emergency.checkInProtocol.map(
      (item) => `- **${markdownEscape(item.title)}:** ${markdownEscape(item.detail)}`,
    ),
    "",
    "## Offline limits",
    "",
    ...brief.offlineLimitations.map((item) => `- ${markdownEscape(item)}`),
    "",
    "## Source links",
    "",
    ...brief.sourceIds.map((id) => `- ${sourceLinks([id])}`).filter((line) => line !== "- "),
    "",
  ];
  return lines.join("\n");
}

async function writeFile(pathname, content) {
  await fs.mkdir(path.dirname(pathname), { recursive: true });
  await fs.writeFile(pathname, content);
}

async function main() {
  const options = parseArgs();
  if (options.bootstrapTemplate) {
    try {
      await fs.access(TEMPLATE_PATH);
    } catch {
      await fs.mkdir(path.dirname(TEMPLATE_PATH), { recursive: true });
      await fs.copyFile(WEB_RUNTIME_PATH, TEMPLATE_PATH);
      console.log(`Bootstrapped immutable runtime template at ${path.relative(ROOT, TEMPLATE_PATH)}`);
    }
  }

  const [templateRaw, terrainRaw, operationsRaw, fieldBriefRaw] = await Promise.all([
    fs.readFile(TEMPLATE_PATH, "utf8"),
    fs.readFile(TERRAIN_PATH, "utf8"),
    fs.readFile(OPERATIONS_SOURCE_PATH, "utf8"),
    fs.readFile(FIELD_BRIEF_SOURCE_PATH, "utf8"),
  ]);
  const template = JSON.parse(templateRaw);
  const terrain = JSON.parse(terrainRaw);
  const operations = JSON.parse(operationsRaw);
  const fieldBrief = JSON.parse(fieldBriefRaw);
  const terrainHash = hash(terrainRaw);
  const runtime = buildRuntimeData(template, terrain, terrainHash);
  const runtimeOperations = buildRuntimeOperations(operations, terrain, terrainHash);
  const runtimeFieldBrief = buildRuntimeFieldBrief(
    fieldBrief,
    runtimeOperations,
    terrain,
    terrainHash,
  );
  const runtimeRaw = `${JSON.stringify(runtime, null, 2)}\n`;
  const factsRaw = `${JSON.stringify(buildWebTerrainFacts(terrain, terrainHash), null, 2)}\n`;
  const operationsRuntimeRaw = `${JSON.stringify(runtimeOperations, null, 2)}\n`;
  const operationsRuntimeModule = `// Generated by scripts/generate_trip_bundles.mjs. Do not hand-edit.\nexport default ${JSON.stringify(runtimeOperations, null, 2)} as const;\n`;
  const fieldBriefRuntimeRaw = `${JSON.stringify(runtimeFieldBrief, null, 2)}\n`;
  const fieldBriefMarkdown = renderFieldBriefMarkdown(runtimeFieldBrief);

  await Promise.all([
    writeFile(WEB_RUNTIME_PATH, runtimeRaw),
    writeFile(WEB_MIRROR_PATH, runtimeRaw),
    writeFile(IOS_RUNTIME_PATH, runtimeRaw),
    writeFile(WEB_TERRAIN_FACTS_PATH, factsRaw),
    writeFile(WEB_OPERATIONS_PATH, operationsRuntimeRaw),
    writeFile(IOS_OPERATIONS_PATH, operationsRuntimeRaw),
    writeFile(FLIGHT_STATUS_OPERATIONS_PATH, operationsRuntimeRaw),
    writeFile(FLIGHT_STATUS_OPERATIONS_MODULE_PATH, operationsRuntimeModule),
    writeFile(WEB_FIELD_BRIEF_PATH, fieldBriefRuntimeRaw),
    writeFile(WEB_FIELD_BRIEF_PUBLIC_PATH, fieldBriefRuntimeRaw),
    writeFile(WEB_FIELD_BRIEF_MARKDOWN_PATH, fieldBriefMarkdown),
    writeFile(IOS_FIELD_BRIEF_PATH, fieldBriefRuntimeRaw),
    writeFile(FIELD_BRIEF_MARKDOWN_PATH, fieldBriefMarkdown),
  ]);

  console.log("Generated identical web and iOS route bundles from canonical terrain.");
  console.table({
    "Runtime points": runtime.route.path.length,
    "Official PCTA miles": runtime.route.metadata.active_distance_miles,
    "Normalized gain ft": runtime.route.properties.total_gain_feet,
    "Normalized loss ft": runtime.route.properties.total_loss_feet,
    "Water sources remapped": runtime.waterSources.length,
    "Day boundaries": terrain.dayBoundaries.length,
    "Operational gates": runtimeOperations.gates.length,
    "Field brief days": runtimeFieldBrief.daily.length,
  });
}

main().catch((error) => {
  console.error(`Trip bundle generation failed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
