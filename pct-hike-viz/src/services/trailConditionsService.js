import { EDGE_FUNCTIONS, getSession, supabase } from "../lib/supabase";
import { fetchAirQuality, fetchWildfires } from "./wildfireService";

const CACHE_KEY = "ddg-pct::trail-conditions";
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

const latestDatabaseSnapshot = async () => {
  const { data, error } = await supabase
    .from("trail_condition_snapshots")
    .select("payload, source_status, fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    ...data.payload,
    fetchedAt: data.fetched_at,
    sourceStatus: data.source_status,
    cached: true,
  };
};

export const fetchTrailConditions = async ({ force = false } = {}) => {
  const local = readLocalCache();
  if (
    !force &&
    local &&
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
  if (local) return local;

  const [wildfire, airQuality] = await Promise.all([
    fetchWildfires(),
    fetchAirQuality(),
  ]);
  return {
    fetchedAt: new Date().toISOString(),
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
