import React, { Suspense, useMemo, useState, useEffect, useCallback } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';

import Sidebar from './components/Sidebar';
const TrailMap = React.lazy(() => import('./components/TrailMap'));
import ElevationProfile from './components/ElevationProfile';
import {
  scheduleOptions,
  travelPlan,
  resupplyPlan,
  permitChecklist,
  referenceLibrary,
  prepGuideMeta,
  gearBlueprint,
  packPlanner,
  riskPlaybook,
  nextStepsChecklist
} from './data/planContent';
import { connectivityZones } from './data/connectivityData';
import { fetchLiveSatelliteCoverage } from './services/liveSatelliteService';
import './App.css';
// Direct import for instant loading (Vite bundles this at build time)
import hikeDataBundle from './hike_data.json';

// Bump VITE_HIKE_DATA_VERSION whenever hike_data.json changes to invalidate cached copies.
const DATASET_VERSION = import.meta.env.VITE_HIKE_DATA_VERSION ?? '2025-11-23-connectivity';
const HIKEDATA_CACHE_KEY = 'pct-hike-viz::hike-data';
const HIKEDATA_CACHE_META_KEY = `${HIKEDATA_CACHE_KEY}::meta`;
const FALLBACK_TIMEOUT_MS = 6500;

// NOTE: Kept for potential future remote-fetch mode
const _buildDataUrl = () => {
  const basePath = (import.meta.env.BASE_URL ?? '/').replace(/\/?$/, '/');
  return `${basePath}data/hike_data.json`;
};
void _buildDataUrl; // suppress unused warning

const getLocalStorage = () => {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch (error) {
    console.warn('LocalStorage unavailable, skipping hike data cache.', error);
    return null;
  }
};

// NOTE: Kept for potential future remote-fetch mode
const _readCachedHikeData = () => {
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
    console.warn('Failed to hydrate hike data cache, ignoring.', error);
    return null;
  }
};
void _readCachedHikeData; // suppress unused warning

const persistCachedHikeData = (payload) => {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(HIKEDATA_CACHE_KEY, JSON.stringify(payload));
    storage.setItem(HIKEDATA_CACHE_META_KEY, JSON.stringify({
      version: DATASET_VERSION,
      cachedAt: Date.now()
    }));
  } catch (error) {
    console.warn('Unable to persist hike data cache.', error);
  }
};

const mapStyles = {
  topo: {
    label: 'OSM Liberty Topo',
    url: 'https://raw.githubusercontent.com/nst-guide/osm-liberty-topo/gh-pages/style.json'
  },
  hybrid: {
    label: 'Liberty + NAIP (Hybrid)',
    url: 'https://raw.githubusercontent.com/nst-guide/osm-liberty-topo/gh-pages/style-hybrid.json'
  },
  aerial: {
    label: 'Liberty Aerial',
    url: 'https://raw.githubusercontent.com/nst-guide/osm-liberty-topo/gh-pages/style-aerial.json'
  },
  fstopo: {
    label: 'Liberty + USFS Topo',
    url: 'https://raw.githubusercontent.com/nst-guide/osm-liberty-topo/gh-pages/style-fstopo.json'
  }
};

