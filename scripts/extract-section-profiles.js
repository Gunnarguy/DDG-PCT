#!/usr/bin/env node
/**
 * Extract lightweight elevation profiles from section GPX files
 * Strategy: Sample every ~100th point to keep bundle size tiny while preserving shape
 * Output: Compressed JSON with just [distance, elevation] pairs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// Section metadata from the comprehensive analysis
const SECTION_META = {
  'Section E': {
    id: 'section-e',
    name: 'Section E: CA Sierra Foothills',
    state: 'California',
    region: 'Southern Sierra',
    status: 'rejected',
    reason: 'High fire risk + extreme heat in September',
    riskFactors: ['🔥 Wildfire corridor', '🌡️ 95°F+ temps', '💧 Long waterless stretches'],
    verdict: 'Too hot, too dry, too risky'
  },
  'Section G': {
    id: 'section-g',
    name: 'Section G: CA High Sierra',
    state: 'California',
    region: 'High Sierra',
    status: 'rejected',
    reason: 'Extreme altitude (12,000-13,000ft) requires multi-day acclimatization',
    riskFactors: ['🏔️ AMS risk at 13,000ft', '❄️ Early snow possible', '🥶 Freezing nights'],
    verdict: 'Dad-knee destroyer + altitude risk'
  },
  'Section I': {
    id: 'section-i',
    name: 'Section I: CA Yosemite',
    state: 'California',
    region: 'Yosemite / Tuolumne',
    status: 'rejected',
    reason: 'Permit lottery nightmare + high altitude',
    riskFactors: ['🎟️ Impossible permits', '⛰️ 9,000-11,000ft elevation', '🐻 Heavy bear activity'],
    verdict: 'Logistical impossibility'
  },
  'Section J': {
    id: 'section-j',
    name: 'Section J: CA Northern Sierra',
    state: 'California',
    region: 'Northern Sierra',
    status: 'rejected',
    reason: 'Fire + heat + long dry stretches',
    riskFactors: ['🔥 Active fire zone', '🌵 Hat Creek Rim (30mi dry)', '☀️ Exposed ridges'],
    verdict: 'September fire gauntlet'
  },
  'Section O': {
    id: 'section-o',
    name: 'Section O: Burney Falls → Castle Crags',
    state: 'California',
    region: 'Shasta-Trinity NF',
    status: 'winner',
    reason: 'Perfect elevation (4k-6k ft), spectacular scenery, low risk',
    riskFactors: ['✓ Moderate altitude only', '✓ No permit lottery', '✓ Good water access'],
    verdict: 'The Goldilocks Zone',
    highlights: [
      'Burney Falls waterfall start',
      'Castle Crags granite spires',
      'Mt. Shasta views',
      'Self-issued permits only',
      '70+ mile cell-free wilderness'
    ]
  }
};

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function extractProfile(gpxPath, sampleRate = 100) {
  const gpxContent = fs.readFileSync(gpxPath, 'utf-8');
  const data = await parseStringPromise(gpxContent);
  
  const points = data.gpx.trk[0].trkseg[0].trkpt;
  const profile = [];
  let cumulativeDistance = 0;
  
  // Always include first point
  const firstPt = points[0];
  const firstLat = parseFloat(firstPt.$.lat);
  const firstLon = parseFloat(firstPt.$.lon);
  const firstEle = parseFloat(firstPt.ele[0]);
  profile.push([0, firstEle]);
  
  let lastLat = firstLat;
  let lastLon = firstLon;
  
  // Sample every Nth point
  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    const lat = parseFloat(pt.$.lat);
    const lon = parseFloat(pt.$.lon);
    const ele = parseFloat(pt.ele[0]);
    
    const segmentDist = haversineDistance(lastLat, lastLon, lat, lon);
    cumulativeDistance += segmentDist;
    
    lastLat = lat;
    lastLon = lon;
    
    // Sample this point?
    if (i % sampleRate === 0 || i === points.length - 1) {
      profile.push([
        Math.round(cumulativeDistance / 1609.34 * 10) / 10, // miles, 1 decimal
        Math.round(ele * 3.28084) // meters to feet, no decimals
      ]);
    }
  }
  
  return profile;
}

async function calculateStats(profile) {
  let gain = 0;
  let loss = 0;
  let minEle = Infinity;
  let maxEle = -Infinity;
  
  for (let i = 0; i < profile.length; i++) {
    const ele = profile[i][1];
    minEle = Math.min(minEle, ele);
    maxEle = Math.max(maxEle, ele);
    
    if (i > 0) {
      const diff = ele - profile[i - 1][1];
      if (diff > 0) gain += diff;
      else loss += Math.abs(diff);
    }
  }
  
  return {
    distance: profile[profile.length - 1][0],
    minElevation: minEle,
    maxElevation: maxEle,
    elevationGain: Math.round(gain),
    elevationLoss: Math.round(loss)
  };
}

async function main() {
  const sections = ['Section E', 'Section G', 'Section I', 'Section J', 'Section O'];
  const output = {};
  
  for (const sectionName of sections) {
    const sectionDir = path.join(ROOT_DIR, sectionName);
    
    // Find the size 3 or 4 GPX (good balance of detail vs size)
    const files = fs.readdirSync(sectionDir);
    const targetFile = files.find(f => f.includes('size 3') || f.includes('size 4'));
    
    if (!targetFile) {
      console.warn(`No suitable GPX found for ${sectionName}`);
      continue;
    }
    
    const gpxPath = path.join(sectionDir, targetFile);
    console.log(`Processing ${sectionName}: ${targetFile}`);
    
    const profile = await extractProfile(gpxPath, 100); // Sample every 100th point
    const stats = await calculateStats(profile);
    const meta = SECTION_META[sectionName];
    
    output[meta.id] = {
      ...meta,
      stats,
      profile,
      sourceFile: targetFile
    };
    
    console.log(`  → ${profile.length} points, ${stats.distance.toFixed(1)} mi, ${stats.elevationGain.toLocaleString()}' gain`);
  }
  
  const outputPath = path.join(ROOT_DIR, 'pct-hike-viz', 'src', 'data', 'sectionProfiles.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`\n✅ Wrote ${Object.keys(output).length} section profiles to ${outputPath}`);
  console.log(`📦 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
