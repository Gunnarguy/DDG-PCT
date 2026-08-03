import "maplibre-gl/dist/maplibre-gl.css";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "./App.css";
import { LoginScreen } from "./components/AuthUI";
import ElevationProfile from "./components/ElevationProfile";
import Sidebar from "./components/Sidebar";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { connectivityZones } from "./data/connectivityData";
import {
  ddgTeam,
  nextStepsChecklist,
  packPlanner,
  permitChecklist,
  referenceLibrary,
  resupplyPlan,
} from "./data/planContent";
import { fetchLiveSatelliteCoverage } from "./services/liveSatelliteService";
import {
  fetchTrailConditions,
  mergeWaterSourcesWithLiveConditions,
} from "./services/trailConditionsService";
import {
  normalizeCoordinatePoint,
  normalizeFeaturePoint,
  normalizeTrailCoordinate,
} from "./utils/coordinates";
const TrailMap = React.lazy(() => import("./components/TrailMap"));

// Bump VITE_HIKE_DATA_VERSION whenever hike_data.json changes to invalidate cached copies.
const DATASET_VERSION =
  import.meta.env.VITE_HIKE_DATA_VERSION ?? "2026-07-29-coordinate-guard-v4";
const HIKEDATA_CACHE_KEY = "pct-hike-viz::hike-data";
const HIKEDATA_CACHE_META_KEY = `${HIKEDATA_CACHE_KEY}::meta`;
const USER_STORAGE_KEY = "pct-hike-viz::current-user";
const PROFILE_HEIGHT_STORAGE_KEY = "pct-hike-viz::profile-height-vh";
const FALLBACK_TIMEOUT_MS = 6500;

// Build URL to fetch hike data from public/data at runtime
const buildDataUrl = () => {
  const basePath = (import.meta.env.BASE_URL ?? "/").replace(/\/?$/, "/");
  return `${basePath}data/hike_data.json`;
};

// Basic helpers for derived stats so the UI always reflects the loaded dataset, not stale copy text.
const hasAnyCell = (zone = {}) => {
  const carriers = ["verizon", "att", "tmobile"];
  return carriers.some(
    (c) => zone.cellCoverage?.[c] && zone.cellCoverage[c] !== "none",
  );
};

const summarizeConnectivity = (zones = []) => {
  if (!zones.length) {
    return { blackoutMiles: 0, rangeMiles: 0 };
  }
  const sorted = [...zones]
    .filter((z) => Number.isFinite(z.mile))
    .sort((a, b) => a.mile - b.mile);
  if (!sorted.length) return { blackoutMiles: 0, rangeMiles: 0 };

  let blackout = 0;
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const segmentMiles = Math.max(0, next.mile - current.mile);
    const hasSignal = hasAnyCell(current) || hasAnyCell(next);
    if (!hasSignal) {
      blackout += segmentMiles;
    }
  }

  const rangeMiles = sorted[sorted.length - 1].mile - sorted[0].mile;
  return {
    blackoutMiles: Math.round(blackout),
    rangeMiles: Math.max(0, Math.round(rangeMiles)),
  };
};

const extractLatestReportDate = (waterSources = []) => {
  const regex = /(\d{2})\/(\d{2})\/(\d{2})/g;
  const dates = [];
  waterSources.forEach((source) => {
    if (!source.report) return;
    const matches = [...source.report.matchAll(regex)];
    matches.forEach((m) => {
      const [month, day, yearShort] = [
        parseInt(m[1], 10),
        parseInt(m[2], 10),
        parseInt(m[3], 10),
      ];
      if (!month || !day) return;
      const year = yearShort >= 70 ? 1900 + yearShort : 2000 + yearShort;
      const d = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(d.getTime())) {
        dates.push(d);
      }
    });
  });
  if (!dates.length) return null;
  dates.sort((a, b) => b.getTime() - a.getTime());
  return dates[0].toISOString().slice(0, 10);
};

const deriveWaterMeta = (waterSources = []) => {
  const miles = waterSources
    .map((s) => s.mile)
    .filter((m) => Number.isFinite(m));
  const minMile = miles.length ? Math.min(...miles).toFixed(1) : "—";
  const maxMile = miles.length ? Math.max(...miles).toFixed(1) : "—";
  const latest = extractLatestReportDate(waterSources);

  return {
    count: waterSources.length,
    sourceLabel: "Halfmile waypoint locations",
    mileRange: miles.length
      ? `Mile ${minMile} – ${maxMile}`
      : "Mile range pending",
    lastSynced: latest ?? "live flow not verified",
  };
};

