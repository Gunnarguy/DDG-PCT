# Supabase MCP quick-start (for this app)

This app uses Supabase for realtime chat, OpsLog, and content syncing. MCP can accelerate ops by letting AI assistants manage Supabase safely. Use the hosted HTTP MCP server unless you explicitly need local CLI testing.

## Endpoints & transports
- Remote (recommended): `https://mcp.supabase.com/mcp`
- Local Supabase CLI: `http://localhost:54321/mcp` (limited tools, no OAuth 2.1)
- Self-hosted: enable MCP per Supabase self-host docs (limited tools, no OAuth 2.1)
- Legacy stdio (not recommended): `npx -y @supabase/mcp-server-supabase@latest --access-token <PAT>`

## Minimal client configs
- Generic HTTP config:
  ```json
  {
    "mcpServers": {
      "supabase": { "type": "http", "url": "https://mcp.supabase.com/mcp" }
    }
  }
  ```
- Cursor one-click: `cursor://anysphere.cursor-deeplink/mcp/install?name=supabase&config=eyJ1cmwiOiJodHRwczovL21jcC5zdXBhYmFzZS5jb20vbWNwIn0%3D`

## Recommended URL options (query params)
- `project_ref=<project>` — scope to one project (recommended).
- `read_only=true` — enforce read-only Postgres role; disables mutating tools (apply/merge/deploy/etc.).
- `features=database,docs,...` — enable specific feature groups. Defaults: account, database, debugging, development, docs, functions, branching; storage is off by default.

Examples:
- Scoped + read-only: `https://mcp.supabase.com/mcp?project_ref=<ref>&read_only=true`
- Scoped + limited tools: `https://mcp.supabase.com/mcp?project_ref=<ref>&features=database,docs,debugging`

## Auth flows
- Default: browser-based OAuth (dynamic client registration) — no PAT required.
- CI/manual: PAT via `Authorization: Bearer <token>` header if client supports custom headers.
- Clients needing client_id/secret: create OAuth app in Supabase org and supply credentials.

## Tool groups (high level)
- Account: list/create projects/orgs, pause/restore (disabled when project scoped).
- Docs: `search_docs` (latest Supabase docs).
- Database: `list_tables`, `list_extensions`, `list_migrations`, `apply_migration`, `execute_sql`.
- Debugging: `get_logs`, `get_advisors` (security/perf advisors).
- Development: `get_project_url`, `get_publishable_keys`, `generate_typescript_types`.
- Edge Functions: list/get/deploy.
- Branching: create/list/delete/merge/reset/rebase (paid/experimental).
- Storage (opt-in): `list_storage_buckets`, `get_storage_config`, `update_storage_config`.

## Security best practices
- Use a dev or branch database; avoid production.
- Keep manual approval of tool calls on in the client.
- Always scope with `project_ref`; default to `read_only=true` unless writes are required.
- Limit exposed tools with `features` to reduce attack surface.
- Stay alert to prompt injection; review tool results before chaining actions.

## Troubleshooting
- Too many tools for client limits: narrow with `features`.
- Missing account tools: remove `project_ref` (or note they’re intentionally disabled when scoped).
- OAuth window blocked: use PAT header as fallback if client supports it.
- Local CLI missing OAuth: expected; local transport is limited.

## Links
- Getting started: https://supabase.com/docs/guides/getting-started/mcp
- Remote MCP blog: https://supabase.com/blog/remote-mcp-server
- Launch post: https://supabase.com/blog/mcp-server
- GitHub README (tools/options): https://github.com/supabase-community/supabase-mcp
