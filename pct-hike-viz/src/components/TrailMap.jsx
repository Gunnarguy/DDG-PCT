import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import Map, {
  Marker,
  Popup,
  NavigationControl,
  ScaleControl,
  FullscreenControl,
  useControl
} from 'react-map-gl/maplibre';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { PathLayer } from '@deck.gl/layers';

function DeckOverlay({ layers }) {
  const overlay = useControl(() => new MapboxOverlay({ interleaved: true }));
  overlay.setProps({ layers });
  return null;
}

const getTransportIcon = (type) => {
  switch (type) {
    case 'airport': return '✈️';
    case 'trailhead-parking': return '🅿️';
    case 'shuttle-point': return '🚐';
    default: return '📍';
  }
};

function TrailMap({
  mapStyles,
  selectedStyle,
  onStyleChange,
  totalMiles,
  hikingTrail,
  driveSegments,
  campPoints,
  townPins,
  transportPoints,
  waterSources,
  connectivityZones,
  popupInfo,
  setPopupInfo,
  hoverHighlight
}) {
  const deckLayers = useMemo(
    () => [
      new PathLayer({
        id: 'hiking-trail',
        data: [{ path: hikingTrail }],
        getPath: (d) => d.path,
        getColor: [255, 94, 105, 255],
        widthUnits: 'pixels',
        getWidth: 5,
        rounded: true,
        capRounded: true
      }),
      new PathLayer({
        id: 'drive-routes',
        data: driveSegments,
        getPath: (d) => d.path,
        getColor: (d) => (d.type === 'drive' ? [120, 120, 120, 180] : [82, 160, 126, 200]),
        widthUnits: 'pixels',
        getWidth: 4,
        getDashArray: [8, 4],
        dashJustified: true,
        extensions: []
      })
    ],
    [hikingTrail, driveSegments]
  );

  return (
    <div className="map-panel">
      <div className="map-hud">
        <div>
          <p className="eyebrow">PCT Section O · Mile 1420.7 → 1472.7</p>
          <h2>Burney Falls → Castle Crags</h2>
          <p className="route-stats">
            <strong>{totalMiles.toFixed(1)} miles</strong> GPS-measured · <strong>6 days</strong> hiking · 
            <strong>~{(totalMiles / 6).toFixed(1)} mi/day</strong> avg · Shasta-Trinity NF
          </p>
          <p className="map-note">
            Topo layers from <strong>osm-liberty-topo</strong> (openmaptiles + terrain + NAIP + fstopo)
          </p>
        </div>
        <div className="style-switcher" role="group" aria-label="Basemap style toggles">
          {Object.entries(mapStyles).map(([key, value]) => (
            <button
              key={key}
              type="button"
              className={key === selectedStyle ? 'style-btn is-active' : 'style-btn'}
              onClick={() => onStyleChange(key)}
            >
              {value.label}
            </button>
          ))}
        </div>
      </div>
      <Map
        initialViewState={{
          longitude: -121.95,
          latitude: 40.95,
          zoom: 8
        }}
        mapStyle={mapStyles[selectedStyle].url}
        style={{ width: '100%', height: '100%' }}
        attributionControl
      >
        <DeckOverlay layers={deckLayers} />
        <NavigationControl position="top-left" />
        <ScaleControl maxWidth={120} unit="imperial" position="bottom-left" />
        <FullscreenControl position="top-left" />

        {campPoints.map((feature) => (
          <Marker
            key={feature.properties.name}
            longitude={feature.geometry.coordinates[0]}
            latitude={feature.geometry.coordinates[1]}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setPopupInfo(feature);
            }}
          >
            <div className="marker marker--camp">⛺</div>
          </Marker>
        ))}

        {townPins.map((town) => (
          <Marker
            key={town.name}
            longitude={town.coordinates[0]}
            latitude={town.coordinates[1]}
            anchor="bottom"
          >
            <div className="marker marker--town">🏘️</div>
          </Marker>
        ))}

        {transportPoints.map((point) => (
          <Marker
            key={point.name}
            longitude={point.coordinates[0]}
            latitude={point.coordinates[1]}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setPopupInfo(point);
            }}
          >
            <div className="marker marker--transport">{getTransportIcon(point.type)}</div>
          </Marker>
        ))}

        {waterSources.map((source) => (
          <Marker
            key={source.waypoint || source.mile}
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

        {hoverHighlight?.coordinates && (
          <Marker
            longitude={hoverHighlight.coordinates[0]}
            latitude={hoverHighlight.coordinates[1]}
            anchor="bottom"
          >
            <div className="marker marker--profile">📈</div>
          </Marker>
        )}

        {connectivityZones.map((zone) => (
          <Marker
            key={zone.mile}
            longitude={zone.coordinates[0]}
            latitude={zone.coordinates[1]}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setPopupInfo({ ...zone, type: 'connectivity' });
            }}
          >
            <div className="marker marker--connectivity">📡</div>
          </Marker>
        ))}

        {popupInfo && (
          <Popup
            anchor="top"
            longitude={popupInfo.geometry?.coordinates?.[0] ?? popupInfo.coordinates?.[0]}
            latitude={popupInfo.geometry?.coordinates?.[1] ?? popupInfo.coordinates?.[1]}
            onClose={() => setPopupInfo(null)}
          >
            <div className="popup">
              {popupInfo.properties?.day !== undefined && (
                <p className="day-pill">Day {popupInfo.properties.day}</p>
              )}
              {popupInfo.type && popupInfo.type !== 'connectivity' && (
                <p className="day-pill">{popupInfo.type.replace('-', ' ')}</p>
              )}
              {popupInfo.mile && (
                <p className="day-pill">Mile {popupInfo.mile}</p>
              )}
              <h3>{popupInfo.properties?.name ?? popupInfo.name}</h3>
              
              {popupInfo.type === 'connectivity' && popupInfo.cellCoverage && (
                <div className="popup-connectivity">
                  <p className="connectivity-signals">
                    <span>📶 Verizon: {popupInfo.cellCoverage.verizon}</span>
                    <span>📶 AT&T: {popupInfo.cellCoverage.att}</span>
                    <span>📶 T-Mobile: {popupInfo.cellCoverage.tmobile}</span>
                  </p>
                  {popupInfo.satelliteCompatible && (
                    <p className="satellite-indicator">📡 Satellite connectivity available</p>
                  )}
                </div>
              )}
              
              <p>{popupInfo.properties?.segment ?? ''}</p>
              <p className="note">{popupInfo.properties?.notes ?? popupInfo.notes ?? popupInfo.report}</p>
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
      url: PropTypes.string.isRequired
    })
  ).isRequired,
  selectedStyle: PropTypes.string.isRequired,
  onStyleChange: PropTypes.func.isRequired,
  totalMiles: PropTypes.number.isRequired,
  hikingTrail: PropTypes.arrayOf(PropTypes.array).isRequired,
  driveSegments: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.array.isRequired,
      type: PropTypes.string
    })
  ).isRequired,
  campPoints: PropTypes.arrayOf(
    PropTypes.shape({
      properties: PropTypes.object,
      geometry: PropTypes.shape({
        coordinates: PropTypes.array
      })
    })
  ).isRequired,
  townPins: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      coordinates: PropTypes.array.isRequired
    })
  ).isRequired,
  transportPoints: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      coordinates: PropTypes.array.isRequired,
      type: PropTypes.string
    })
  ).isRequired,
  waterSources: PropTypes.arrayOf(
    PropTypes.shape({
      waypoint: PropTypes.string,
      mile: PropTypes.number,
      coordinates: PropTypes.array.isRequired
    })
  ).isRequired,
  connectivityZones: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      mile: PropTypes.number.isRequired,
      coordinates: PropTypes.array.isRequired,
      cellCoverage: PropTypes.object,
      satelliteCompatible: PropTypes.bool
    })
  ).isRequired,
  popupInfo: PropTypes.object,
  setPopupInfo: PropTypes.func.isRequired,
  hoverHighlight: PropTypes.shape({
    coordinates: PropTypes.array
  })
};

TrailMap.defaultProps = {
  popupInfo: null,
  hoverHighlight: null
};

export default TrailMap;