const deriveRouteStats = (
  hikingTrail = [],
  routeSegments = [],
  waterSources = [],
  connectivityZones = [],
  routeProperties = {},
) => {
  const totalMiles = routeSegments.reduce(
    (sum, segment) => sum + (segment.distance || 0),
    0,
  );

  let totalGain = 0;
  let totalLoss = 0;
  let highPoint = { elevation: null };
  let lowPoint = { elevation: null };

  const smoothedElevations = hikingTrail.map((point, index) => {
    const start = Math.max(0, index - 2);
    const end = Math.min(hikingTrail.length, index + 3);
    const elevations = hikingTrail
      .slice(start, end)
      .map((candidate) => candidate?.[2])
      .filter(Number.isFinite);
    return elevations.length
      ? elevations.reduce((sum, elevation) => sum + elevation, 0) /
          elevations.length
      : null;
  });
  let lastCountedElevation = smoothedElevations.find(Number.isFinite) ?? null;

  for (let i = 0; i < hikingTrail.length; i += 1) {
    const curr = hikingTrail[i];
    const currElev = curr?.[2];
    if (!Number.isFinite(currElev)) continue;
    if (highPoint.elevation === null || currElev > highPoint.elevation) {
      highPoint = {
        elevation: Math.round(currElev),
        coordinates: [curr[0], curr[1]],
      };
    }
    if (lowPoint.elevation === null || currElev < lowPoint.elevation) {
      lowPoint = {
        elevation: Math.round(currElev),
        coordinates: [curr[0], curr[1]],
      };
    }

    const smoothedElevation = smoothedElevations[i];
    if (
      Number.isFinite(smoothedElevation) &&
      Number.isFinite(lastCountedElevation)
    ) {
      const delta = smoothedElevation - lastCountedElevation;
      if (Math.abs(delta) >= 10) {
        if (delta > 0) totalGain += delta;
        if (delta < 0) totalLoss += Math.abs(delta);
        lastCountedElevation = smoothedElevation;
      }
    }
  }

  const connectivitySummary = summarizeConnectivity(connectivityZones);
  const canonicalGain = Number(routeProperties?.total_gain_feet);
  const canonicalLoss = Number(routeProperties?.total_loss_feet);
  const canonicalHigh = Number(routeProperties?.max_elevation);
  const canonicalLow = Number(routeProperties?.min_elevation);

  return {
    totalMiles: Number.isFinite(totalMiles) ? Number(totalMiles.toFixed(1)) : 0,
    totalGain: Number.isFinite(canonicalGain) ? canonicalGain : Math.round(totalGain),
    totalLoss: Number.isFinite(canonicalLoss) ? canonicalLoss : Math.round(totalLoss),
    highPoint: Number.isFinite(canonicalHigh)
      ? { ...highPoint, elevation: canonicalHigh }
      : highPoint,
    lowPoint: Number.isFinite(canonicalLow)
      ? { ...lowPoint, elevation: canonicalLow }
      : lowPoint,
    waterSourceCount: waterSources.length,
    connectivityBlackoutMiles: connectivitySummary.blackoutMiles,
    connectivityRangeMiles: connectivitySummary.rangeMiles,
    basePlanMiles: Number.isFinite(totalMiles)
      ? Number(totalMiles.toFixed(1))
      : 0,
  };
};

const getLocalStorage = () => {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch (error) {
    console.warn("LocalStorage unavailable, skipping hike data cache.", error);
    return null;
  }
};

// Read cached hike data from localStorage if valid
const readCachedHikeData = () => {
  const storage = getLocalStorage();
  if (!storage) return null;
  try {
    const metaRaw = storage.getItem(HIKEDATA_CACHE_META_KEY);
    if (!metaRaw) return null;
    const meta = JSON.parse(metaRaw);
    if (meta.version !== DATASET_VERSION) return null;
    const dataRaw = storage.getItem(HIKEDATA_CACHE_KEY);
    if (!dataRaw) return null;
    return { data: JSON.parse(dataRaw), meta };
  } catch (error) {
    console.warn("Failed to hydrate hike data cache, ignoring.", error);
    return null;
  }
};

