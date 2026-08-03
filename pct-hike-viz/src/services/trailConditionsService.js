import { EDGE_FUNCTIONS, getSession, supabase } from "../lib/supabase";
import { fetchAirQuality, fetchWildfires } from "./wildfireService";

// This has to match the canonical terrain bundle and Edge Function payload.
// Conditions may change daily; the route they are attached to must not silently
// fall back to an older Garmin-derived itinerary.
export const CURRENT_TERRAIN_PLAN_VERSION = "2026-08-02-pcta-usgs-v1";
export const CURRENT_TERRAIN_CONTRACT_SHA256 =
  "185e86a3863c0b2f335eaa51ad6a8220916f9fd25bbeaa30782ddc278e67b66c";
const CACHE_KEY = "ddg-pct::trail-conditions::terrain-v2";
const CACHE_MS = 4 * 60 * 60 * 1000;

const readLocalCache = () => {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (!value?.fetchedAt) return null;
    return value;
  } catch {
    return null;
  }
};

const writeLocalCache = (value) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // Private browsing/storage denial must not break safety data.
  }
};

const isCurrentTerrainSnapshot = (snapshot) =>
  snapshot?.planVersion === CURRENT_TERRAIN_PLAN_VERSION &&
  snapshot?.routeFacts?.terrainContractVersion === CURRENT_TERRAIN_PLAN_VERSION &&
  snapshot?.routeFacts?.dataContractSha256 === CURRENT_TERRAIN_CONTRACT_SHA256;

const waterMatchKey = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const waypointMatches = (left, right) => {
  const leftKey = waterMatchKey(left);
  const rightKey = waterMatchKey(right);
  return Boolean(
    leftKey &&
      rightKey &&
      (leftKey === rightKey ||
        leftKey.includes(rightKey) ||
        rightKey.includes(leftKey)),
  );
};

const closestByMile = (source, liveSources) => {
  const sourceMile = Number(source?.pctMile ?? source?.mile);
  if (!Number.isFinite(sourceMile)) return null;

  return liveSources
    .map((candidate) => ({
      candidate,
      difference: Math.abs(Number(candidate?.mile) - sourceMile),
    }))
    .filter(({ difference }) => Number.isFinite(difference) && difference <= 0.16)
    .sort((a, b) => a.difference - b.difference)[0]?.candidate ?? null;
};

/**
 * Merges a timestamped PCT Water Report observation into a static route marker.
 * The marker remains at the canonical field coordinate; only its condition data
 * is live. Waypoint IDs are preferred, then the report's rounded PCT mile, then
 * a conservative normalized-name match.
 */
export const mergeWaterSourcesWithLiveConditions = (
  staticSources = [],
  snapshot = null,
) => {
  if (!isCurrentTerrainSnapshot(snapshot)) return staticSources;

  const liveSources = snapshot?.water?.sources ?? [];
  if (!Array.isArray(liveSources) || liveSources.length === 0) {
    return staticSources;
  }

  return staticSources.map((source) => {
    const waypointMatch = liveSources.find((candidate) =>
      waypointMatches(source.waypoint, candidate.waypoint),
    );
    const mileMatch = waypointMatch ? null : closestByMile(source, liveSources);
    const sourceName = waterMatchKey(source.name);
    const nameMatch = waypointMatch || mileMatch
      ? null
      : liveSources.find((candidate) => {
          const candidateName = waterMatchKey(candidate.name);
          return (
            sourceName.length >= 5 &&
            candidateName.length >= 5 &&
            (candidateName.includes(sourceName) || sourceName.includes(candidateName))
          );
        });
    const live = waypointMatch ?? mileMatch ?? nameMatch;

    if (!live) {
      return {
        ...source,
        currentStatus: source.reportStatus ?? "Current condition not verified",
        conditionOrigin: "static-location-only",
      };
    }

    const matchedBy = waypointMatch
      ? "waypoint"
      : mileMatch
        ? "PCT mile"
        : "name";
    const status = [live.condition, live.freshness].filter(Boolean).join(" · ");

    return {
      ...source,
      condition: live.condition ?? "unknown",
      currentStatus: status || "Current condition not verified",
      latestReport: live.latestReport ?? null,
      report: live.report || live.latestReport || source.report,
      reportDate: live.reportDate ?? null,
      observedAt: live.observedAt ?? null,
      reportDateSource: live.reportDateSource ?? null,
      metadataDate: live.metadataDate ?? null,
      dateConflict: Boolean(live.dateConflict),
      ageDays: Number.isFinite(live.ageDays) ? live.ageDays : null,
      freshness: live.freshness ?? "unknown",
      reportedBy: live.reportedBy ?? null,
      liveWater: live,
      liveMatchMethod: matchedBy,
      liveSnapshotFetchedAt: snapshot.fetchedAt ?? null,
      liveWaterSourceUrl: snapshot?.water?.sourceUrl ?? null,
      conditionOrigin: "daily-supabase-snapshot",
    };
  });
};

const latestDatabaseSnapshot = async () => {
  const { data, error } = await supabase
    .from("trail_condition_snapshots")
    .select("payload, source_status, fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  const snapshot = {
    ...data.payload,
    fetchedAt: data.fetched_at,
    sourceStatus: data.source_status,
    cached: true,
  };
  return isCurrentTerrainSnapshot(snapshot) ? snapshot : null;
};

export const fetchTrailConditions = async ({ force = false } = {}) => {
  const local = readLocalCache();
  if (
    !force &&
    local &&
    isCurrentTerrainSnapshot(local) &&
    Date.now() - new Date(local.fetchedAt).getTime() < CACHE_MS
  ) {
    return local;
  }

  const session = await getSession();
  if (session && EDGE_FUNCTIONS.trailConditions) {
    try {
      const response = await fetch(EDGE_FUNCTIONS.trailConditions, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ force }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.error || `Trail conditions returned ${response.status}`);
      }
      const snapshot = await response.json();
      if (!isCurrentTerrainSnapshot(snapshot)) {
        throw new Error(
          "Trail conditions are attached to an outdated route contract; refresh is required.",
        );
      }
      writeLocalCache(snapshot);
      return snapshot;
    } catch (error) {
      console.warn("Live trail-condition refresh failed:", error);
    }
  }

  const database = await latestDatabaseSnapshot();
  if (database) {
    writeLocalCache(database);
    return database;
  }
  if (local && isCurrentTerrainSnapshot(local)) return local;

  const [wildfire, airQuality] = await Promise.all([
    fetchWildfires(),
    fetchAirQuality(),
  ]);
  return {
    fetchedAt: new Date().toISOString(),
    origin: "browser-emergency-fallback",
    wildfire,
    airQuality,
    water: { count: 0, sources: [], updatedText: null },
    agencyAlerts: [],
    sourceStatus: {
      backend: {
        status: "error",
        detail: "Daily condition snapshot is unavailable; showing fire/smoke fallback only.",
      },
    },
  };
};
