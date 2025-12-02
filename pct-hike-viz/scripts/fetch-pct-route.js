#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SERVICE_URL = 'https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer/0/query';
const WHERE_CLAUSE = "(NATIONAL_TRAIL_DESIGNATION = 3 AND TRAIL_NAME LIKE '%PACIFIC%') OR TRAIL_NO LIKE '2000%'";
const OUT_FIELDS = [
  'TRAIL_NO',
  'TRAIL_NAME',
  'NATIONAL_TRAIL_DESIGNATION',
  'TRL_MILES',
  'STATE',
  'FORESTNAME',
  'REGION'
].join(',');
const OBJECT_ID_FIELD = 'OBJECTID';
const CHUNK_SIZE = Number(process.env.PCT_ROUTE_CHUNK_SIZE ?? 250);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'public', 'data', 'pct_route.geojson');

function arcGisFeatureToGeoJson(feature) {
  const geometry = feature.geometry ?? {};
  const paths = geometry.paths ?? [];

  let geoGeometry = null;

  if (paths.length === 1) {
    geoGeometry = { type: 'LineString', coordinates: paths[0] };
  } else if (paths.length > 1) {
    geoGeometry = { type: 'MultiLineString', coordinates: paths };
  }

  return {
    type: 'Feature',
    geometry: geoGeometry,
    properties: feature.attributes ?? {}
  };
}

async function executeQuery(params) {
  const searchParams = new URLSearchParams(params);
  const response = await fetch(`${SERVICE_URL}?${searchParams.toString()}`);

  if (!response.ok) {
    const message = `Forest Service query failed (${response.status} ${response.statusText})`;
    throw new Error(message);
  }

  const payload = await response.json();

  if (payload?.error) {
    throw new Error(`Forest Service error: ${JSON.stringify(payload.error)}`);
  }

  return payload;
}

async function fetchObjectIds() {
  const payload = await executeQuery({
    where: WHERE_CLAUSE,
    returnIdsOnly: 'true',
    f: 'json'
  });

  if (!payload.objectIds || payload.objectIds.length === 0) {
    throw new Error('Forest Service did not return any object IDs for the PCT query.');
  }

  return payload.objectIds.sort((a, b) => a - b);
}

async function fetchFeaturesByObjectIds(ids) {
  const payload = await executeQuery({
    f: 'json',
    where: '1=1',
    objectIds: ids.join(','),
    outFields: OUT_FIELDS,
    outSR: '4326',
    returnGeometry: 'true'
  });

  if (!Array.isArray(payload.features)) {
    throw new Error('Forest Service response missing feature array.');
  }

  return payload.features;
}

function chunkArray(items, size) {
  const chunks = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

async function main() {
  console.log('Fetching Pacific Crest Trail geometry from the Forest Service EDW service...');

  const objectIds = await fetchObjectIds();
  const idChunks = chunkArray(objectIds, CHUNK_SIZE);
  const features = [];

  console.log(`Forest Service returned ${objectIds.length} feature IDs. Downloading in ${idChunks.length} chunk(s) of up to ${CHUNK_SIZE} each...`);

  for (let index = 0; index < idChunks.length; index += 1) {
    const chunk = idChunks[index];
    const pct = (((index + 1) / idChunks.length) * 100).toFixed(1);
    const rawFeatures = await fetchFeaturesByObjectIds(chunk);
    const geojsonChunk = rawFeatures.map(arcGisFeatureToGeoJson);
    features.push(...geojsonChunk);

    console.log(`Chunk ${index + 1}/${idChunks.length} complete (${pct}%): ${features.length} cumulative features.`);
  }

  const totalMiles = features.reduce((sum, feature) => sum + (feature.properties?.TRL_MILES ?? 0), 0);

  const collection = {
    type: 'FeatureCollection',
    name: 'Pacific Crest Trail — Forest Service EDW',
    metadata: {
      source: SERVICE_URL,
      where: WHERE_CLAUSE,
      generatedAt: new Date().toISOString(),
      totalFeatures: features.length,
      totalMiles
    },
    features
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(collection, null, 2));

  console.log(`Saved ${features.length} features (${totalMiles.toFixed(1)} mi) to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