const mapStyles = {
  topo: {
    label: "OSM Liberty Topo",
    url: "https://raw.githubusercontent.com/nst-guide/osm-liberty-topo/gh-pages/style.json",
  },
  hybrid: {
    label: "Liberty + NAIP (Hybrid)",
    url: "https://raw.githubusercontent.com/nst-guide/osm-liberty-topo/gh-pages/style-hybrid.json",
  },
  aerial: {
    label: "Liberty Aerial",
    url: "https://raw.githubusercontent.com/nst-guide/osm-liberty-topo/gh-pages/style-aerial.json",
  },
  fstopo: {
    label: "Liberty + USFS Topo",
    url: "https://raw.githubusercontent.com/nst-guide/osm-liberty-topo/gh-pages/style-fstopo.json",
  },
};

function MapLoadingFallback() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing mission control...");

  useEffect(() => {
    const stages = [
      { pct: 10, msg: "Loading map engine..." },
      { pct: 30, msg: "Parsing GPS tracks..." },
      { pct: 50, msg: "Hydrating camp waypoints..." },
      { pct: 70, msg: "Calculating elevation profiles..." },
      { pct: 90, msg: "Rendering 3D terrain..." },
      { pct: 99, msg: "Finalizing display..." },
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 99) return 99;
        // Accelerate early, slow down late
        const increment = Math.max(1, Math.floor((100 - prev) / 10));
        const next = prev + increment;

        // Update status text based on thresholds
        if (currentStage < stages.length && next >= stages[currentStage].pct) {
          setStatus(stages[currentStage].msg);
          currentStage++;
        }
        return next;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="map-panel">
      <div className="loading-screen">
        <div className="loading-bar-container">
          <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="loading-status">{status}</p>
        <p className="loading-percent">{progress}%</p>
      </div>
    </div>
  );
}

