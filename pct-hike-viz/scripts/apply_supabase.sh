#!/usr/bin/env bash
set -euo pipefail

# Apply Supabase schema + RLS/policies for DDG Mission Control (idempotent).
# Usage:
#   ./scripts/apply_supabase.sh          # applies combined schema (tables, publication, seed, RLS, policies)
#
# Supports two backends:
# 1) psql with SUPABASE_DB_URL env (recommended if CLI lacks execute)
# 2) supabase CLI with db execute (if available in your version)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMBINED_FILE="$ROOT_DIR/supabase/combined.sql"

run_with_psql() {
  if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
    echo "SUPABASE_DB_URL not set; cannot run psql path." >&2
    return 1
  fi
  if ! command -v psql >/dev/null 2>&1; then
    echo "psql not found; install Postgres client or set up supabase CLI execute." >&2
    return 1
  fi
  echo "Applying combined schema via psql (tables, publication, seed, RLS, policies)..."
  psql "$SUPABASE_DB_URL" -f "$COMBINED_FILE"
}

run_with_supabase_cli() {
  if ! command -v supabase >/dev/null 2>&1; then
    echo "Supabase CLI not found." >&2
    return 1
  fi
  echo "Applying combined schema via supabase CLI (tables, publication, seed, RLS, policies)..."
  # Some CLI versions support db execute --file; others do not. If this fails, use psql path.
  supabase db execute --file "$COMBINED_FILE"
}

if run_with_psql; then
  echo "Done via psql."
  exit 0
fi

echo "psql path unavailable or failed; trying Supabase CLI..."
if run_with_supabase_cli; then
  echo "Done via Supabase CLI."
  exit 0
fi

echo "Both psql and Supabase CLI execution paths failed. Please either set SUPABASE_DB_URL and install psql, or upgrade Supabase CLI to a version with 'supabase db execute'." >&2
exit 1