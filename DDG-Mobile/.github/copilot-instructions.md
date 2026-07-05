# DDG-Mobile · Copilot Instructions

## Project Overview

Native iOS app for the DDG team's Burney Falls → Castle Crags PCT section hike. Offline-first mission control migrated from `DDG-PCT` web app (React/Vite/MapLibre).

**Bundle ID:** `Gunndamental.DDG-Mobile`
**Target:** iOS 26.0+ / macOS 26.0+ / visionOS 26.0+
**Swift:** 6.0 with strict concurrency (`SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor`)

## Architecture

```
DDG-Mobile/
├── DDG_MobileApp.swift          # @main entry, SwiftData container, sync wiring
├── ContentView.swift            # 8-tab TabView + network status indicator
├── Models/
│   ├── OpsLogEntry.swift        # Ops log with auto-classification + sync status
│   ├── GearModels.swift         # GearLoadout + CustomItem with weight normalization
│   ├── TrailModels.swift        # TrailPoint, CampSite, WaterSource (from hike_data.json)
│   ├── CacheModels.swift        # WildfireCache, AirQualityCache (4hr TTL)
│   └── TeamConfig.swift         # DDGTeam roster, allowed emails, day colors
├── Views/
│   ├── MissionView.swift        # Overview, stats grid, team cards
│   ├── PrepView.swift           # Permits checklist, pre-trip items
│   ├── TrailMapView.swift       # MapKit Map + MapPolyline + camp annotations
│   ├── ElevationProfileView.swift # Swift Charts elevation profile with altitude zones
│   ├── ItineraryView.swift      # Day-by-day schedule from CampSite data
│   ├── SafetyView.swift         # Wildfire, altitude zones, connectivity, emergency
│   ├── GearPlannerView.swift    # RPG loadout builder per hiker
│   ├── OpsLogView.swift         # Realtime ops log with auto-classify + sync badges
│   └── InfoView.swift           # Transit, airports, parking, resupply, satellites
├── Services/
│   ├── NetworkMonitor.swift     # NWPathMonitor singleton, reconnect callback
│   ├── SupabaseManager.swift    # Client config stub (add supabase-swift via SPM)
│   ├── SyncEngine.swift         # Offline-first sync actor with exponential backoff
│   ├── WildfireService.swift    # NIFC ArcGIS + EPA AirNow with URLSession
│   └── HikeDataIngestor.swift   # First-launch JSON → SwiftData parser
├── Data/
│   ├── ConnectivityData.swift   # 8 cell coverage zones + 5 satellite devices
│   ├── TrailConstants.swift     # Altitude zones, grade ratings, Naismith's rule
│   └── TransitData.swift        # Transit routes, shuttles, airports, parking, resupply
└── Resources/
    └── hike_data.json           # 867KB bundled trail data (46k+ points, camps, routes)
```

## Key Patterns

| Pattern | Implementation |
|---------|---------------|
| Offline-first | All writes → SwiftData first, sync queue drains when `NWPathMonitor` says connected |
| Sync status | Every syncable model has `SyncStatus` enum: `.local` → `.syncing` → `.synced` / `.conflicted` |
| Data ingest | `HikeDataIngestor` runs once on first launch; checks `TrailPoint` count to skip re-parse |
| Background sync | `SyncEngine.shared` wired to `NetworkMonitor.onReconnect` + BGAppRefreshTask |
| Auto-classify | `OpsLogEntry.classify()` mirrors web: `/task` → TASK+OPEN, "alert"/"warning" → ALERT |
| Team auth | `DDGTeam.allowedEmails` hardcoded (3 members, 4 emails) — will auth via Sign in with Apple |

## Essential Commands

```bash
# Build from CLI (requires Xcode 26.3+)
xcodebuild -project DDG-Mobile.xcodeproj -scheme DDG-Mobile -sdk iphonesimulator build

# Open in Xcode
open DDG-Mobile.xcodeproj
```

## SPM Dependencies (add in Xcode)

After opening the project, add via File → Add Package Dependencies:

| Package | URL | Version |
|---------|-----|---------|
| supabase-swift | `https://github.com/supabase/supabase-swift.git` | from `2.0.0` |

## Content Sourcing

| iOS File | Web Source | Notes |
|----------|-----------|-------|
| `ConnectivityData.swift` | `connectivityData.js` | 8 zones, 5 satellite devices — manually ported |
| `TransitData.swift` | `transitService.js` | 6 routes, airports, parking, resupply — manually ported |
| `TrailConstants.swift` | `ElevationProfile.jsx` | Altitude zones, grade ratings, Naismith constants |
| `TeamConfig.swift` | `supabase.js` | Team roster, allowed emails |
| `Resources/hike_data.json` | `src/hike_data.json` | Direct copy, parsed by HikeDataIngestor |

## Migration Reference

See `MIGRATION-PLAN.md` at repo root for the complete migration plan with:
- Research findings (Apple Foundation Models, Supabase Swift SDK, MapKit, BGTasks)
- Component-by-component migration mapping
- 6-phase execution plan with checkboxes
- Risk register and open questions

## Sharp Edges

- `hike_data.json` is 867KB / ~46k trail points — first-launch ingest takes a moment
- MapKit has NO offline tile download API — cached tiles depend on user having viewed the area
- Foundation Models framework requires iOS 26+ AND Apple Intelligence enabled on device
- Supabase free tier sleeps after 7 days inactivity → 503. SyncEngine handles this with backoff.
- `SWIFT_DEFAULT_ACTOR_ISOLATION = MainActor` means you must explicitly mark nonisolated or use actors for background work
