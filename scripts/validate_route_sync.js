#!/usr/bin/env node
/*
 * Validates that pct-hike-viz/src/hike_data.json is in sync with the canonical
 * CA Section O GPX track that feeds the rest of the visualization stack.
 *
 * Emits a report comparing total mileage, elevation extrema, and start/end
 * coordinates. Fails with code 1 if any metric drifts beyond a tight tolerance
 * so the map never diverges from the datasets shown elsewhere in the UI.
 */

const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const ROOT = path.resolve(__dirname, '..');
const HIKE_DATA_PATH = path.join(ROOT, 'pct-hike-viz/src/hike_data.json');
const SECTION_O_GPX = path.join(
  ROOT,
  'Section O/CA Section O - size 9 - 026518 points - 083.19 miles.gpx'
);

const TOLERANCES = {
  distanceMiles: 0.75, // max drift between JSON + GPX totals
  coordinateDegrees: 0.0015, // roughly ~150m at these latitudes
  elevationFeet: 150
};

const haversineMiles = (a, b) => {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return (R * c) / 1609.344;
};

const computeStats = (points) => {
  let distance = 0;
  let gain = 0;
  let loss = 0;
  let minElevation = Infinity;
  let maxElevation = -Infinity;

  for (let i = 1; i < points.length; i += 1) {
    distance += haversineMiles(points[i - 1], points[i]);

    const delta = (points[i].elevation ?? 0) - (points[i - 1].elevation ?? 0);
    if (delta > 0) gain += delta;
    if (delta < 0) loss += Math.abs(delta);
  }

  points.forEach((pt) => {
    const elev = pt.elevation ?? 0;
    if (elev < minElevation) minElevation = elev;
    if (elev > maxElevation) maxElevation = elev;
  });

  return {
    distance,
    gain,
    loss,
    minElevation,
    maxElevation
  };
};

const normalizeTrail = (rawPoints) =>
  rawPoints.map(([lon, lat, elevation]) => ({
    lon,
    lat,
    elevation: elevation ?? null
  }));

const normalizeGpx = (trkpts) =>
  trkpts.map((pt) => ({
    lon: parseFloat(pt.$.lon),
    lat: parseFloat(pt.$.lat),
    elevation: pt.ele ? parseFloat(pt.ele[0]) * 3.28084 : null // meters → feet
  }));

(async () => {
  const hikeData = JSON.parse(fs.readFileSync(HIKE_DATA_PATH, 'utf8'));
  const hikeTrail = normalizeTrail(hikeData.route?.path ?? []);
  if (!hikeTrail.length) {
    console.error('❌ hike_data.json is missing route.path entries');
    process.exit(1);
  }

  const parser = new xml2js.Parser();
  const gpxContent = fs.readFileSync(SECTION_O_GPX, 'utf8');
  const gpxJson = await parser.parseStringPromise(gpxContent);
  const gpxTrail = normalizeGpx(gpxJson.gpx.trk?.[0]?.trkseg?.[0]?.trkpt ?? []);
  if (!gpxTrail.length) {
    console.error('❌ Unable to read GPX track points for Section O');
    process.exit(1);
  }

  const hikeStats = computeStats(hikeTrail);
  const gpxStats = computeStats(gpxTrail);

  const deltas = {
    distance: Math.abs(hikeStats.distance - gpxStats.distance),
    startLat: Math.abs(hikeTrail[0].lat - gpxTrail[0].lat),
    startLon: Math.abs(hikeTrail[0].lon - gpxTrail[0].lon),
    endLat: Math.abs(hikeTrail.at(-1).lat - gpxTrail.at(-1).lat),
    endLon: Math.abs(hikeTrail.at(-1).lon - gpxTrail.at(-1).lon),
    minElevation: Math.abs(hikeStats.minElevation - gpxStats.minElevation),
    maxElevation: Math.abs(hikeStats.maxElevation - gpxStats.maxElevation)
  };

  const failures = [];
  if (deltas.distance > TOLERANCES.distanceMiles) {
    failures.push(
      `Distance drift ${deltas.distance.toFixed(2)} mi ➜ tolerance ${TOLERANCES.distanceMiles} mi`
    );
  }
  ['startLat', 'startLon', 'endLat', 'endLon'].forEach((key) => {
    if (deltas[key] > TOLERANCES.coordinateDegrees) {
      failures.push(`${key} drift ${deltas[key]}° ➜ tolerance ${TOLERANCES.coordinateDegrees}°`);
    }
  });
  ['minElevation', 'maxElevation'].forEach((key) => {
    if (deltas[key] > TOLERANCES.elevationFeet) {
      failures.push(`${key} drift ${Math.round(deltas[key])} ft ➜ tolerance ${TOLERANCES.elevationFeet} ft`);
    }
  });

  if (failures.length) {
    console.error('❌ Section O map data is out of sync:');
    failures.forEach((msg) => console.error(`   • ${msg}`));
    process.exit(1);
  }

  console.log('✅ Map route matches Section O GPX');
  console.table({
    'JSON miles': hikeStats.distance.toFixed(2),
    'GPX miles': gpxStats.distance.toFixed(2),
    'JSON min ft': Math.round(hikeStats.minElevation),
    'GPX min ft': Math.round(gpxStats.minElevation),
    'JSON max ft': Math.round(hikeStats.maxElevation),
    'GPX max ft': Math.round(gpxStats.maxElevation)
  });
})();
