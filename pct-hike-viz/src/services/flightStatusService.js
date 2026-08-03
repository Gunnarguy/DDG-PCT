import { EDGE_FUNCTIONS, getSession } from "../lib/supabase";

const CACHE_KEY = "ddg-pct::flight-watch::v1";

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
  } catch {
    return null;
  }
};

const writeCache = (value) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    // Private storage denial must never hide the official status links.
  }
};

const manualSnapshot = (tracking, detail) => ({
  checkedAt: new Date().toISOString(),
  provider: {
    id: "manual-official-status",
    state: "manual-official-check",
    detail,
    officialStatusUrl: tracking?.officialStatusUrl,
    dataBoundary: tracking?.dataBoundary,
  },
  refreshAfterSeconds: 21_600,
  flights: (tracking?.flights ?? []).map((flight) => ({
    ...flight,
    status: "scheduled",
    live: false,
  })),
});

const validCachedSnapshot = (snapshot) => {
  if (!snapshot?.checkedAt || !Number.isFinite(snapshot?.refreshAfterSeconds)) {
    return false;
  }
  const ageMilliseconds = Date.now() - new Date(snapshot.checkedAt).getTime();
  return ageMilliseconds >= 0 && ageMilliseconds < snapshot.refreshAfterSeconds * 1000;
};

/**
 * The edge function deliberately returns an explicit provider state when no
 * AeroAPI key is configured or the itinerary is outside its 48-hour live
 * window. That is a useful result, not a reason to paint an invented status.
 */
export const fetchFlightStatus = async ({ tracking, force = false } = {}) => {
  const cached = readCache();
  if (!force && validCachedSnapshot(cached)) return cached;

  const session = await getSession();
  if (!session || !EDGE_FUNCTIONS.flightStatus) {
    const fallback = manualSnapshot(
      tracking,
      "Sign in to refresh the protected team flight watch. United Flight Status remains available below.",
    );
    writeCache(fallback);
    return fallback;
  }

  try {
    const response = await fetch(EDGE_FUNCTIONS.flightStatus, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) {
      throw new Error(payload?.error || `Flight Watch returned ${response.status}`);
    }
    writeCache(payload);
    return payload;
  } catch (error) {
    const fallback = manualSnapshot(
      tracking,
      error instanceof Error
        ? `${error.message}. Open United Flight Status for the authoritative check.`
        : "Flight Watch could not refresh. Open United Flight Status for the authoritative check.",
    );
    writeCache(fallback);
    return fallback;
  }
};

export const formatFlightTimestamp = (value) => {
  if (!value) return null;
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(instant);
};
