#!/usr/bin/env node
/* eslint-env node */
/**
 * Provision a Supabase Auth user (Admin API) so magic-link sign-in can work
 * even when client-side signups are disabled.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/provision_auth_user.js smileyguy@aol.com
 *
 * Env:
 *   SUPABASE_URL or VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (DO NOT commit)
 */

import { createClient } from "@supabase/supabase-js";
import process from "node:process";

const email = (process.argv[2] || "").trim().toLowerCase();

if (!email) {
  console.error("Usage: node scripts/provision_auth_user.js <email>");
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
    "Missing env. Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {},
    });

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("already") && msg.includes("registered")) {
        console.log(`User already exists: ${email}`);
        process.exit(0);
      }
      throw error;
    }

    console.log(`Created user: ${data.user.id} (${data.user.email})`);
    console.log("They can now request a magic link and sign in.");
    process.exit(0);
  } catch (err) {
    console.error("Provision user: FAIL");
    console.error(err?.message || err);
    console.error(
      "Tips: confirm SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set, and that the key is the service_role (not anon)."
    );
    process.exit(1);
  }
}

await main();
