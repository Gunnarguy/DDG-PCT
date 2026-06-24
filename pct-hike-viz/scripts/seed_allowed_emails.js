#!/usr/bin/env node
/* eslint-env node */
/**
 * Seed the `allowed_emails` table for DDG team access control without hardcoding PII.
 *
 * Usage:
 *   ALLOWED_EMAILS_SEED='[{"email":"test@example.com","hiker_id":"test","name":"Test","role":"member"}]' \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/seed_allowed_emails.js
 *
 * Env:
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (DO NOT commit)
 *   ALLOWED_EMAILS_SEED (JSON string array of objects)
 */

import { createClient } from "@supabase/supabase-js";
import process from "node:process";

const seedData = process.env.ALLOWED_EMAILS_SEED;

if (!seedData) {
  console.error(
    "Usage: Provide ALLOWED_EMAILS_SEED environment variable as a JSON string.",
  );
  console.error(
    'Example: \'[{"email":"test@example.com","hiker_id":"test","name":"Test","role":"member"}]\'',
  );
  process.exit(1);
}

const loadDotEnvFile = async (relativePath) => {
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");

    const envPath = path.resolve(process.cwd(), relativePath);
    if (!fs.existsSync(envPath)) return;

    const raw = fs.readFileSync(envPath, "utf8");
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const eq = trimmed.indexOf("=");
      if (eq <= 0) return;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (process.env[key] == null) {
        process.env[key] = value;
      }
    });
  } catch {
    // Best-effort only.
  }
};

await loadDotEnvFile(".env.local");
await loadDotEnvFile(".env");

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Missing env. Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

let parsedSeed = [];
try {
  parsedSeed = JSON.parse(seedData);
  if (!Array.isArray(parsedSeed)) {
    throw new Error("Seed data must be a JSON array.");
  }
} catch (e) {
  console.error("Failed to parse ALLOWED_EMAILS_SEED:", e.message);
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  try {
    console.log(`Attempting to seed ${parsedSeed.length} emails...`);

    const { data, error } = await supabase
      .from("allowed_emails")
      .upsert(parsedSeed, { onConflict: "email" })
      .select("email");

    if (error) {
      throw error;
    }

    console.log(`Successfully seeded ${data.length} emails.`);
    process.exit(0);
  } catch (err) {
    console.error("Seed emails: FAIL");
    console.error(err?.message || err);
    process.exit(1);
  }
}

await main();
