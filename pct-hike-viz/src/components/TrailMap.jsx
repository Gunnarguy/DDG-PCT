import PropTypes from "prop-types";
import { useEffect, useState, useMemo, useRef } from "react";
import Map, {
  FullscreenControl,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  Source,
  Layer,
} from "react-map-gl/maplibre";
import { normalizeCoordinatePair } from "../utils/coordinates";

const DAY_ROUTE_COLORS = [
  "#2E7D32",
  "#1565C0",
  "#F57C00",
  "#9C27B0",
  "#009688",
  "#D32F2F",
  "#5E35B1",
  "#00796B",
];
const DRIVE_IN_COLOR = "#007AFF";
const DRIVE_HOME_COLOR = "#009688";

const nearestTrailIndex = (trail, coordinates, minimumIndex = 0) => {
  const target = normalizeCoordinatePair(coordinates);
  if (!target || !trail.length) return null;

  let nearestIndex = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = minimumIndex; index < trail.length; index += 1) {
    const deltaLongitude = trail[index][0] - target[0];
    const deltaLatitude = trail[index][1] - target[1];
    const distance = deltaLongitude ** 2 + deltaLatitude ** 2;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }
  return nearestIndex;
};

const nearestTrailIndexByRouteMile = (trail, routeMile, minimumIndex = 0) => {
  const target = Number(routeMile);
  if (!Number.isFinite(target) || !trail.length) return null;

  let nearestIndex = null;
  let nearestDifference = Number.POSITIVE_INFINITY;
  for (let index = minimumIndex; index < trail.length; index += 1) {
    const candidate = Number(trail[index]?.[3]);
    if (!Number.isFinite(candidate)) continue;
    const difference = Math.abs(candidate - target);
    if (difference < nearestDifference) {
      nearestDifference = difference;
      nearestIndex = index;
    }
  }
  return nearestIndex;
};

const getTransportIcon = (type) => {
  switch (type) {
    case "airport":
      return "✈️";
    case "trailhead-parking":
      return "🅿️";
    case "shuttle-point":
      return "🚐";
    default:
      return "📍";
  }
};

const waterMarkerClass = (source) => {
  const condition = String(source?.condition ?? "unknown").toLowerCase();
  if (condition.includes("dry")) return "dry";
  if (condition.includes("limited")) return "limited";
  if (condition.includes("flowing")) return "flowing";
  return "unknown";
};

const formatWaterStatus = (source) => {
  const parts = [source?.condition, source?.freshness]
    .filter(Boolean)
    .map((part) => String(part).replaceAll("-", " "));
  return parts.length ? parts.join(" · ") : "Current condition not verified";
};

