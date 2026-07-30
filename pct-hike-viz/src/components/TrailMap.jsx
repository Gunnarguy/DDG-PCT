import { ScatterplotLayer } from "@deck.gl/layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
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
  useControl,
} from "react-map-gl/maplibre";
import { normalizeCoordinatePair } from "../utils/coordinates";

function DeckOverlay({ layers }) {
  const overlay = useControl(() => new MapboxOverlay({ interleaved: true }));
  // Only set layers if we have valid data to prevent render errors
  if (layers?.length) {
    overlay.setProps({ layers });
  }
  return null;
}

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

function TrailMap({
  mapStyles,
  selectedStyle,
  onStyleChange,
  totalMiles,
  basePlanMiles,
  fullSectionMiles,
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

  const hikingRouteGeoJSON = useMemo(
    () => ({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: flatTrail,
      },
    }),
    [flatTrail],
  );

  const driveRoutesGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection",
      features: (driveSegments ?? [])
        .filter((segment) => segment.path?.length > 1)
        .map((segment, index) => ({
          type: "Feature",
          properties: {
            id: segment.id ?? `drive-${index}`,
            routeType: segment.type ?? "drive",
          },
          geometry: {
            type: "LineString",
            coordinates: segment.path,
          },
        })),
    }),
    [driveSegments],
  );

  const deckLayers = useMemo(() => {
    const layers = [];

    // Add cell coverage circles
    if (connectivityZones?.length) {
      layers.push(
        new ScatterplotLayer({
          id: "cell-coverage",
          data: connectivityZones,
          getPosition: (d) => [d.coordinates[0], d.coordinates[1]],
          getRadius: (d) => {
            const coverages = [d.cellCoverage.verizon, d.cellCoverage.att, d.cellCoverage.tmobile];
            let maxRadiusMiles = 0;
            coverages.forEach((c) => {
              let r = 0;
              switch (c?.toLowerCase()) {
                case "excellent": r = 8.0; break;
                case "good":      r = 4.0; break;
                case "fair":      r = 2.0; break;
                case "spotty":    r = 0.8; break;
                default:          r = 0;
              }
              if (r > maxRadiusMiles) maxRadiusMiles = r;
            });
            return maxRadiusMiles * 1609.34;
          },
          radiusUnits: "meters",
          getFillColor: [147, 51, 234, 35], // purple opacity
          getLineColor: [147, 51, 234, 100],
          lineWidthUnits: "pixels",
          getLineWidth: 1.5,
          pickable: false,
        })
      );
    }

    return layers;
  }, [connectivityZones]);

  const plannedMiles = basePlanMiles ?? totalMiles ?? 0;
  const optionalExtension =
    fullSectionMiles && fullSectionMiles > plannedMiles
      ? fullSectionMiles
      : null;

  // Mobile: collapsible HUD
  const [hudExpanded, setHudExpanded] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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
            <strong>{plannedMiles} mi</strong> base plan (GPS-derived) ·{" "}
            {optionalExtension
              ? `Optional to Dunsmuir: ~${optionalExtension} mi total`
              : "Ash Camp pickup"}{" "}
            · Shasta-Trinity NF
          </p>
          <p className="map-note">
            Map and stats reflect the base plan only. Add the Dunsmuir extension
            if we decide to hike the full Section O.
          </p>
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
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
        attributionControl
      >
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
                "line-color": "#ff5e69",
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
                  "case",
                  ["==", ["get", "routeType"], "drive"],
                  "#787878",
                  "#52a07e",
                ],
                "line-width": 4,
                "line-opacity": 0.8,
                "line-dasharray": [2, 1.5],
              }}
            />
          </Source>
        )}

        <DeckOverlay layers={deckLayers} />
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
              : "⛺";
          const markerClass = type === "Transit" || type === "GasStation" ? "transport" : "camp";
          
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
            <div className="marker marker--water">💧</div>
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
                  popupInfo.report}
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
  fullSectionMiles: PropTypes.number,
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
  fullSectionMiles: null,
};

export default TrailMap;
