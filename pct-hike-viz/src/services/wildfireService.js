/**
 * Wildfire & Air Quality Monitoring Service
 * 
 * Fetches current wildfire perimeters and air quality data for PCT Section O.
 * Updates every 4 hours to match nst.guide refresh cadence.
 * 
 * Data Sources:
 * - NIFC (National Interagency Fire Center) for active fire perimeters
 * - EPA AirNow API for air quality index
 */

const SECTION_O_BBOX = {
  west: -122.5,
  south: 40.8,
  east: -121.0,
  north: 41.3
};

const EPA_API_KEY = import.meta.env.VITE_EPA_AIRNOW_API_KEY;
const AIRNOW_ENDPOINT = 'https://www.airnowapi.org/aq/observation/latLong/current/';

const CACHE_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours
let wildfireCache = null;
let airQualityCache = null;
let lastWildfireFetch = 0;
let lastAirQualityFetch = 0;

/**
 * Fetch active wildfires near Section O
 * Uses NIFC Active Fire Perimeters GeoJSON feed
 */
export const fetchWildfires = async () => {
  const now = Date.now();
  if (wildfireCache && (now - lastWildfireFetch) < CACHE_DURATION_MS) {
    return wildfireCache;
  }

  try {
    // NIFC publishes active fire perimeters as GeoJSON
    // This is a simplified version - production would use their actual API
    const response = await fetch(
      'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Current_WildlandFire_Perimeters/FeatureServer/0/query?' +
      new URLSearchParams({
        where: '1=1',
        geometry: JSON.stringify({
          xmin: SECTION_O_BBOX.west,
          ymin: SECTION_O_BBOX.south,
          xmax: SECTION_O_BBOX.east,
          ymax: SECTION_O_BBOX.north,
          spatialReference: { wkid: 4326 }
        }),
        geometryType: 'esriGeometryEnvelope',
        spatialRel: 'esriSpatialRelIntersects',
        outFields: 'IncidentName,GISAcres,PercentContained,FireDiscoveryDateTime,POOState',
        returnGeometry: 'true',
        f: 'geojson'
      })
    );

    if (!response.ok) {
      throw new Error(`Wildfire API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Transform to simplified format
    const fires = (data.features || []).map(feature => ({
      name: feature.properties.IncidentName,
      acres: Math.round(feature.properties.GISAcres || 0),
      containment: feature.properties.PercentContained || 0,
      discovered: feature.properties.FireDiscoveryDateTime,
      state: feature.properties.POOState,
      geometry: feature.geometry,
      distanceToTrail: calculateDistanceToTrail(feature.geometry)
    }));

    wildfireCache = {
      fires,
      timestamp: new Date().toISOString(),
      count: fires.length
    };
    lastWildfireFetch = now;
    
    return wildfireCache;
  } catch (error) {
    console.error('Failed to fetch wildfire data:', error);
    return wildfireCache || { fires: [], timestamp: null, count: 0, error: error.message };
  }
};

/**
 * Fetch air quality data for Section O monitoring points
 * Uses EPA AirNow API for real-time AQI
 */
export const fetchAirQuality = async () => {
  const now = Date.now();
  if (airQualityCache && (now - lastAirQualityFetch) < CACHE_DURATION_MS) {
    return airQualityCache;
  }

  try {
    // Check AQI at key points: Burney Falls, Hat Creek, Castle Crags
    const monitoringPoints = [
      { name: 'Burney Falls', lat: 41.013, lon: -121.653 },
      { name: 'Hat Creek', lat: 41.027, lon: -121.732 },
      { name: 'Castle Crags', lat: 41.173, lon: -121.897 }
    ];

    const usingLiveAqi = Boolean(EPA_API_KEY);
    const readings = await Promise.all(
      monitoringPoints.map(async (point) => {
        if (!usingLiveAqi) {
          return {
            location: point.name,
            aqi: null,
            category: 'Unknown',
            pm25: null,
            ozone: null,
            timestamp: new Date().toISOString(),
            note: 'No API key configured'
          };
        }

        try {
          const response = await fetch(
            `${AIRNOW_ENDPOINT}?` + new URLSearchParams({
              format: 'application/json',
              latitude: point.lat,
              longitude: point.lon,
              distance: 25,
              API_KEY: EPA_API_KEY
            })
          );

          if (!response.ok) {
            throw new Error(`AirNow API responded with ${response.status}`);
          }

          const payload = await response.json();
          if (!Array.isArray(payload) || payload.length === 0) {
            return {
              location: point.name,
              aqi: null,
              category: 'Unknown',
              pm25: null,
              ozone: null,
              timestamp: new Date().toISOString(),
              note: 'No AirNow readings returned'
            };
          }

          const pm25Entry = payload.find(record => record.ParameterName === 'PM2.5');
          const ozoneEntry = payload.find(record => record.ParameterName === 'O3');
          const primary = payload[0];

          return {
            location: point.name,
            aqi: primary?.AQI ?? null,
            category: primary?.Category?.Name ?? 'Unknown',
            pm25: pm25Entry?.AQI ?? null,
            ozone: ozoneEntry?.AQI ?? null,
            timestamp: primary?.DateObserved
              ? `${primary.DateObserved} ${primary.HourObserved}:00 ${primary.LocalTimeZone}`
              : new Date().toISOString()
          };
        } catch (error) {
          console.warn(`Failed to fetch AQI for ${point.name}:`, error);
          return {
            location: point.name,
            aqi: null,
            category: 'Unknown',
            pm25: null,
            ozone: null,
            timestamp: new Date().toISOString(),
            error: error.message
          };
        }
      })
    );

    airQualityCache = {
      readings,
      timestamp: new Date().toISOString(),
      note: usingLiveAqi
        ? 'Live AQI via EPA AirNow API'
        : 'Set VITE_EPA_AIRNOW_API_KEY to enable live AQI polling'
    };
    lastAirQualityFetch = now;
    
    return airQualityCache;
  } catch (error) {
    console.error('Failed to fetch air quality data:', error);
    return airQualityCache || { readings: [], timestamp: null, error: error.message };
  }
};

/**
 * Calculate approximate distance from fire perimeter to trail
 * Simplified version - production would use proper geospatial library
 */
const calculateDistanceToTrail = (geometry) => {
  if (!geometry || !geometry.coordinates) return null;
  
  // Trail centerpoint approximation
  const trailCenter = { lat: 41.09, lon: -121.77 };
  
  // Find closest point in fire perimeter to trail center
  let minDistance = Infinity;
  
  const checkPoint = (coord) => {
    const [lon, lat] = coord;
    const distance = Math.sqrt(
      Math.pow(lat - trailCenter.lat, 2) + 
      Math.pow(lon - trailCenter.lon, 2)
    ) * 69; // Rough miles conversion
    
    if (distance < minDistance) {
      minDistance = distance;
    }
  };
  
  if (geometry.type === 'Polygon') {
    geometry.coordinates[0].forEach(checkPoint);
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(polygon => {
      polygon[0].forEach(checkPoint);
    });
  }
  
  return minDistance === Infinity ? null : Math.round(minDistance);
};

/**
 * Get AQI category and color coding
 */
export const getAQIInfo = (aqi) => {
  if (aqi === null || aqi === undefined) {
    return { category: 'Unknown', color: '#999', emoji: '❓' };
  }
  
  if (aqi <= 50) {
    return { category: 'Good', color: '#00E400', emoji: '✅' };
  } else if (aqi <= 100) {
    return { category: 'Moderate', color: '#FFFF00', emoji: '⚠️' };
  } else if (aqi <= 150) {
    return { category: 'Unhealthy for Sensitive Groups', color: '#FF7E00', emoji: '🟠' };
  } else if (aqi <= 200) {
    return { category: 'Unhealthy', color: '#FF0000', emoji: '🔴' };
  } else if (aqi <= 300) {
    return { category: 'Very Unhealthy', color: '#8F3F97', emoji: '🟣' };
  } else {
    return { category: 'Hazardous', color: '#7E0023', emoji: '☠️' };
  }
};

/**
 * Determine if conditions are safe for hiking
 */
export const assessHikingSafety = (wildfireData, airQualityData) => {
  const assessment = {
    safe: true,
    warnings: [],
    recommendations: []
  };
  
  // Check for nearby fires
  const nearbyFires = wildfireData.fires.filter(fire => 
    fire.distanceToTrail !== null && fire.distanceToTrail < 25
  );
  
  if (nearbyFires.length > 0) {
    assessment.safe = false;
    assessment.warnings.push(
      `${nearbyFires.length} active fire(s) within 25 miles of trail`
    );
    nearbyFires.forEach(fire => {
      assessment.warnings.push(
        `${fire.name}: ${fire.acres.toLocaleString()} acres, ${fire.containment}% contained, ${fire.distanceToTrail} mi away`
      );
    });
  }
  
  // Check air quality
  const badAQI = airQualityData.readings.filter(reading => 
    reading.aqi && reading.aqi > 100
  );
  
  if (badAQI.length > 0) {
    assessment.safe = false;
    assessment.warnings.push(
      `Poor air quality detected at ${badAQI.length} location(s)`
    );
  }
  
  // Recommendations
  if (!assessment.safe) {
    assessment.recommendations.push(
      'Monitor conditions daily via InciWeb and PCTA trail updates',
      'Consider N95 masks for smoke exposure',
      'Have evacuation plan and emergency contacts ready',
      'Check trail closure status before departure'
    );
  } else {
    assessment.recommendations.push(
      'Conditions currently favorable for hiking',
      'Continue monitoring every 4 hours during trip'
    );
  }
  
  return assessment;
};

export default {
  fetchWildfires,
  fetchAirQuality,
  getAQIInfo,
  assessHikingSafety
};