function TrailMap({
  mapStyles,
  selectedStyle,
  onStyleChange,
  totalMiles,
  basePlanMiles,
  hikingTrail,
  driveSegments,
  campPoints,
  townPins,
  transportPoints,
  waterSources,
  connectivityZones,
  popupInfo,
  setPopupInfo,
  hoverHighlight,
  activeTab,
}) {
  const mapRef = useRef(null);
  const popupCoordinates = normalizeCoordinatePair(
    popupInfo?.geometry?.coordinates ?? popupInfo?.coordinates,
  );
  const hoverCoordinates = normalizeCoordinatePair(hoverHighlight?.coordinates);
  const isWaterPopup = popupInfo?.type === "water" || Boolean(popupInfo?.liveWater);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    if (!map) return;

    if (activeTab === "mission" || activeTab === "itinerary") {
      map.flyTo({ center: [-121.95, 40.95], zoom: 8, duration: 1500 });
    } else if (activeTab === "safety") {
      map.flyTo({ center: [-122.2, 41.0], zoom: 7.5, duration: 1500 });
    } else if (activeTab === "connectivity") {
      map.flyTo({ center: [-121.5, 40.8], zoom: 9, duration: 1500 });
    } else if (activeTab === "logistics") {
      map.flyTo({ center: [-122.3, 41.15], zoom: 9.5, duration: 1500 });
    }
  }, [activeTab]);

  // Strip elevation (3rd coordinate) so Deck.gl doesn't render the trail floating in 3D space
  const flatTrail = useMemo(() => {
    if (!hikingTrail?.length) return [];
    return hikingTrail.map((coord) => [coord[0], coord[1]]);
  }, [hikingTrail]);

  const hikingRouteGeoJSON = useMemo(() => {
    const stops = [...(campPoints ?? [])]
      .filter((camp) => Number.isFinite(camp.properties?.day))
      .sort((a, b) => a.properties.day - b.properties.day);
    const features = [];
    let previousIndex = 0;

    for (let index = 1; index < stops.length; index += 1) {
      const day = stops[index].properties.day;
      if (day < 1 || day > DAY_ROUTE_COLORS.length) continue;
      const routeMile = Number(stops[index].properties?.routeMile);
      const endIndex = Number.isFinite(routeMile)
        ? nearestTrailIndexByRouteMile(hikingTrail, routeMile, previousIndex)
        : nearestTrailIndex(
            flatTrail,
            stops[index].properties?.trailCoordinates ??
              stops[index].geometry?.coordinates,
            previousIndex,
          );
      if (endIndex === null || endIndex <= previousIndex) continue;
      features.push({
        type: "Feature",
        properties: { day },
        geometry: {
          type: "LineString",
          coordinates: flatTrail.slice(previousIndex, endIndex + 1),
        },
      });
      previousIndex = endIndex;
    }

    if (previousIndex < flatTrail.length - 1 && features.length) {
      features[features.length - 1].geometry.coordinates.push(
        ...flatTrail.slice(previousIndex + 1),
      );
    }

    return {
      type: "FeatureCollection",
      features: features.length
        ? features
        : [{
          type: "Feature",
          properties: { day: 1 },
          geometry: { type: "LineString", coordinates: flatTrail },
        }],
    };
  }, [campPoints, flatTrail, hikingTrail]);

  const driveRoutesGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection",
      features: (driveSegments ?? [])
        .filter((segment) => segment.path?.length > 1)
        .map((segment, index) => ({
          type: "Feature",
          properties: {
            id: segment.id ?? `drive-${index}`,
            routeRole:
              segment.routeRole ?? (index === 0 ? "drive-in" : "drive-home"),
          },
          geometry: {
            type: "LineString",
            coordinates: segment.path,
          },
        })),
    }),
    [driveSegments],
  );

  const connectivityGeoJSON = useMemo(() => {
    const radiusForCoverage = (coverage) => {
      switch (coverage?.toLowerCase()) {
        case "excellent": return 8;
        case "good": return 4;
        case "fair": return 2;
        case "spotty": return 0.8;
        default: return 0;
      }
    };

    return {
      type: "FeatureCollection",
      features: (connectivityZones ?? [])
        .map((zone) => {
          const coordinates = normalizeCoordinatePair(zone.coordinates);
          if (!coordinates) return null;
          const coverage = zone.cellCoverage ?? {};
          const radiusMiles = Math.max(
            radiusForCoverage(coverage.verizon),
            radiusForCoverage(coverage.att),
            radiusForCoverage(coverage.tmobile),
          );
          if (radiusMiles <= 0) return null;
          return {
            type: "Feature",
            properties: { radiusMiles },
            geometry: { type: "Point", coordinates },
          };
        })
        .filter(Boolean),
    };
  }, [connectivityZones]);

  const plannedMiles = basePlanMiles ?? totalMiles ?? 0;

  // Mobile: collapsible HUD
  const [hudExpanded, setHudExpanded] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Land ownership overlay. Loaded from a baked GeoJSON rather than queried
  // live so it still renders with no signal, which is where it matters most.
  const [showOwnership, setShowOwnership] = useState(false);
  const [ownership, setOwnership] = useState(null);
  const [ownershipError, setOwnershipError] = useState(null);
  const [parcelInfo, setParcelInfo] = useState(null);

  useEffect(() => {
    if (!showOwnership || ownership || ownershipError) return;
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/land_ownership.geojson`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setOwnership(data);
      })
      .catch((error) => {
        if (!cancelled) setOwnershipError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [showOwnership, ownership, ownershipError]);

  // Listen for offline status
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return (
    <div className="map-panel">
      {isOffline && (
        <div className="offline-banner" style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          background: 'var(--orange-500)', color: 'white', padding: '0.5rem',
          textAlign: 'center', fontSize: '0.85rem', fontWeight: 'bold'
        }}>
          ⚠️ OFFLINE MODE: Using cached map data
        </div>
      )}
      <div className={`map-hud ${hudExpanded ? "map-hud--expanded" : ""}`}>
        {/* Mobile toggle button */}
        <button
          className="hud-toggle"
          onClick={() => setHudExpanded(!hudExpanded)}
          aria-expanded={hudExpanded}
          aria-label={hudExpanded ? "Collapse map info" : "Expand map info"}
        >
          <span className="hud-toggle-icon">{hudExpanded ? "▼" : "▶"}</span>
          <span className="hud-toggle-title">
            Section O · {plannedMiles} mi
          </span>
        </button>

        <div className="hud-content">
          <p className="eyebrow">
            PCT Section O · Burney Falls → Ash Camp
          </p>
          <h2>Burney Falls → Ash Camp</h2>
          <p className="route-stats">
            <strong>{plannedMiles} mi</strong> PCTA-calibrated base plan ·{" "}
            Ash Camp pickup{" "}
            · Shasta-Trinity NF
          </p>
          <p className="map-note">
            Map and stats reflect the active 51.844-mile itinerary only. The
            historical extended Garmin exports are retained as comparison
            evidence, not an alternate route option.
          </p>
          <div className="route-color-legend" aria-label="Route color legend">
            <span><i style={{ backgroundColor: DRIVE_IN_COLOR }} />Drive In</span>
            {DAY_ROUTE_COLORS.map((color, index) => (
              <span key={color}><i style={{ backgroundColor: color }} />Day {index + 1}</span>
            ))}
            <span><i style={{ backgroundColor: DRIVE_HOME_COLOR }} />Drive Home</span>
          </div>

          <div className="ownership-control">
            <label className="ownership-toggle">
              <input
                type="checkbox"
                checked={showOwnership}
                onChange={(event) => setShowOwnership(event.target.checked)}
              />
              <span>Show land ownership</span>
            </label>

            {showOwnership && ownershipError && (
              <p className="ownership-error">
                Could not load the ownership overlay ({ownershipError}). The
                parcel data is bundled offline, so this usually means the app
                cache needs a refresh. Do not read a blank map as public land.
              </p>
            )}

            {showOwnership && !ownership && !ownershipError && (
              <p className="ownership-note">Loading parcels…</p>
            )}

            {showOwnership && ownership && (
              <>
                <div className="ownership-legend" aria-label="Land ownership legend">
                  <span><i style={{ backgroundColor: "#16a34a" }} />Public — camping allowed</span>
                  <span><i style={{ backgroundColor: "#dc2626" }} />Private timberland — pass through only</span>
                  <span><i style={{ backgroundColor: "#b45309" }} />Other private</span>
                  <span><i style={{ backgroundColor: "#7c3aed" }} />Tribal land</span>
                </div>
                <p className="ownership-note">
                  On the red parcels the active PCTA alert allows PCT passage
                  but prohibits camping, campfires, stoves and any ignition
                  source, smoking, and extended stops. Keep moving. Tap a
                  parcel for its owner and APN.
                </p>
                <p className="ownership-note">
                  {ownership.features.length} parcels from the{" "}
                  {ownership.source}, generated {ownership.generatedAt}. This is
                  a planning screen, not a title report or a surveyed boundary.
                  Posted signage and fence lines win on the ground.
                </p>
              </>
            )}
          </div>
        </div>
        <div
          className="style-switcher"
          role="group"
          aria-label="Basemap style toggles"
        >
          {Object.entries(mapStyles).map(([key, value]) => (
            <button
              key={key}
              type="button"
              className={
                key === selectedStyle ? "style-btn is-active" : "style-btn"
              }
              onClick={() => onStyleChange(key)}
            >
              {value.label}
            </button>
          ))}
        </div>
      </div>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: -121.95,
          latitude: 40.95,
          zoom: 8,
        }}
        mapStyle={mapStyles[selectedStyle].url}
        interactiveLayerIds={
          showOwnership && ownership ? ["land-ownership-fill"] : []
        }
        onClick={(event) => {
          const parcel = event.features?.find(
            (feature) => feature.layer?.id === "land-ownership-fill",
          );
          if (!parcel) return;
          setParcelInfo({
            ...parcel.properties,
            lngLat: [event.lngLat.lng, event.lngLat.lat],
          });
        }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
        attributionControl
      >
        {/* Ownership sits under every other layer so the route, camps, and
            water markers stay readable on top of it. */}
        {showOwnership && ownership && (
          <Source id="land-ownership-source" type="geojson" data={ownership}>
            <Layer
              id="land-ownership-fill"
              type="fill"
              paint={{
                "fill-color": [
                  "match",
                  ["get", "ownership"],
                  "public", "#16a34a",
                  "private-timberland", "#dc2626",
                  "private", "#b45309",
                  "tribal", "#7c3aed",
                  "#6b7280",
                ],
                "fill-opacity": [
                  "match",
                  ["get", "ownership"],
                  "public", 0.16,
                  0.36,
                ],
              }}
            />
            <Layer
              id="land-ownership-outline"
              type="line"
              paint={{
                "line-color": [
                  "match",
                  ["get", "ownership"],
                  "public", "#15803d",
                  "private-timberland", "#991b1b",
                  "private", "#92400e",
                  "tribal", "#5b21b6",
                  "#4b5563",
                ],
                "line-width": 1,
                "line-opacity": 0.7,
              }}
            />
          </Source>
        )}

        {flatTrail.length > 1 && (
          <Source id="hiking-route-source" type="geojson" data={hikingRouteGeoJSON}>
            <Layer
              id="hiking-route-line"
              type="line"
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
              paint={{
                "line-color": [
                  "match",
                  ["get", "day"],
                  1, DAY_ROUTE_COLORS[0],
                  2, DAY_ROUTE_COLORS[1],
                  3, DAY_ROUTE_COLORS[2],
                  4, DAY_ROUTE_COLORS[3],
                  5, DAY_ROUTE_COLORS[4],
                  6, DAY_ROUTE_COLORS[5],
                  7, DAY_ROUTE_COLORS[6],
                  8, DAY_ROUTE_COLORS[7],
                  DAY_ROUTE_COLORS[0],
                ],
                "line-width": 5,
                "line-opacity": 1,
              }}
            />
          </Source>
        )}

        {driveRoutesGeoJSON.features.length > 0 && (
          <Source id="drive-routes-source" type="geojson" data={driveRoutesGeoJSON}>
            <Layer
              id="drive-routes-line"
              type="line"
              layout={{
                "line-cap": "round",
                "line-join": "round",
              }}
              paint={{
                "line-color": [
                  "match",
                  ["get", "routeRole"],
                  "drive-in", DRIVE_IN_COLOR,
                  "drive-home", DRIVE_HOME_COLOR,
                  "#787878",
                ],
                "line-width": 4,
                "line-opacity": 0.8,
                "line-dasharray": [2, 1.5],
              }}
            />
          </Source>
        )}

        {connectivityGeoJSON.features.length > 0 && (
          <Source
            id="connectivity-coverage-source"
            type="geojson"
            data={connectivityGeoJSON}
          >
            <Layer
              id="connectivity-coverage-circles"
              type="circle"
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  6,
                  ["*", ["get", "radiusMiles"], 1.5],
                  12,
                  ["*", ["get", "radiusMiles"], 25],
                ],
                "circle-color": "#9333ea",
                "circle-opacity": 0.14,
                "circle-stroke-color": "#9333ea",
                "circle-stroke-opacity": 0.4,
                "circle-stroke-width": 1.5,
              }}
            />
          </Source>
        )}
        <NavigationControl position="top-left" />
        <ScaleControl maxWidth={120} unit="imperial" position="bottom-left" />
        <FullscreenControl position="top-left" />

        {campPoints.map((feature, idx) => {
          const type = feature.properties?.type;
          const isSJC = feature.properties?.name?.includes("SJC");
          const icon = type === "Transit" 
            ? (isSJC ? "✈️" : "🚙") 
            : type === "GasStation" 
              ? "⛽" 
              : type === "Support Transfer"
                ? "↔️"
                : type === "Finish"
                  ? "🏁"
                  : type === "Trailhead"
                    ? "🚩"
                    : "⛺";
          const markerClass =
            type === "Transit" || type === "GasStation"
              ? "transport"
              : type === "Support Transfer"
                ? "transfer"
                : "camp";
          
          return (
            <Marker
              key={`camp-${feature.properties?.name || idx}`}
              longitude={feature.geometry.coordinates[0]}
              latitude={feature.geometry.coordinates[1]}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo(feature);
              }}
            >
              <div className={`marker marker--${markerClass}`}>{icon}</div>
            </Marker>
          );
        })}

        {townPins.map((town, idx) => (
          <Marker
            key={`town-${town.name || idx}`}
            longitude={town.coordinates[0]}
            latitude={town.coordinates[1]}
            anchor="bottom"
          >
            <div className="marker marker--town">🏘️</div>
          </Marker>
        ))}

        {transportPoints.map((point, idx) => (
          <Marker
            key={`transport-${point.name || idx}`}
            longitude={point.coordinates[0]}
            latitude={point.coordinates[1]}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setPopupInfo(point);
            }}
          >
            <div className="marker marker--transport">
              {getTransportIcon(point.type)}
            </div>
          </Marker>
        ))}

        {waterSources.map((source, idx) => (
          <Marker
            key={`water-${source.waypoint || source.mile || idx}`}
            longitude={source.coordinates[0]}
            latitude={source.coordinates[1]}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setPopupInfo(source);
            }}
          >
            <div
              className={`marker marker--water marker--water-${waterMarkerClass(source)}`}
              title={`${source.name}: ${formatWaterStatus(source)}`}
              role="img"
              aria-label={`${source.name}: ${formatWaterStatus(source)}`}
            >
              💧
            </div>
          </Marker>
        ))}

        {hoverCoordinates && (
          <Marker
            longitude={hoverCoordinates[0]}
            latitude={hoverCoordinates[1]}
            anchor="bottom"
          >
            <div className="marker marker--profile">📈</div>
          </Marker>
        )}

        {connectivityZones.map((zone, idx) => {
          const hasSignal = zone.cellCoverage.verizon !== "none" || zone.cellCoverage.att !== "none" || zone.cellCoverage.tmobile !== "none";
          return (
            <Marker
              key={`conn-${zone.mile || idx}`}
              longitude={zone.coordinates[0]}
              latitude={zone.coordinates[1]}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo({ ...zone, type: "connectivity" });
              }}
            >
              <div 
                className="marker marker--connectivity" 
                style={{ opacity: hasSignal ? 0.95 : 0.45 }}
              >
                {hasSignal ? "📡" : "📵"}
              </div>
            </Marker>
          );
        })}

        {popupInfo && popupCoordinates && (
          <Popup
            anchor="top"
            longitude={popupCoordinates[0]}
            latitude={popupCoordinates[1]}
            onClose={() => setPopupInfo(null)}
          >
            <div className="popup">
              {popupInfo.properties?.day !== undefined && (
                <p className="day-pill">Day {popupInfo.properties.day}</p>
              )}
              {popupInfo.type && popupInfo.type !== "connectivity" && (
                <p className="day-pill">{popupInfo.type.replace("-", " ")}</p>
              )}
              {popupInfo.mile && (
                <p className="day-pill">Mile {popupInfo.mile}</p>
              )}
              <h3>{popupInfo.properties?.name ?? popupInfo.name}</h3>

              {isWaterPopup && (
                <div className="popup-water-status">
                  <strong>{formatWaterStatus(popupInfo)}</strong>
                  {popupInfo.observedAt && (
                    <span>
                      Field report: {popupInfo.observedAt}
                      {Number.isFinite(popupInfo.ageDays)
                        ? ` · ${popupInfo.ageDays} day${popupInfo.ageDays === 1 ? "" : "s"} old`
                        : ""}
                    </span>
                  )}
                  {popupInfo.reportedBy && (
                    <span>Reported by {popupInfo.reportedBy}</span>
                  )}
                  {popupInfo.liveMatchMethod && (
                    <span>Matched by {popupInfo.liveMatchMethod}</span>
                  )}
                  {popupInfo.liveWaterSourceUrl && (
                    <a
                      href={popupInfo.liveWaterSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open PCT Water Report ↗
                    </a>
                  )}
                </div>
              )}

              {popupInfo.type === "connectivity" && popupInfo.cellCoverage && (
                <div className="popup-connectivity">
                  <p className="connectivity-signals">
                    <span>📶 Verizon: {popupInfo.cellCoverage.verizon}</span>
                    <span>📶 AT&T: {popupInfo.cellCoverage.att}</span>
                    <span>📶 T-Mobile: {popupInfo.cellCoverage.tmobile}</span>
                  </p>
                  {popupInfo.satelliteCompatible && (
                    <p className="satellite-indicator">
                      📡 Satellite connectivity available
                    </p>
                  )}
                </div>
              )}

              <p>{popupInfo.properties?.segment ?? ""}</p>
              <p className="note">
                {popupInfo.properties?.notes ??
                  popupInfo.notes ??
                  popupInfo.latestReport ??
                  popupInfo.report}
              </p>
            </div>
          </Popup>
        )}

        {parcelInfo && (
          <Popup
            longitude={parcelInfo.lngLat[0]}
            latitude={parcelInfo.lngLat[1]}
            anchor="bottom"
            onClose={() => setParcelInfo(null)}
            closeOnClick={false}
            maxWidth="320px"
          >
            <div className="map-popup">
              <p className="day-pill">
                {parcelInfo.ownership === "public"
                  ? "Public land"
                  : parcelInfo.ownership === "private-timberland"
                    ? "Private timberland"
                    : parcelInfo.ownership === "tribal"
                      ? "Tribal land"
                      : "Private land"}
              </p>
              <h3>{parcelInfo.assessee || "Unknown owner"}</h3>
              <p>APN {parcelInfo.apn}</p>
              {parcelInfo.acres != null && (
                <p>{Number(parcelInfo.acres).toFixed(1)} acres (GIS)</p>
              )}
              {parcelInfo.ownership === "private-timberland" && (
                <p>
                  PCT passage is allowed here. Camping, campfires, stoves and
                  any ignition source, smoking, and extended stops are not.
                  Travel carefully and continuously.
                </p>
              )}
              {parcelInfo.ownership === "private" && (
                <p>
                  Private property outside the PCTA timberland alert. No camping
                  and no assumed right of entry off the trail corridor.
                </p>
              )}
              {parcelInfo.ownership === "tribal" && (
                <p>
                  Tribal land. Do not treat this as public access or as ordinary
                  private timberland; entry and use are governed by the tribe.
                </p>
              )}
              {parcelInfo.ownership === "public" && (
                <p>
                  Public land. Dispersed camping is generally allowed subject to
                  current fire restrictions and agency rules, which still need a
                  same-week check.
                </p>
              )}
              <p>
                County assessor screen, not a title report or surveyed boundary.
                Posted signage and fence lines win on the ground.
              </p>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

TrailMap.propTypes = {
  mapStyles: PropTypes.objectOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      url: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedStyle: PropTypes.string.isRequired,
  onStyleChange: PropTypes.func.isRequired,
  totalMiles: PropTypes.number.isRequired,
  basePlanMiles: PropTypes.number,
  hikingTrail: PropTypes.arrayOf(PropTypes.array).isRequired,
  driveSegments: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.array.isRequired,
      type: PropTypes.string,
    })
  ).isRequired,
  campPoints: PropTypes.arrayOf(
    PropTypes.shape({
      properties: PropTypes.object,
      geometry: PropTypes.shape({
        coordinates: PropTypes.array,
      }),
    })
  ).isRequired,
  townPins: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      coordinates: PropTypes.array.isRequired,
    })
  ).isRequired,
  transportPoints: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      coordinates: PropTypes.array.isRequired,
      type: PropTypes.string,
    })
  ).isRequired,
  waterSources: PropTypes.arrayOf(
    PropTypes.shape({
      waypoint: PropTypes.string,
      mile: PropTypes.number,
      coordinates: PropTypes.array.isRequired,
    })
  ).isRequired,
  connectivityZones: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      mile: PropTypes.number.isRequired,
      coordinates: PropTypes.array.isRequired,
      cellCoverage: PropTypes.object,
      satelliteCompatible: PropTypes.bool,
    })
  ).isRequired,
  popupInfo: PropTypes.object,
  setPopupInfo: PropTypes.func.isRequired,
  hoverHighlight: PropTypes.shape({
    coordinates: PropTypes.array,
  }),
};

TrailMap.defaultProps = {
  popupInfo: null,
  hoverHighlight: null,
  basePlanMiles: null,
};

export default TrailMap;
