#!/usr/bin/env node
/* eslint-env node */
/* global process */
/*
 * Supabase smoke test for DDG Mission Control
 * Checks: insert/select ops_logs, upsert gear_loadouts, insert/delete custom_items.
 * Requires env: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL/SUPABASE_ANON_KEY).
 */

import { createClient } from '@supabase/supabase-js';

// Vite automatically loads .env files, but this script is executed via Node.
// To make `npm run supabase:smoke` work locally (and in simple CI contexts),
// we load env vars from .env/.env.local if they exist.
const loadDotEnvFile = async (relativePath) => {
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const envPath = path.resolve(process.cwd(), relativePath);
    if (!fs.existsSync(envPath)) return;

    const raw = fs.readFileSync(envPath, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const eq = trimmed.indexOf('=');
      if (eq <= 0) return;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();

      // Strip optional surrounding quotes.
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (process.env[key] == null) {
        process.env[key] = value;
      }
    });
  } catch {
    // Best-effort only. If this fails, the missing env check below will explain.
  }
};

await loadDotEnvFile('.env.local');
await loadDotEnvFile('.env');

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing env: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_URL/SUPABASE_ANON_KEY).');
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ts = Date.now();
const ctx = `smoke-${ts}`;
const hikerId = 'smoke-bot';

async function checkOpsLogs() {
  const { error: insertErr } = await supabase.from('ops_logs').insert({
    context_id: ctx,
    user_name: 'smoke-bot',
    content: 'smoke test entry',
    type: 'NOTE',
    status: 'OPEN',
  });
  if (insertErr) throw new Error(`ops_logs insert failed: ${insertErr.message}`);

  const { data, error: selectErr } = await supabase
    .from('ops_logs')
    .select('id, context_id, status')
    .eq('context_id', ctx)
    .limit(1);
  if (selectErr) throw new Error(`ops_logs select failed: ${selectErr.message}`);
  if (!data || data.length === 0) throw new Error('ops_logs select returned no rows');
}

async function checkGearLoadouts() {
  const payload = { hiker_id: hikerId, item_ids: ['custom:smoke-check'], updated_at: new Date().toISOString() };
  const { error } = await supabase.from('gear_loadouts').upsert(payload);
  if (error) throw new Error(`gear_loadouts upsert failed: ${error.message}`);

  const { data, error: selectErr } = await supabase
    .from('gear_loadouts')
    .select('item_ids')
    .eq('hiker_id', hikerId)
    .limit(1);
  if (selectErr) throw new Error(`gear_loadouts select failed: ${selectErr.message}`);
  if (!data || data.length === 0) throw new Error('gear_loadouts select returned no rows');
}

async function checkCustomItems() {
  const name = `Smoke Item ${ts}`;
  const { data, error: insertErr } = await supabase
    .from('custom_items')
    .insert({ name, detail: 'smoke test item', category: 'Custom', module_id: 'custom', source_ids: [], created_by: 'smoke-bot' })
    .select('id')
    .single();
  if (insertErr) throw new Error(`custom_items insert failed: ${insertErr.message}`);
  const id = data.id;

  // Clean up to avoid clutter
  const { error: deleteErr } = await supabase.from('custom_items').delete().eq('id', id);
  if (deleteErr) throw new Error(`custom_items delete failed: ${deleteErr.message}`);
}

async function main() {
  try {
    await checkOpsLogs();
    await checkGearLoadouts();
    await checkCustomItems();
    console.log('Supabase smoke test: PASS');
    process.exit(0);
  } catch (err) {
    console.error('Supabase smoke test: FAIL');
    console.error(err.message || err);
    process.exit(1);
  }
}

await main();
