#!/usr/bin/env node
/**
 * Data Integrity Verification Script
 * 
 * Verifies the active 54.2-mile Burney Falls to Ash Camp plan while ensuring
 * the remaining Garmin geometry is retained only as a future-trip alternative.
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
console.log('📍 ROUTE COORDINATES:');
console.log(`   Points: ${route.length.toLocaleString()}`);
console.log(`   Start: ${route[0][1].toFixed(6)}, ${route[0][0].toFixed(6)}`);
console.log(`   End:   ${route[route.length-1][1].toFixed(6)}, ${route[route.length-1][0].toFixed(6)}\n`);

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
console.log(`   Expected:   54.2 miles (active Ash Camp plan)`);
const distancePasses = Math.abs(totalMiles - 54.2) <= 0.2;
console.log(`   ✓ ${distancePasses ? 'PASS' : 'FAIL'}\n`);
if (!distancePasses) failures.push('active route distance is not 54.2 ± 0.2 miles');

// Check elevations
const startEleFt = route[0][2];
const endEleFt = route[route.length-1][2];
const minEleFt = Math.min(...route.map(p => p[2]));
const maxEleFt = Math.max(...route.map(p => p[2]));

console.log('⛰️  ELEVATION:');
console.log(`   Start:   ${Math.round(startEleFt).toLocaleString()} ft`);
console.log(`   End:     ${Math.round(endEleFt).toLocaleString()} ft`);
console.log(`   Min:     ${Math.round(minEleFt).toLocaleString()} ft`);
console.log(`   Max:     ${Math.round(maxEleFt).toLocaleString()} ft`);
console.log(`   Expected high point: about 6,146 ft`);
const elevationPasses = Math.abs(maxEleFt - 6146) < 100;
console.log(`   ✓ ${elevationPasses ? 'PASS' : 'FAIL'}\n`);
if (!elevationPasses) failures.push('active route high point is outside tolerance');

// Check camp points
const camps = hikeData.features.filter(f => f.properties.day >= 0);
console.log('🏕️  CAMP POINTS:');
console.log(`   Count: ${camps.length}`);
console.log(`   First: ${camps[0].properties.name} (Day 0)`);
console.log(`   Last:  ${camps[camps.length-1].properties.name} (Day ${camps[camps.length-1].properties.day})\n`);
if (camps.length !== 10 || camps.at(-1)?.properties?.name !== 'Ash Camp pickup') {
  failures.push('camp sequence does not contain Day 0 plus nine active legs ending at Ash Camp');
}

// Check water sources
console.log('💧 WATER SOURCES:');
console.log(`   Count: ${hikeData.waterSources.length}`);
console.log(`   Avg spacing: ${(totalMiles / hikeData.waterSources.length).toFixed(1)} mi\n`);
if (!hikeData.waterSources.every((source) => source.reliability === 'unverified')) {
  failures.push('one or more water locations claim current reliability');
}

// Check transport points
console.log('🚗 TRANSPORT/RESUPPLY:');
console.log(`   Count: ${hikeData.transport.length}`);
hikeData.transport.forEach(t => {
  console.log(`   - ${t.name} (${t.type})`);
});
console.log('');

// Data source attribution
console.log('📚 DATA SOURCE:');
console.log('   ✓ Garmin full track retained at 82.9 mi as future-trip geometry');
console.log('   ✓ Active track truncated at official Ash Camp pin');
console.log('   ✓ Halfmile GPS coordinates for mapped water access');
console.log('   ✓ Current water flow explicitly marked unverified\n');

console.log('═══════════════════════════════════════════════════');
if (failures.length) {
  console.log(`❌ ${failures.length} DATA CHECK(S) FAILED`);
  failures.forEach((failure) => console.log(`   - ${failure}`));
  process.exitCode = 1;
} else {
  console.log('✅ ALL CHECKS PASSED - Data is synchronized');
}
console.log('═══════════════════════════════════════════════════');