function MapLoadingFallback() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing mission control...');

  useEffect(() => {
    const stages = [
      { pct: 10, msg: 'Loading map engine...' },
      { pct: 30, msg: 'Parsing GPS tracks...' },
      { pct: 50, msg: 'Hydrating camp waypoints...' },
      { pct: 70, msg: 'Calculating elevation profiles...' },
      { pct: 90, msg: 'Rendering 3D terrain...' },
      { pct: 99, msg: 'Finalizing display...' }
    ];

    let currentStage = 0;
    const interval = setInterval(() => {
      setProgress(prev => {
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
  const [selectedStyle, setSelectedStyle] = useState('topo');
  // Initialize directly with bundled data for instant loading
  const [hikeData, _setHikeData] = useState(hikeDataBundle);
  const [isLoading, _setIsLoading] = useState(false);
  const [loadingError, _setLoadingError] = useState(null);
  const [loadingMessage, _setLoadingMessage] = useState('');
  void _setHikeData; void _setIsLoading; void _setLoadingError; void _setLoadingMessage;
  const [liveSatelliteData, setLiveSatelliteData] = useState(null);
  const [liveSatelliteStatus, setLiveSatelliteStatus] = useState('idle');
  const [liveSatelliteError, setLiveSatelliteError] = useState(null);
  const [profileHoverPoint, setProfileHoverPoint] = useState(null);
  const [sidebarWidth, setSidebarWidth] = useState(28); // percentage
  const [isDragging, setIsDragging] = useState(false);

  // Handle sidebar resizing
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
      const clampedWidth = Math.max(20, Math.min(50, newWidth)); // 20%-50%
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Note: localStorage caching disabled - 48k coords too large, blocks main thread


  useEffect(() => {
    let isMounted = true;
    let refreshTimerId;
    let activeController;

    const loadLiveData = async (mode = 'initial') => {
      if (!isMounted) {
        return;
      }

      if (activeController) {
        activeController.abort();
      }

      const controller = new AbortController();
      activeController = controller;

      setLiveSatelliteStatus((prev) => {
        if (mode === 'refresh' && prev === 'success') {
          return 'refreshing';
        }
        return 'loading';
      });
      setLiveSatelliteError(null);

      try {
        const liveData = await fetchLiveSatelliteCoverage(controller.signal);
        if (!isMounted) {
          return;
        }
        setLiveSatelliteData(liveData);
        setLiveSatelliteStatus('success');
      } catch (error) {
        if (!isMounted || error.name === 'AbortError') {
          return;
        }
        console.error('Failed to load live satellite coverage.', error);
        setLiveSatelliteError(error);
        setLiveSatelliteStatus('error');
      }
    };

    loadLiveData();
    refreshTimerId = setInterval(() => loadLiveData('refresh'), 1000 * 60 * 30);

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

  const campPoints = useMemo(
    () => {
      if (!hikeData) return [];
      return [...hikeData.features].filter((feature) => feature.properties.day >= 0)
        .sort((a, b) => a.properties.day - b.properties.day);
    },
    [hikeData]
  );

  const hikingTrail = useMemo(() => {
    if (!hikeData) return [];
    // Use the actual trail path from the data
    return hikeData.route?.path ?? hikeData.route?.geometry?.coordinates ?? [];
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
        focus: current.properties.segment ?? 'On-trail push',
        gain: current.properties.gain ?? 'n/a',
        loss: current.properties.loss ?? 'n/a'
      });
    }

    return fallbackSegments;
  }, [hikeData, campPoints]);

  const totalMiles = useMemo(
    () => routeSegments.reduce((sum, segment) => sum + (segment.distance || 0), 0),
    [routeSegments]
  );

  const driveSegments = useMemo(() => hikeData?.driveSegments ?? [], [hikeData]);

  const townPins = hikeData?.towns ?? [];
  const transportPoints = hikeData?.transport ?? [];
  const waterSources = hikeData?.waterSources ?? [];
  const waterSourceMeta = useMemo(() => ({
    count: waterSources.length,
    sourceLabel: 'PCT Water Report (pctwater.com)',
    mileRange: 'Mile 1420.7 – 1472.7',
    lastSynced: '2025-11-23'
  }), [waterSources.length]);

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
          <p className="note">If this takes more than 6 seconds, the offline backup auto-loads.</p>
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
    <div className="app-shell">
      <div 
        className="resize-handle"
        onMouseDown={handleResizeStart}
        style={{ right: `${sidebarWidth}vw` }}
        aria-label="Resize sidebar"
      />
      <div className="map-column">
        <Suspense fallback={<MapLoadingFallback />}>
          <TrailMap
            mapStyles={mapStyles}
            selectedStyle={selectedStyle}
            onStyleChange={setSelectedStyle}
            totalMiles={totalMiles}
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
          />
        </Suspense>

        <ElevationProfile
          hikingTrail={hikingTrail}
          campPoints={campPoints}
          onHover={handleProfileHover}
        />
      </div>

      <Sidebar
        style={{ width: `${sidebarWidth}vw` }}
        waterSources={waterSources}
        waterSourceMeta={waterSourceMeta}
        scheduleOptions={scheduleOptions}
        travelPlan={travelPlan}
        resupplyPlan={resupplyPlan}
        permitChecklist={permitChecklist}
        referenceLibrary={referenceLibrary}
        prepGuideMeta={prepGuideMeta}
        gearBlueprint={gearBlueprint}
        packPlanner={packPlanner}
        riskPlaybook={riskPlaybook}
        nextStepsChecklist={nextStepsChecklist}
        liveSatelliteData={liveSatelliteData}
        liveSatelliteStatus={liveSatelliteStatus}
        liveSatelliteError={liveSatelliteError}
        onSelectPoint={handleSelectPoint}
        setPopupInfo={setPopupInfo}
      />
    </div>
  );
}

export default App;
