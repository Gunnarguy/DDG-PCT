#!/usr/bin/env node
/**
 * Cross-checks the planContent.js waterSources list against the official
 * "PCT Water Report -- Northern California" CSV. Highlights entries that
 * drift on mileage or have no nearby counterpart so we can fix the itinerary.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { dayItinerary, sectionOMeta } from '../pct-hike-viz/src/data/planContent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvPath = path.resolve(__dirname, '..', 'PCT Water5_ NorCal - Northern CA.csv');

// Generic nouns we strip before token comparisons so we match on distinct names.
const STOPWORDS = new Set([
  'creek', 'spring', 'camp', 'campground', 'crossing', 'bridge', 'trail', 'junction',
  'seasonal', 'small', 'lake', 'river', 'water', 'source', 'sources', 'outlet',
  'campground', 'campground', 'park', 'vista', 'camp', 'upper', 'lower', 'fork',
  'camp', 'campgrounds', 'jct'
]);

const normalize = (value) => value
  .toLowerCase()
  .replace(/\(.*?\)/g, ' ')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokenize = (value) => {
  if (!value) return [];
  return normalize(value).split(' ').filter(Boolean);
};

const essentialTokens = (tokens) => {
  const filtered = tokens.filter(token => !STOPWORDS.has(token));
  return filtered.length ? filtered : tokens;
};

const relativeMile = (raw) => {
  if (!raw) return null;
  const match = raw.match(/(\d+(?:\.\d+)?)\s*mi/i);
  return match ? parseFloat(match[1]) : null;
};

const lines = (await fs.readFile(csvPath, 'utf8')).split(/\r?\n/);
const headerIndex = lines.findIndex(line => line.startsWith('Map,'));
if (headerIndex === -1) {
  throw new Error('Unable to find CSV header row ("Map,Mile,...").');
}
const csvBody = lines.slice(headerIndex).join('\n');
const records = parse(csvBody, { columns: true, skip_empty_lines: true });

const csvSources = records
  .map((row, idx) => ({
    idx,
    mile: row.Mile ? parseFloat(row.Mile) : null,
    location: (row.Location || '').trim(),
    tokens: essentialTokens(tokenize(row.Location || ''))
  }))
  .filter(row => row.mile && row.mile >= sectionOMeta.pctMileStart - 10 && row.mile <= sectionOMeta.pctMileEnd + 10);

let currentMile = sectionOMeta.pctMileStart;
const planEntries = [];

dayItinerary
  .filter(day => day.type === 'hike')
  .forEach(day => {
    const dayStart = currentMile;
    (day.waterSources || []).forEach(source => {
      const rel = relativeMile(source);
      const approxMile = typeof rel === 'number' ? Number((dayStart + rel).toFixed(2)) : null;
      const tokens = essentialTokens(tokenize(source.split('(')[0]));
      planEntries.push({
        day: day.label,
        raw: source,
        approxMile,
        relMile: rel,
        tokens
      });
    });
    currentMile += day.distance;
  });

const overlapScore = (planTokens, csvTokens) => {
  if (!planTokens.length || !csvTokens.length) {
    return { overlap: 0, coverage: 0 };
  }
  const overlap = planTokens.filter(token => csvTokens.includes(token)).length;
  return { overlap, coverage: overlap / planTokens.length };
};

const matchedCsv = new Set();
const results = planEntries.map(entry => {
  let bestMatch = null;
  let bestScore = -Infinity;

  csvSources.forEach(source => {
    const { overlap, coverage } = overlapScore(entry.tokens, source.tokens);
    let tokenScore = 0;
    if (coverage === 1) tokenScore = 2;
    else if (coverage >= 0.5) tokenScore = 1;

    let mileScore = 0;
    let delta = null;
    if (typeof entry.approxMile === 'number' && typeof source.mile === 'number') {
      delta = Math.abs(entry.approxMile - source.mile);
      if (delta <= 0.3) mileScore = 2;
      else if (delta <= 0.75) mileScore = 1;
    }

    const totalScore = tokenScore + mileScore + (coverage >= 0.5 ? 0.25 : 0);
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMatch = {
        ...source,
        overlap,
        coverage,
        mileScore,
        tokenScore,
        delta
      };
    }
  });

  let status = 'missing';
  if (bestMatch) {
    if (bestMatch.tokenScore === 2 && bestMatch.mileScore >= 1) {
      status = 'match';
    } else if (bestMatch.tokenScore >= 1 || bestMatch.mileScore >= 1) {
      status = 'review';
    }

    if (status !== 'missing') {
      matchedCsv.add(bestMatch.idx);
    }
  }

  return {
    ...entry,
    bestMatch,
    status
  };
});

const missing = results.filter(r => r.status === 'missing');
const review = results.filter(r => r.status === 'review');
const matches = results.filter(r => r.status === 'match');

console.log('══════════════════════════════════════════════════════════');
console.log('DDG Section O Water Source Validation');
console.log('══════════════════════════════════════════════════════════');
console.log(`CSV Report: ${path.basename(csvPath)}`);
console.log(`Plan Coverage: PCT miles ${sectionOMeta.pctMileStart} – ${sectionOMeta.pctMileEnd}`);
console.log('----------------------------------------------------------');

const tableRows = results.map(result => ({
  Day: result.day,
  Source: result.raw,
  'Plan Mile': result.approxMile?.toFixed?.(2) ?? 'n/a',
  'Report Mile': result.bestMatch?.mile?.toFixed?.(2) ?? 'n/a',
  'Δmile': result.bestMatch?.delta?.toFixed?.(2) ?? '—',
  Status: result.status
}));

console.table(tableRows);

console.log('Summary:');
console.log(`  ✓ Matches:     ${matches.length}`);
console.log(`  ~ Review:      ${review.length}`);
console.log(`  ✗ Missing:     ${missing.length}`);

if (review.length) {
  console.log('\nNeeds review (token or mile mismatch):');
  review.forEach(item => {
    console.log(`- ${item.day}: ${item.raw} → CSV: ${item.bestMatch?.location || 'n/a'} @ mile ${item.bestMatch?.mile ?? 'n/a'} (Δ ${item.bestMatch?.delta?.toFixed?.(2) ?? '—'} mi, coverage ${(item.bestMatch?.coverage * 100).toFixed(0)}%)`);
  });
}

if (missing.length) {
  console.log('\nMissing (no close match found in report):');
  missing.forEach(item => {
    console.log(`- ${item.day}: ${item.raw}`);
  });
}

const unusedCsv = csvSources
  .filter(source => !matchedCsv.has(source.idx) && source.mile >= sectionOMeta.pctMileStart && source.mile <= sectionOMeta.pctMileEnd)
  .slice(0, 10);

if (unusedCsv.length) {
  console.log('\nReport sources in range not referenced in plan (first 10):');
  unusedCsv.forEach(source => {
    console.log(`- Mile ${source.mile.toFixed(1)}: ${source.location}`);
  });
}

if (missing.length > 0 || review.length > 0) {
  process.exitCode = 1;
}
