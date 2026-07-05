# DDG-Mobile

Native iOS mission control for the DDG team's PCT Section O hike (Burney Falls → Castle Crags).

## Quick Start

```bash
open DDG-Mobile.xcodeproj
```

Then in Xcode:

1. **Add Supabase**: File → Add Package Dependencies → `https://github.com/supabase/supabase-swift.git` (from `2.0.0`)
2. Select target device (iPhone 16 Pro recommended)
3. Build & Run (⌘R)

## What's Built

- **8-tab mission control**: Mission, Prep, Map, Itinerary, Safety, Gear, Ops Log, Info
- **SwiftData models** mirroring the web app's Supabase tables + bundled trail data
- **Offline-first sync engine** with exponential backoff for Supabase free tier 503s
- **Network monitor** that auto-triggers sync when connectivity returns
- **MapKit trail map** with polyline rendering and camp annotations
- **Swift Charts elevation profile** with altitude physiology zones
- **RPG gear planner** with weight tracking per hiker
- **Ops log** with auto-classification (NOTE/TASK/ALERT) and sync status badges
- **All static data** ported: 8 connectivity zones, transit routes, airports, parking, satellite devices

## What's Next

See [MIGRATION-PLAN.md](MIGRATION-PLAN.md) for the full roadmap. Key remaining work:

- [ ] Add `supabase-swift` SPM package and wire up `SupabaseManager`
- [ ] Implement `SyncEngine` push/pull with Supabase
- [ ] Sign in with Apple auth flow
- [ ] Apple Foundation Models integration (iOS 26+ "Summarize Today" in Ops Log)
- [ ] Background tasks (BGAppRefreshTask for periodic sync + keep-alive)
- [ ] Wildfire API response parsing
- [ ] Offline tile pre-caching strategy
- [ ] TestFlight deployment

## Architecture

Offline-first: every write goes to SwiftData immediately. When network is available, `SyncEngine` pushes pending changes to Supabase. The `NetworkMonitor` singleton detects connectivity changes and triggers sync automatically.

See [.github/copilot-instructions.md](.github/copilot-instructions.md) for full architecture docs.

## Team

| Hiker  | Role        | Emoji |
| ------ | ----------- | ----- |
| Dan    | Trail Boss  | 🧔    |
| Drew   | Navigator   | 🏔️    |
| Gunnar | Pace Setter | ⚡    |
