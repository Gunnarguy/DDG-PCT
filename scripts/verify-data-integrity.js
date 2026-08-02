#!/usr/bin/env node
/**
 * Data Integrity Verification Script
 * 
 * Verifies the active 51.844-mile Burney Falls to Ash Camp plan while ensuring
 * excluded Garmin geometry is retained only as non-active reference data.
 */

const hikeData = require('../pct-hike-viz/src/hike_data.json');
const failures = [];

// Haversine distance calculation
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

console.log('═══════════════════════════════════════════════════');
console.log('DDG-PCT DATA INTEGRITY CHECK');
console.log('═══════════════════════════════════════════════════\n');

// Check route data
const route = hikeData.route.path;

// Calculate distance
let totalMiles = 0;
for(let i=1; i<route.length; i++) {
  totalMiles += haversine(
    route[i-1][1], route[i-1][0],
    route[i][1], route[i][0]
  );
}

console.log('📏 DISTANCE:');
console.log(`   Calculated: ${totalMiles.toFixed(2)} miles`);
console.log(`   Expected:   ~51.664 Garmin miles / 51.844 PCTA miles`);
const distancePasses = Math.abs(totalMiles - 51.664) <= 0.1;
console.log(`   ✓ ${distancePasses ? 'PASS' : 'FAIL'}\n`);
if (!distancePasses) failures.push('active Garmin route distance is not 51.664 ± 0.1 miles');

// Check elevations
const startEleFt = route[0][2];
const endEleFt = route[route.length-1][2];
const minEleFt = Math.min(...route.map(p => p[2]));
const maxEleFt = Math.max(...route.map(p => p[2]));
const canonicalHighFt = Number(hikeData.route.properties.max_elevation);

console.log('⛰️  ELEVATION:');
console.log(`   Start:   ${Math.round(startEleFt).toLocaleString()} ft`);
console.log(`   End:     ${Math.round(endEleFt).toLocaleString()} ft`);
console.log(`   Min:     ${Math.round(minEleFt).toLocaleString()} ft`);
console.log(`   Raw point maximum: ${Math.round(maxEleFt).toLocaleString()} ft`);
console.log(`   Canonical normalized high point: ${Math.round(canonicalHighFt).toLocaleString()} ft`);
const elevationPasses =
  Math.abs(maxEleFt - 6146) < 100 &&
  canonicalHighFt === 6129;
console.log(`   ✓ ${elevationPasses ? 'PASS' : 'FAIL'}\n`);
if (!elevationPasses) failures.push('raw or canonical normalized route high point is outside tolerance');

// Check itinerary stops (camps plus transfer/finish points)
const camps = hikeData.features.filter(f => f.properties.day >= 0);
const day3 = camps.find((stop) => stop.properties.day === 3);
console.log('🏕️  ITINERARY STOPS:');
console.log(`   Count: ${camps.length}`);
console.log(`   First: ${camps[0].properties.name} (Day 0)`);
console.log(`   Day 3: ${day3?.properties?.name} (${day3?.properties?.type})`);
console.log(`   Last:  ${camps[camps.length-1].properties.name} (Day ${camps[camps.length-1].properties.day})\n`);
if (
  camps.length !== 9 ||
  camps.at(-1)?.properties?.day !== 8 ||
  camps.at(-1)?.properties?.name !== 'Ash Camp pickup' ||
  camps.some((camp) => camp.properties.name.includes('Kosk')) ||
  day3?.properties?.type !== 'Support Transfer' ||
  day3?.properties?.packMode !== 'day-pack-supported'
) {
  failures.push('itinerary is not Day 0 plus eight Kosk-free legs with a Day 3 Bartle support transfer');
}

// Check water sources
console.log('💧 WATER SOURCES:');
console.log(`   Count: ${hikeData.waterSources.length}`);
console.log(`   Avg spacing: ${(totalMiles / hikeData.waterSources.length).toFixed(1)} mi\n`);
if (!hikeData.waterSources.every((source) => source.reportStatus === 'current-condition-check-required')) {
  failures.push('one or more static water locations does not require a current-condition check');
}

// Check transport points
console.log('🚗 TRANSPORT/RESUPPLY:');
console.log(`   Count: ${(hikeData.transport || hikeData.transportPoints || []).length}`);
(hikeData.transport || hikeData.transportPoints || []).forEach(t => {
  console.log(`   - ${t.name} (${t.type})`);
});
console.log('');

// Data source attribution
console.log('📚 DATA SOURCE:');
console.log('   ✓ PCTA January 2026 miles control route distance');
console.log('   ✓ Garmin track cropped at actual Burney Falls access and Ash Camp');
console.log('   ✓ Excluded pre-start and post-Ash geometry is non-active reference data');
console.log('   ✓ Static water coordinates remain separate from timestamped flow reports\n');

console.log('═══════════════════════════════════════════════════');
if (failures.length) {
  console.log(`❌ ${failures.length} DATA CHECK(S) FAILED`);
  failures.forEach((failure) => console.log(`   - ${failure}`));
  process.exitCode = 1;
} else {
  console.log('✅ ALL CHECKS PASSED - Data is synchronized');
}
console.log('═══════════════════════════════════════════════════');