function App() {
  const [popupInfo, setPopupInfo] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState("topo");
  const { syncStatus, teamRoster } = useAuth();
  const [activeTab, setActiveTab] = useState("mission");
  // Fetch hike data from public/data at runtime
  const [hikeData, setHikeData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState("Loading hike data...");
  const [currentUserId, setCurrentUserId] = useState(() => {
    const storage = getLocalStorage();
    const stored = storage?.getItem(USER_STORAGE_KEY);
    return stored || ddgTeam?.[2]?.id || "gunnar";
  });

  const [theme, setTheme] = useState(() => {
    const storage = getLocalStorage();
    return (storage && storage.getItem("theme")) || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      const storage = getLocalStorage();
      if (storage) {
        storage.setItem("theme", next);
      }
      return next;
    });
  };

  const [liveSatelliteData, setLiveSatelliteData] = useState(null);
  const [liveSatelliteStatus, setLiveSatelliteStatus] = useState("idle");
  const [liveSatelliteError, setLiveSatelliteError] = useState(null);
  const [trailConditions, setTrailConditions] = useState(null);
  const [trailConditionsLoading, setTrailConditionsLoading] = useState(true);
  const [trailConditionsError, setTrailConditionsError] = useState(null);
  const [profileHoverPoint, setProfileHoverPoint] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(28); // percent of app width
  const [isDragging, setIsDragging] = useState(false);
  const [profileHeight, setProfileHeight] = useState(() => {
    const storedHeight = Number(getLocalStorage()?.getItem(PROFILE_HEIGHT_STORAGE_KEY));
    return Number.isFinite(storedHeight) ? Math.max(26, Math.min(65, storedHeight)) : 42;
  });
  const [isProfileDragging, setIsProfileDragging] = useState(false);
  const [computedStats, setComputedStats] = useState(null);

  // Fetch hike data on mount (from cache or network)
  useEffect(() => {
    const loadHikeData = async () => {
      // Try cache first
      const cached = readCachedHikeData();
      if (cached) {
        setHikeData(cached.data);
        setIsLoading(false);
        setLoadingMessage("");
        return;
      }

      // Fetch from public/data
      try {
        setLoadingMessage("Fetching trail data...");
        const url = buildDataUrl();
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch hike data: ${response.status}`);
        }
        const data = await response.json();

        // Cache for next time
        const storage = getLocalStorage();
        if (storage) {
          try {
            storage.setItem(HIKEDATA_CACHE_KEY, JSON.stringify(data));
            storage.setItem(
              HIKEDATA_CACHE_META_KEY,
              JSON.stringify({
                version: DATASET_VERSION,
                fetchedAt: new Date().toISOString(),
              }),
            );
          } catch (e) {
            console.warn("Failed to cache hike data:", e);
          }
        }

        setHikeData(data);
        setIsLoading(false);
        setLoadingMessage("");
      } catch (error) {
        console.error("Failed to load hike data:", error);
        setLoadingError(error.message);
        setIsLoading(false);
      }
    };

    loadHikeData();
  }, []);

  const loadTrailConditions = useCallback(async ({ force = false } = {}) => {
    setTrailConditionsLoading(true);
    setTrailConditionsError(null);
    try {
      setTrailConditions(await fetchTrailConditions({ force }));
    } catch (error) {
      console.error("Failed to load shared trail conditions:", error);
      setTrailConditionsError(error.message);
    } finally {
      setTrailConditionsLoading(false);
    }
  }, []);

  // One shared condition snapshot drives the field panel, map, and elevation
  // chart. Do not let each component independently fetch a different answer.
  useEffect(() => {
    void loadTrailConditions();
    const interval = window.setInterval(
      () => void loadTrailConditions(),
      4 * 60 * 60 * 1000,
    );
    return () => window.clearInterval(interval);
  }, [loadTrailConditions]);

  // Handle sidebar resizing
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newWidth =
        ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
      const clampedWidth = Math.max(20, Math.min(50, newWidth)); // 20%-50%
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleProfileResizeStart = useCallback((event) => {
    event.preventDefault();
    setIsProfileDragging(true);
  }, []);

  const handleProfileResizeKeyDown = useCallback((event) => {
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") {
      setProfileHeight(26);
    } else if (event.key === "End") {
      setProfileHeight(65);
    } else {
      setProfileHeight((height) =>
        Math.max(26, Math.min(65, height + (event.key === "ArrowUp" ? 2 : -2))),
      );
    }
  }, []);

  useEffect(() => {
    if (!isProfileDragging) return;

    const handlePointerMove = (event) => {
      const requestedHeight =
        ((window.innerHeight - event.clientY) / window.innerHeight) * 100;
      setProfileHeight(Math.max(26, Math.min(65, requestedHeight)));
    };
    const handlePointerUp = () => setIsProfileDragging(false);

    document.body.classList.add("is-resizing-profile");
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.classList.remove("is-resizing-profile");
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isProfileDragging]);

  useEffect(() => {
    getLocalStorage()?.setItem(PROFILE_HEIGHT_STORAGE_KEY, String(profileHeight));
  }, [profileHeight]);

  useEffect(() => {
    const storage = getLocalStorage();
    if (storage && currentUserId) {
      storage.setItem(USER_STORAGE_KEY, currentUserId);
    }
  }, [currentUserId]);

  // Note: localStorage caching is lightweight (metadata + JSON); keep dataset version bumped to invalidate stale caches.

  useEffect(() => {
    let isMounted = true;
    let refreshTimerId;
    let activeController;

    const loadLiveData = async (mode = "initial") => {
      if (!isMounted) {
        return;
      }

      if (activeController) {
        activeController.abort();
      }

      const controller = new AbortController();
      activeController = controller;

      setLiveSatelliteStatus((prev) => {
        if (mode === "refresh" && prev === "success") {
          return "refreshing";
        }
        return "loading";
      });
      setLiveSatelliteError(null);

      try {
        const liveData = await fetchLiveSatelliteCoverage(controller.signal);
        if (!isMounted) {
          return;
        }
        setLiveSatelliteData(liveData);
        setLiveSatelliteStatus("success");
      } catch (error) {
        if (!isMounted || error.name === "AbortError") {
          return;
        }
        setLiveSatelliteError(error);
        setLiveSatelliteStatus("error");
      }
    };

    loadLiveData();
    refreshTimerId = setInterval(() => loadLiveData("refresh"), 1000 * 60 * 30);

    return () => {
      isMounted = false;
      if (activeController) {
        activeController.abort();
      }
      if (refreshTimerId) {
        clearInterval(refreshTimerId);
      }
    };
  }, []);

  const campPoints = useMemo(() => {
    if (!hikeData) return [];
    return [...hikeData.features]
      .filter((feature) => feature.properties.day >= 0)
      .map(normalizeFeaturePoint)
      .filter(Boolean)
      .sort((a, b) => a.properties.day - b.properties.day);
  }, [hikeData]);

  const hikingTrail = useMemo(() => {
    if (!hikeData) return [];
    const rawPath =
      hikeData.route?.path ?? hikeData.route?.geometry?.coordinates ?? [];
    // Filter out any malformed points to keep elevation profile rendering
    const filtered = rawPath.map(normalizeTrailCoordinate).filter(Boolean);
    return filtered;
  }, [hikeData]);

  const routeSegments = useMemo(() => {
    if (!hikeData) return [];

    if (hikeData.route?.properties?.segments) {
      return hikeData.route.properties.segments;
    }

    const fallbackSegments = [];
    for (let i = 1; i < campPoints.length; i += 1) {
      const previous = campPoints[i - 1];
      const current = campPoints[i];

      fallbackSegments.push({
        day: current.properties.day,
        distance: current.properties.distance ?? 0,
        start: previous.properties.name,
        end: current.properties.name,
        focus: current.properties.segment ?? "On-trail push",
        gain: current.properties.gain ?? "n/a",
        loss: current.properties.loss ?? "n/a",
      });
    }

    return fallbackSegments;
  }, [hikeData, campPoints]);

  const totalMiles = useMemo(
    () =>
      routeSegments.reduce((sum, segment) => sum + (segment.distance || 0), 0),
    [routeSegments],
  );

  const driveSegments = useMemo(
    () =>
      (hikeData?.driveSegments ?? [])
        .map((segment) => ({
          ...segment,
          path: (segment.path ?? [])
            .map((coordinates) => {
              const point = normalizeCoordinatePoint({ coordinates });
              return point?.coordinates ?? null;
            })
            .filter(Boolean),
        }))
        .filter((segment) => segment.path.length > 1),
    [hikeData],
  );

  const townPins = useMemo(
    () => (hikeData?.towns ?? []).map(normalizeCoordinatePoint).filter(Boolean),
    [hikeData],
  );
  const transportPoints = useMemo(
    () => {
      const legacyLogistics = (hikeData?.features ?? [])
        .filter((feature) => feature.properties?.day === -1)
        .map(normalizeFeaturePoint)
        .filter(Boolean)
        .map((feature) => ({
          name: feature.properties?.name,
          type: feature.properties?.type,
          notes: feature.properties?.notes,
          coordinates: feature.geometry.coordinates,
        }));
      const dedicatedTransport = (hikeData?.transport ?? [])
        .map(normalizeCoordinatePoint)
        .filter(Boolean);
      const uniqueByName = new Map();
      [...legacyLogistics, ...dedicatedTransport].forEach((point) => {
        uniqueByName.set(point.name, point);
      });
      return [...uniqueByName.values()];
    },
    [hikeData],
  );
  const staticWaterSources = useMemo(() => {
    const rawWater = hikeData?.waterSources ?? [];
    return rawWater.map(normalizeCoordinatePoint).filter(Boolean);
  }, [hikeData]);
  const waterSources = useMemo(
    () => mergeWaterSourcesWithLiveConditions(staticWaterSources, trailConditions),
    [staticWaterSources, trailConditions],
  );
  const waterSourceMeta = useMemo(
    () => deriveWaterMeta(waterSources),
    [waterSources],
  );

  useEffect(() => {
    if (!hikingTrail.length && !routeSegments.length) return;
    const stats = deriveRouteStats(
      hikingTrail,
      routeSegments,
      waterSources,
      connectivityZones,
      hikeData?.route?.properties,
    );
    setComputedStats(stats);
  }, [hikingTrail, routeSegments, waterSources, hikeData]);

  const handleSelectPoint = (day) => {
    const target = campPoints.find((feature) => feature.properties.day === day);
    if (target) {
      setPopupInfo(target);
    }
  };

  const handleProfileHover = useCallback((pointMeta) => {
    setProfileHoverPoint(pointMeta);
  }, []);

  if (isLoading) {
    return (
      <div className="app-shell">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>{loadingMessage}</p>
          <p className="note">
            If this takes more than 6 seconds, check network and refresh.
          </p>
        </div>
      </div>
    );
  }

  if (!hikeData) {
    return (
      <div className="app-shell">
        <div className="loading-screen">
          <p>Failed to load trail data. Please refresh the page.</p>
          {loadingError && <p className="note">{loadingError.message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div
      className="app-shell"
      style={{ "--sidebar-width": `${sidebarWidth}%` }}
    >
      <div
        className="map-column"
        style={{ "--profile-height": `${profileHeight}vh` }}
      >
        <div className="map-panel">
          <Suspense fallback={<MapLoadingFallback />}>
            <TrailMap
              mapStyles={mapStyles}
              selectedStyle={selectedStyle}
              onStyleChange={setSelectedStyle}
              totalMiles={totalMiles}
              basePlanMiles={computedStats?.basePlanMiles ?? totalMiles}
              hikingTrail={hikingTrail}
              driveSegments={driveSegments}
              campPoints={campPoints}
              townPins={townPins}
              transportPoints={transportPoints}
              waterSources={waterSources}
              connectivityZones={connectivityZones}
              popupInfo={popupInfo}
              setPopupInfo={setPopupInfo}
              hoverHighlight={profileHoverPoint}
              activeTab={activeTab}
            />
          </Suspense>
        </div>

        <div
          className={`profile-resize-handle ${isProfileDragging ? "dragging" : ""}`}
          onPointerDown={handleProfileResizeStart}
          onKeyDown={handleProfileResizeKeyDown}
          role="separator"
          tabIndex="0"
          aria-label="Resize map and elevation profile"
          aria-orientation="horizontal"
          aria-valuemin="26"
          aria-valuemax="65"
          aria-valuenow={Math.round(profileHeight)}
        />

        <ElevationProfile
          hikingTrail={hikingTrail}
          campPoints={campPoints}
          townPins={townPins}
          transportPoints={transportPoints}
          waterSources={waterSources}
          connectivityZones={connectivityZones}
          onHover={handleProfileHover}
        />
      </div>

      <div
        className={`resize-handle ${isDragging ? "dragging" : ""}`}
        onMouseDown={handleResizeStart}
        aria-label="Resize sidebar"
      />

      <Sidebar
        syncStatus={syncStatus}
        teamRoster={teamRoster}
        hikingTrail={hikingTrail}
        campPoints={campPoints}
        waterSources={waterSources}
        waterSourceMeta={waterSourceMeta}
        resupplyPlan={resupplyPlan}
        permitChecklist={permitChecklist}
        referenceLibrary={referenceLibrary}
        packPlanner={packPlanner}
        nextStepsChecklist={nextStepsChecklist}
        liveSatelliteData={liveSatelliteData}
        liveSatelliteStatus={liveSatelliteStatus}
        liveSatelliteError={liveSatelliteError}
        trailConditions={trailConditions}
        trailConditionsLoading={trailConditionsLoading}
        trailConditionsError={trailConditionsError}
        onRefreshTrailConditions={() => loadTrailConditions({ force: true })}
        computedStats={computedStats}
        onSelectPoint={handleSelectPoint}
        setPopupInfo={setPopupInfo}
        currentUserId={currentUserId}
        onUserChange={setCurrentUserId}
        theme={theme}
        onToggleTheme={toggleTheme}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}

/**
 * Auth-gated wrapper - shows login screen if not authenticated,
 * access denied if not a DDG team member
 */
function AuthGatedApp() {
  const {
    authUnavailable,
    isAuthenticated,
    isTeamMember,
    loading,
    user,
    signOut,
    authorizationError,
    refreshProfile,
  } = useAuth();

  if (authUnavailable && !isAuthenticated) {
    // Silently fallback to offline mode instead of showing a red error banner
    return <App />;
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (authorizationError) {
    return (
      <div className="app-shell">
        <div className="access-denied-screen">
          <h1>🏔️ DDG Mission Control</h1>
          <div className="access-denied-card">
            <span className="access-icon">⚠️</span>
            <h2>Couldn&apos;t Verify Team Access</h2>
            <p>
              Signed in as <strong>{user?.email}</strong>
            </p>
            <p className="access-message">
              Your sign-in succeeded, but the team profile check failed.
              <br />
              This is not an access denial.
            </p>
            <button onClick={refreshProfile} className="sign-out-btn">
              Try Profile Check Again
            </button>
            <button onClick={signOut} className="sign-out-btn">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated but NOT a team member - show access pending screen
  if (!isTeamMember) {
    return (
      <div className="app-shell">
        <div className="access-denied-screen">
          <h1>🏔️ DDG Mission Control</h1>
          <div className="access-denied-card">
            <span className="access-icon">⏳</span>
            <h2>Access Pending</h2>
            <p>
              Signed in as <strong>{user?.email}</strong>
            </p>
            <p className="access-message">
              This mission control is for Dan, Drew, and Gunnar only.
              <br />
              Your access request has been logged. Gunnar will review it.
            </p>
            <button onClick={signOut} className="sign-out-btn">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <App />;
}

/**
 * Root component with AuthProvider wrapper
 */
function Root() {
  return (
    <AuthProvider>
      <AuthGatedApp />
    </AuthProvider>
  );
}

export default Root;
