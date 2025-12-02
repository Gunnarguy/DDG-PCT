#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VIZ_SRC = path.join(ROOT, 'pct-hike-viz', 'src');
const REAL_DATA = path.join(VIZ_SRC, 'hike_data.json');
const PLACEHOLDER_DATA = path.join(VIZ_SRC, 'hike_data.placeholder.json');

if (!fs.existsSync(REAL_DATA)) {
  console.log('⚠️  hike_data.json not found.');
  if (fs.existsSync(PLACEHOLDER_DATA)) {
    console.log('📋 Copying placeholder data to hike_data.json...');
    fs.copyFileSync(PLACEHOLDER_DATA, REAL_DATA);
    console.log('✅ Done. The app will run in DEMO mode.');
    console.log('   To use real data, place your generated hike_data.json in pct-hike-viz/src/');
  } else {
    console.error('❌ Error: hike_data.placeholder.json is also missing!');
    process.exit(1);
  }
} else {
  console.log('✅ hike_data.json exists. Ready to go.');
}
