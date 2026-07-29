# DDG · Burney Falls ➜ Ash Camp Mission Control

> [!IMPORTANT]
> [The 2026 trip source of truth](../docs/2026-trip-source-of-truth.md)
> controls the generated route and itinerary. Current field conditions are
> timestamped separately in Supabase and retain explicit manual-verification
> states where no authoritative machine-readable status exists.

This Vite + React application is the planning surface for the active
**51.844-official-mile, eight-day** trip from Burney Falls to Ash Camp,
August 29–September 5, 2026, with September 6 reserved as contingency. The
supplied Garmin source course measures 80.826 miles; the existing 82.898-mile
legacy app crop is a different reference geometry. Both are excluded from
active metrics.

## How the NST Guide repos show up here

| Repo | How it is used |
| ---- | -------------- |
| [`nst-guide/web`](https://github.com/nst-guide/web) | Architecture inspiration. The app pairs `react-map-gl` + `deck.gl` just like the reference site, enabling rich overlays alongside MapLibre-powered basemaps. |
| [`nst-guide/osm-liberty-topo`](https://github.com/nst-guide/osm-liberty-topo) | All basemap styles are pulled directly from this repo (`style.json`, `style-hybrid.json`, `style-aerial.json`, `style-fstopo.json`). The UI lets you toggle among them on the fly. |
| [`nst-guide/openmaptiles`](https://github.com/nst-guide/openmaptiles) | Vector tiles served through the Liberty style (and ultimately `tiles.nst.guide`) originate from this fork. That means trails, roads, and labels reflect the custom schema. |
| [`nst-guide/terrain`](https://github.com/nst-guide/terrain) | The hillshade + Terrain RGB layers referenced inside the Liberty styles come from this repo’s elevation pipeline. |
| [`nst-guide/naip`](https://github.com/nst-guide/naip) | The Hybrid/Aerial style toggles bring NAIP imagery online. |
| [`nst-guide/fstopo`](https://github.com/nst-guide/fstopo) | The “Liberty + USFS Topo” style overlays FSTopo quads for USFS map fidelity. |
| [`nst-guide/data`](https://github.com/nst-guide/data) | The planning sidebar references plan-ready GeoJSON that mirrors what the data repo produces (route segments, towns, water intel). The structure is ready to swap with live API tiles from `tiles.nst.guide`. |

## Guided tour

* **Deck.gl route layer** – multicolor segments show the active GPS-derived daily mileage.
* **Interactive markers** – tap camps, the Bartle support transfer, or pickups to view day-specific notes, terrain, water, and verification requirements.
* **Schedule context** – eight hiking days are active; September 6 is contingency and the longer route is future reference only.
* **Travel, food carry, permits, and extraction** – Day 3 uses an exact Bartle Gap pickup/re-entry; the trip ends at the official Ash Camp pin on rough FS Road 38N11.

## Getting started

```bash
cd pct-hike-viz
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`) and start exploring. Build with `npm run build` for a production bundle (expect large chunks because of MapLibre + deck.gl).

### Supabase setup (realtime ops log + gear)

1) Supabase config is read from env vars at dev/build time. Copy `.env.example` → `.env` and restart `npm run dev`.
	- `.env.example` ships with the live DDG publishable values and is also used by the GitHub Pages workflow during CI.
	- The original DDG Supabase project was paused; the current values target the restored replacement project.
	- The app code intentionally has **no** hardcoded Supabase fallback: if `.env` is missing, it runs in offline mode.
	- If you fork this repo, replace the Supabase URL + anon key with your own project values.
2) Fast path (idempotent): `npm run supabase:apply` — this runs `supabase/combined.sql` (tables, publication, seed loadouts, RLS enabled, permissive anon policies).
	- Uses `psql` if `SUPABASE_DB_URL` is set; falls back to Supabase CLI `db execute`. If both are missing, paste `supabase/combined.sql` into the SQL editor.
	- **Security Note:** Team access emails are no longer hardcoded in `combined.sql`. Add emails directly via the Supabase Dashboard (`allowed_emails` table) or use `npm run supabase:seed-emails` (requires `ALLOWED_EMAILS_SEED` environment variable).
3) Smoke check: `npm run supabase:smoke` (uses anon key) inserts/reads `ops_logs`, upserts a `gear_loadouts` row (`smoke-bot`), and inserts/deletes a `custom_items` row.
4) Verify manually: in SQL editor `select id, type, status, context_id from ops_logs limit 5;` — you should see `status` defaulting to `OPEN`.

### Supabase MCP (AI assistant bridge)

If you want AI assistants (e.g., Cursor/Claude Code) to manage Supabase safely, use the hosted MCP server. See `docs/supabase-mcp.md` for quick setup, scoping, read-only defaults, feature-group narrowing, and safety tips. The current project-ref-scoped URL for this app is:

```
https://mcp.supabase.com/mcp?project_ref=wpeyvbhhfqcyhuszumtx
```

## Data sources

* `public/data/hike_data.json` – Canonical runtime data: the active route to Ash Camp, a separately stored future-route tail, documented camps, exact Halfmile water-access coordinates, and driving snapshots. `src/hike_data.json` is a tooling mirror.
* `src/data/tripFacts.js` – Canonical dates, mileage, itinerary legs, and extraction facts.
* `src/data/planContent.js` – Structured logistics, food carry, permits, historical source notes, and research links.

Water points are locations, not guarantees of flow. The app deliberately marks current flow as unverified until the team checks a live report immediately before the trip.
