# Supabase MCP smoke checklist (tnqvxjtqvmmacrfqpelj)

Use the hosted endpoint (project-scoped):

```
https://mcp.supabase.com/mcp?project_ref=tnqvxjtqvmmacrfqpelj
```

Prefer read-only for routine checks:

```
https://mcp.supabase.com/mcp?project_ref=tnqvxjtqvmmacrfqpelj&read_only=true
```

## Quick client config (generic JSON)
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=tnqvxjtqvmmacrfqpelj&read_only=true"
    }
  }
}
```

## Smoke steps (safe)
1) **Docs**: `search_docs` with `"realtime"` or `"RLS"` → expect markdown.
2) **Schema**: `list_tables` (default schemas) → verify core tables present (`ops_logs`, `gear_loadouts`, etc.).
3) **Keys**: `get_publishable_keys` → returns anon/publishable keys (client-safe).
4) **Project URL**: `get_project_url` → matches `.env`.
5) **Advisors**: `get_advisors` (security/perf) → capture actions if any.
6) **Logs**: `get_logs` with `service="api"` (or `"postgres"`, `"realtime"`) → sanity-check recent activity.

## When writes are needed (drop read_only only temporarily)
- **Migrations**: `apply_migration` with SQL (DDL only); revert to read-only afterward.
- **SQL**: `execute_sql` for ad-hoc SELECTs. Avoid writes in prod; prefer dev/branch.
- **Edge Functions**: `deploy_edge_function` (only if you intend to update functions).
- **Branching**: `create_branch` / `merge_branch` (paid/experimental) — use with care.

## Feature narrowing examples
- Only docs + database + debugging:
  `https://mcp.supabase.com/mcp?project_ref=tnqvxjtqvmmacrfqpelj&features=docs,database,debugging&read_only=true`
- Add storage tools:
  append `storage` to `features`.

## Safety defaults
- Keep manual approval of tool calls enabled in your client.
- Use dev/branch data; avoid production.
- Prefer `read_only=true` unless actively changing schema.
- Scope with `project_ref` (already set above).

## If OAuth window fails
- Some clients allow headers: set `Authorization: Bearer <PAT>` pointing at the same URL (still scoped). Use only in CI or when OAuth is blocked.
