# DDG-PCT iOS Native App Migration Plan

> Living reference document for converting the DDG-PCT mission-control web app into an offline-first, Apple Intelligence-powered native iOS application.
> Last updated: July 2025 — post-research rewrite with verified API documentation.

---

## Table of Contents

1. [Research & Architecture Context](#1-research--architecture-context)
2. [Current Web Stack Inventory](#2-current-web-stack-inventory)
3. [iOS Technology Mapping](#3-ios-technology-mapping)
4. [SwiftData Schema](#4-swiftdata-schema)
5. [Component-by-Component Migration](#5-component-by-component-migration)
6. [Execution Phases](#6-execution-phases)
7. [Risk Register](#7-risk-register)
8. [Open Questions](#8-open-questions)

---

## 1. Research & Architecture Context

### 1A. The Supabase "Sleep" Problem

| Fact           | Detail                                                                             |
| -------------- | ---------------------------------------------------------------------------------- |
| Trigger        | Free-tier projects pause after **7 days** with zero DB queries or dashboard visits |
| Symptom        | API returns **503 Service Unavailable** for 1–3 min while DB cold-starts           |
| Trail scenario | Day 9, 1 bar of cell at Hat Creek Rim — sync request silently dropped              |

**Mitigation strategy (ranked):**

1. **Local-first SwiftData** — every write goes to the device DB first, always.
2. **Background sync queue** with exponential backoff: interprets `503` as "waking", holds payload, retries on next `NWPathMonitor` satisfied event.
3. **Keep-alive ping** — schedule a `BGAppRefreshTask` every 6 days that hits a no-op Supabase edge function to prevent sleep.
4. _(Fallback: upgrade to $25/mo Pro tier for the 2 months of the hike to disable sleep entirely.)_

### 1B. Apple Foundation Models Framework (iOS 26.0+)

**CRITICAL CORRECTION:** Apple _does_ provide a direct programmatic API for on-device LLM inference as of iOS 26.0. This was discovered by reading the actual `FoundationModels` framework documentation.

| API                                   | Purpose                                                       |
| ------------------------------------- | ------------------------------------------------------------- |
| `SystemLanguageModel.default`         | Access to the on-device foundation model                      |
| `LanguageModelSession(instructions:)` | Create a session with system instructions                     |
| `session.respond(to: prompt)`         | Direct text generation — returns `String`                     |
| `@Generable` macro                    | Guided generation: pass a Swift struct, get structured output |
| `Tool` protocol                       | Let the model call Swift functions (tool calling)             |
| `Instructions` / `Prompt` types       | Typed wrappers for system/user messages                       |

**Constraints:**

- Context window: **4,096 tokens** (small — must keep prompts concise)
- Requires Apple Intelligence **enabled** on the device
- Available **iOS 26.0+** only (ships fall 2025 — beta now)
- No background execution guarantee (must run when app is active or in `BGContinuedProcessingTask`)

**What this means for DDG-PCT:**

- We can run **on-device summarization** of OpsLog entries (e.g., "summarize today's trail notes")
- We can use `@Generable` for **structured entity extraction** (classify log entries as TASK/ALERT/NOTE with confidence)
- We can use `Tool` protocol to let the model **query SwiftData** directly
- **4,096 token limit** means we batch day notes in chunks, not dump the whole trip at once
- **No need for MLX Swift** as primary AI — Apple's own framework handles it natively on iOS 26+

### 1C. MLX Swift (Fallback for iOS 18–25)

If targeting devices that can't run iOS 26, MLX Swift can load quantized open-source models (Llama 3 8B Q4) directly on the Neural Engine. This is much heavier (1-4 GB model files) and requires manual prompt engineering. **Recommendation:** target iOS 26+ and use Foundation Models framework; drop MLX from scope unless backward compat is required.

### 1D. Supabase Swift SDK (v2.42.0)

Verified documentation for `supabase-swift` — drop-in replacement for the JS client:

| JS API                                                | Swift API                                               | Notes                             |
| ----------------------------------------------------- | ------------------------------------------------------- | --------------------------------- |
| `supabase.from('table').select()`                     | `supabase.from("table").select()`                       | Returns `Decodable` via `.value`  |
| `supabase.from('table').insert(obj)`                  | `supabase.from("table").insert(model)`                  | Pass `Encodable` structs directly |
| `supabase.from('table').upsert(obj)`                  | `supabase.from("table").upsert(model)`                  | Primary key required              |
| `supabase.from('table').update(obj).eq()`             | `supabase.from("table").update(dict).eq("col", value:)` | Chain filters                     |
| `supabase.from('table').delete().eq()`                | `supabase.from("table").delete().eq("col", value:)`     | Filter required                   |
| `supabase.channel('room')`                            | `supabase.channel("room")`                              | Broadcast + Presence + DB changes |
| `supabase.auth.signInWithOtp()`                       | `supabase.auth.signInWithOTP(email:)`                   | Magic link                        |
| `supabase.auth.signInWithOAuth({provider: 'google'})` | `supabase.auth.signInWithOAuth(provider: .google)`      | ASWebAuthenticationSession        |
| `supabase.auth.signInWithIdToken()`                   | `supabase.auth.signInWithIdToken(credentials:)`         | Native Apple Sign-in              |
| `supabase.auth.onAuthStateChange()`                   | `supabase.auth.authStateChanges`                        | AsyncSequence                     |
| `supabase.functions.invoke('fn')`                     | `supabase.functions.invoke("fn")`                       | Edge functions                    |

**Requirements:** iOS 13.0+ / Xcode 15.3+ / Swift 5.10+

### 1E. MapKit for SwiftUI

MapKit provides native SwiftUI map views with:

- `Map` view with `MapStyle` (standard, satellite, hybrid)
- `MapPolyline` for trail rendering (replaces Deck.gl `PathLayer`)
- `Marker` and `Annotation` for camp/town/water/transport markers
- `MapCamera` and `MapCameraBounds` for viewport control
- Look Around Preview for street-level exploration
- `PointOfInterestCategories` for filtering

**Offline map tiles:** MapKit does **NOT** natively support offline tile caching or `.mbtiles` bundles. Apple Maps caches recently viewed tiles but provides no developer API to pre-download regions. Options:

1. **User-initiated download:** iOS 17+ lets users download offline maps from the Maps app, and MapKit benefits from those cached tiles.
2. **Custom tile overlay:** Use `MKTileOverlay` with URL template pointing to locally-bundled tiles (we'd need to export the PCT corridor tiles from OpenMapTiles).
3. **Mapbox iOS SDK:** Has explicit offline region download API. Adds a dependency but solves the problem definitively.

**Recommendation:** Use MapKit for primary rendering (free, native, no API key) + ship a bundled GeoJSON of the trail + pre-cache a thin strip of tiles for the Burney Falls–Castle Crags corridor.

### 1F. Background Tasks Framework

| Task Type                   | Use Case                               | Duration        | Network     |
| --------------------------- | -------------------------------------- | --------------- | ----------- |
| `BGAppRefreshTask`          | Periodic content refresh (sync check)  | ~30 seconds     | Optional    |
| `BGProcessingTask`          | Heavy sync, AI summarization           | Several minutes | Can require |
| `BGContinuedProcessingTask` | Continue foreground work in background | Until complete  | Optional    |

**Key behaviors:**

- iOS decides _when_ to run background tasks (learns user patterns)
- `BGProcessingTask` can require `requiresNetworkConnectivity = true` — iOS will only run it when network is available
- Can require `requiresExternalPower = true` for heavy ML workloads
- Must register task identifiers in `Info.plist` under `BGTaskSchedulerPermittedIdentifiers`

### 1G. NWPathMonitor

Network connectivity observer (iOS 12.0+):

- `NWPathMonitor()` — monitors all interfaces
- `NWPathMonitor(requiredInterfaceType: .cellular)` — monitor specific type
- `pathUpdateHandler` fires on every connectivity change
- `NWPath.status`: `.satisfied` (connected), `.unsatisfied` (no network), `.requiresConnection`
- `NWPath.isExpensive` — true for cellular
- `NWPath.isConstrained` — true for Low Data Mode
- Conforms to `AsyncSequence` — can `for await path in monitor`

**Trail architecture:** Run `NWPathMonitor` as a long-lived singleton. When path transitions from `.unsatisfied` → `.satisfied`, trigger the sync queue drain.

---

## 2. Current Web Stack Inventory

### 2A. Source Files (pct-hike-viz/src/)

| File                     | Lines | Purpose                                                                                            | iOS Replacement                                     |
| ------------------------ | ----- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `App.jsx`                | 735   | Data loader, layout orchestration, state management                                                | `DDGPCTApp.swift` + `ContentView.swift`             |
| `AuthContext.jsx`        | 512   | Supabase magic link + Google OAuth, allowlist, team roster                                         | `AuthManager.swift` (ObservableObject)              |
| `Sidebar.jsx`            | 1300+ | 8-tab mission control (mission, prep, itinerary, safety, gear, connectivity, logistics, resources) | `TabView` with 8 tabs, each a SwiftUI `View`        |
| `TrailMap.jsx`           | 414   | MapLibre GL + Deck.gl PathLayers, markers, popups                                                  | `TrailMapView.swift` (MapKit `Map` + `MapPolyline`) |
| `ElevationProfile.jsx`   | 1100+ | D3 SVG chart, altitude physiology zones, Naismith's rule                                           | `ElevationProfileView.swift` (Swift Charts)         |
| `GearPlanner.jsx`        | 900+  | RPG loadout builder, Supabase realtime sync                                                        | `GearPlannerView.swift` + SwiftData                 |
| `OpsLog.jsx`             | 198   | Realtime ops log, auto-classification                                                              | `OpsLogView.swift` + SwiftData                      |
| `AuthUI.jsx`             | 260   | Login modals, magic link flow                                                                      | `AuthView.swift`                                    |
| `WildfireMonitor.jsx`    | 213   | NIFC ArcGIS + EPA AirNow APIs, 4hr cache                                                           | `WildfireService.swift`                             |
| `TerrainAnalysis.jsx`    | 167   | Slope categories, Naismith's rule                                                                  | Inline in `ElevationProfileView`                    |
| `TransitPanel.jsx`       | 267   | Transit routes, shuttles, rental cars                                                              | `TransitView.swift`                                 |
| `TripReadinessPanel.jsx` | 192   | Readiness dashboard, module weights                                                                | `ReadinessView.swift`                               |
| `SourceChips.jsx`        | 107   | Citation reference chips                                                                           | `SourceChipView.swift`                              |

### 2B. Data Files

| File                  | Lines  | Purpose                                                             | iOS Treatment                                       |
| --------------------- | ------ | ------------------------------------------------------------------- | --------------------------------------------------- |
| `hike_data.json`      | 48,000 | Trail coords, camps, drive segments, water sources, transport       | Bundle in app → ingest to SwiftData on first launch |
| `planContent.js`      | 2,500+ | All narrative: schedule, gear blueprint, day itinerary, team, risks | Convert to `PlanContent.swift` struct literals      |
| `connectivityData.js` | 225    | 8 cell coverage zones with carrier ratings                          | Convert to `ConnectivityZone` SwiftData model       |
| `resourcesIndex.js`   | 1,100+ | 80+ source citations (URLs, titles, types)                          | Convert to `Source` struct array                    |

### 2C. Services

| File                      | Lines | Purpose                                           | iOS Treatment                                          |
| ------------------------- | ----- | ------------------------------------------------- | ------------------------------------------------------ |
| `liveSatelliteService.js` | 115   | Scrapes Apple Support via Jina.ai proxy           | Replace with native Apple satellite API checks or drop |
| `wildfireService.js`      | 187   | NIFC ArcGIS + EPA AirNow + edge function fallback | Port to `URLSession`-based service with offline cache  |
| `transitService.js`       | 214   | Hardcoded transit data                            | Port as static data                                    |
| `supabase.js`             | 180   | Client singleton, team roster, email allowlist    | Port to `SupabaseManager.swift` using supabase-swift   |

### 2D. Supabase Tables (from combined.sql)

| Table               | Columns                                                         | Used By                      | Realtime             |
| ------------------- | --------------------------------------------------------------- | ---------------------------- | -------------------- |
| `ops_logs`          | id, hiker_id, context_id, content, category, status, created_at | OpsLog.jsx                   | Yes (INSERT, UPDATE) |
| `gear_loadouts`     | id, hiker_id, item_ids (jsonb), updated_at                      | GearPlanner.jsx              | Yes                  |
| `custom_items`      | id, hiker_id, name, weight_oz, category, created_at             | GearPlanner.jsx              | Yes                  |
| `allowed_emails`    | id, email, created_at                                           | AuthContext.jsx              | No                   |
| `access_requests`   | id, email, name, reason, status, created_at                     | AuthContext.jsx              | No                   |
| `ddg_team_profiles` | id, hiker_id, display_name, email, avatar_url, role             | AuthContext.jsx, Sidebar.jsx | No                   |

### 2E. External API Endpoints

| API                    | Used By                   | Endpoint                                                | Offline Behavior                          |
| ---------------------- | ------------------------- | ------------------------------------------------------- | ----------------------------------------- |
| NIFC ArcGIS            | WildfireMonitor           | `services3.arcgis.com/...` active fire perimeters query | Cache last response, show staleness badge |
| EPA AirNow             | WildfireMonitor           | `www.airnowapi.org/aq/observation/latLong/current/`     | Cache last AQI, show staleness badge      |
| Supabase Edge Function | WildfireMonitor           | `supabaseUrl/functions/v1/wildfire-data`                | Skip, use cached                          |
| Jina.ai Proxy          | LiveSatelliteService      | `r.jina.ai/https://support.apple.com/...`               | Drop — replace with on-device check       |
| USFS ArcGIS            | fetch script (build-time) | `services1.arcgis.com/...` PCT route GeoJSON            | Pre-bundled, not runtime                  |

---

## 3. iOS Technology Mapping

| Web Technology           | iOS Replacement                 | Notes                                            |
| ------------------------ | ------------------------------- | ------------------------------------------------ |
| React 19 + Vite 7        | SwiftUI + Xcode                 | Declarative UI, hot reload via Xcode Previews    |
| MapLibre GL JS + Deck.gl | MapKit for SwiftUI              | `Map`, `MapPolyline`, `Marker`, `Annotation`     |
| D3-scale SVG charts      | Swift Charts                    | Native `Chart` view with `LineMark`, `AreaMark`  |
| Supabase JS 2.86         | supabase-swift 2.42             | Drop-in API parity, SPM install                  |
| localStorage             | SwiftData                       | Full ORM with `@Model`, `@Query`, `ModelContext` |
| `fetch()` API            | `URLSession`                    | Native HTTP with caching, background sessions    |
| PropTypes                | Swift type system               | Compile-time safety, no runtime checks needed    |
| CSS modules              | SwiftUI modifiers               | `.padding()`, `.background()`, `.font()`         |
| React.lazy()             | `LazyVStack` / `@ViewBuilder`   | Lazy loading built into SwiftUI                  |
| useMemo / useCallback    | SwiftUI `@State`, `@Observable` | SwiftUI handles diffing automatically            |

---

## 4. SwiftData Schema

Derived from `combined.sql` + `hike_data.json` + content files:

```swift
// MARK: - Core Sync Models (mirror Supabase tables)

@Model class OpsLogEntry {
    @Attribute(.unique) var id: UUID
    var hikerId: String
    var contextId: String
    var content: String
    var category: String          // TASK, ALERT, NOTE
    var status: String            // OPEN, IN_PROGRESS, DONE
    var createdAt: Date
    var syncStatus: SyncStatus    // .local, .syncing, .synced
    var lastSyncAttempt: Date?
}

@Model class GearLoadout {
    @Attribute(.unique) var id: UUID
    var hikerId: String
    var itemIds: [String]          // JSON array of item IDs
    var updatedAt: Date
    var syncStatus: SyncStatus
}

@Model class CustomItem {
    @Attribute(.unique) var id: UUID
    var hikerId: String
    var name: String
    var weightOz: Double
    var category: String
    var createdAt: Date
    var syncStatus: SyncStatus
}

// MARK: - Local-Only Models (bundled data)

@Model class TrailPoint {
    var latitude: Double
    var longitude: Double
    var elevation: Double          // meters
    var mileMarker: Double
    var segmentType: SegmentType   // .hiking, .drive, .transit
}

@Model class CampSite {
    var name: String
    var latitude: Double
    var longitude: Double
    var day: Int
    var type: String               // "camp", "town", "start", "end"
    var mileMarker: Double
    var notes: String?
}

@Model class WaterSource {
    var name: String
    var latitude: Double
    var longitude: Double
    var reliability: String
    var notes: String?
}

@Model class ConnectivityZone {
    var name: String
    var latitude: Double
    var longitude: Double
    var verizon: String            // "good", "fair", "none"
    var att: String
    var tmobile: String
    var satelliteCompatible: Bool
    var notes: String?
}

// MARK: - Cache Models

@Model class WildfireCache {
    var queryDate: Date
    var responseJSON: Data         // raw API response
    var stale: Bool
}

@Model class AirQualityCache {
    var queryDate: Date
    var aqi: Int
    var category: String
    var stale: Bool
}

// MARK: - Sync Infrastructure

enum SyncStatus: String, Codable {
    case local          // created/modified locally, not yet synced
    case syncing        // sync in progress
    case synced         // confirmed synced to Supabase
    case conflicted     // server has a different version
}
```

---

## 5. Component-by-Component Migration

### 5A. App.jsx → DDGPCTApp.swift + ContentView.swift

**Current behavior:** Loads `hike_data.json` from `/data/` with localStorage caching (version key `VITE_HIKE_DATA_VERSION`), 6.5s timeout, 30-min satellite refresh, computed stats (totalMiles, totalGain, etc.).

**iOS implementation:**

- `@main` App struct with SwiftData `modelContainer`
- `ContentView` with `TabView` for 8 sections
- First-launch data ingestor: parse bundled `hike_data.json` → SwiftData models
- Computed stats as `@Query` aggregations or cached properties
- `NetworkMonitor` singleton started at app launch
- `SyncEngine` initialized and listening

### 5B. AuthContext.jsx → AuthManager.swift

**Current behavior:** Supabase magic link + Google OAuth, email allowlist (`DDG_ALLOWED_EMAILS`), team roster from `ddg_team_profiles`, 5s auth init timeout, 15s login timeout.

**iOS implementation:**

- `@Observable class AuthManager` wrapping `supabase.auth`
- Native Apple Sign-In via `SignInWithAppleButton` → `supabase.auth.signInWithIdToken(credentials: .apple)`
- Hardcoded allowlist (3 emails — same as web app)
- `authStateChanges` AsyncSequence for session monitoring
- Keychain storage for tokens (supabase-swift handles this by default)
- Offline mode: if no session found and no network, skip auth and operate locally

### 5C. Sidebar.jsx → TabView with 8 Views

**Current behavior:** 1300+ line component with 8 tabs: mission, prep, itinerary, safety, gear, connectivity, logistics, resources. Includes presence indicator, team roster avatars, sync status.

**iOS implementation:**

```
TabView {
    MissionView()          // Overview, trip stats, team
    PrepView()             // Packing list, permits, checklist
    ItineraryView()        // Day-by-day schedule
    SafetyView()           // Risks, evacuation, wildfire, AQI
    GearPlannerView()      // RPG loadout builder
    ConnectivityView()     // Cell zones, satellite devices
    LogisticsView()        // Transit, resupply, shuttles
    ResourcesView()        // Source citations, external links
}
```

### 5D. TrailMap.jsx → TrailMapView.swift

**Current behavior:** MapLibre GL with 4 style options (topo, hybrid, aerial, fstopo from `nst-guide/osm-liberty-topo` GitHub tiles), Deck.gl `PathLayer` for trail + drive routes, emoji markers (⛺💧📡) for camps/water/connectivity, popup info on tap.

**iOS implementation:**

- SwiftUI `Map` with `MapStyle.standard` / `.hybrid` / `.imagery`
- `MapPolyline` for hiking trail segments (from `TrailPoint` query)
- `MapPolyline` with dashed stroke for drive segments
- `Annotation` views with SF Symbols (replacing emoji markers):
  - ⛺ → `tent.fill`
  - 💧 → `drop.fill`
  - 📡 → `antenna.radiowaves.left.and.right`
  - 🚗 → `car.fill`
  - 🏔 → `mountain.2.fill`
- `@State var selectedAnnotation` for tap → detail sheet
- Pre-bundled GeoJSON parsed into `TrailPoint` models on first launch
- Offline: MapKit will show cached tiles from prior viewing; trail overlay and annotations are always available from SwiftData

### 5E. ElevationProfile.jsx → ElevationProfileView.swift

**Current behavior:** 1100+ line D3-powered SVG chart. 5-point moving average smoothing, grade calculation, cumulative gain/loss (10ft threshold), Naismith's rule time estimation, altitude physiology zones (green/yellow/orange/red by elevation), interactive cursor synced with map hover.

**iOS implementation:**

- Swift Charts `Chart` view with:
  - `AreaMark` for altitude zone coloring (green < 5000ft, yellow < 7000ft, orange < 8000ft, red > 8000ft)
  - `LineMark` for elevation profile line with 5-point smoothing
  - `RuleMark` for cursor position (synced with map selection)
- Grade and gain/loss calculations ported as Swift functions
- Naismith's rule time estimation preserved (`distance_km / 5.0 + elevation_gain_m / 600.0`)
- Camp markers as `PointMark` annotations on the chart
- Tap gesture on chart → update `@Binding selectedMile` → map flies to location

### 5F. GearPlanner.jsx → GearPlannerView.swift

**Current behavior:** 900+ line RPG-style loadout builder. Weight parsing (oz/g/lb normalization), loadout state as `Map<hikerId, Set<itemIds>>`, SLOT_METADATA with RPG stats, Supabase realtime channels for `gear_loadouts` + `custom_items`, auto-detect hiker from email, 10s timeouts.

**iOS implementation:**

- `@Query var loadouts: [GearLoadout]` from SwiftData
- `@Query var customItems: [CustomItem]` from SwiftData
- Item toggle writes to SwiftData immediately (offline-safe)
- `SyncEngine` pushes changes to Supabase when online
- RPG stat display as SwiftUI `Gauge` or custom `ProgressView`
- Weight breakdown in sections (shelter, sleep, cooking, water, clothing, etc.)
- Custom item creation writes to both SwiftData (instant) and sync queue

### 5G. OpsLog.jsx → OpsLogView.swift

**Current behavior:** 198 lines. Realtime ops log with auto-classification (`/task` → TASK+OPEN, `"warning"`/`"alert"` → ALERT, default → NOTE), status cycling (OPEN → IN_PROGRESS → DONE), Supabase channel for INSERT + UPDATE, offline detection with disabled send button.

**iOS implementation:**

- `@Query(sort: \OpsLogEntry.createdAt, order: .reverse) var entries: [OpsLogEntry]`
- Text input with send → create `OpsLogEntry` in SwiftData with `syncStatus: .local`
- Auto-classification logic ported directly (simple string matching)
- Status cycling via SwiftUI `.contextMenu` or swipe actions
- `SyncEngine` handles push/pull when network available
- **Apple Foundation Models integration:** Button to "summarize today's log" → `LanguageModelSession` → save summary as a special NOTE entry

### 5H. WildfireMonitor.jsx → WildfireService.swift

**Current behavior:** NIFC ArcGIS for fire perimeters (3 monitoring points: Burney Falls, Hat Creek, Castle Crags), EPA AirNow for AQI, Supabase Edge Function fallback, 4-hour cache TTL.

**iOS implementation:**

- `actor WildfireService` with `URLSession` requests
- Same API endpoints (NIFC ArcGIS + EPA AirNow)
- Response cached in `WildfireCache` SwiftData model
- Staleness badge when cache > 4 hours
- Background refresh via `BGAppRefreshTask` when network available
- Offline: show last cached data with timestamp and "stale" indicator

### 5I. TransitPanel.jsx → TransitView.swift

**Current behavior:** 267 lines of hardcoded transit data (Greyhound, STAGE, Amtrak, shuttle services, rental car options, resupply points).

**iOS implementation:**

- Static data in `TransitData.swift` (struct literals, same as web)
- SwiftUI `List` with sections (bus, train, shuttle, rental, resupply)
- Deep links to Maps app / phone calls for shuttle services
- No network dependency — fully offline

### 5J. TripReadinessPanel.jsx → ReadinessView.swift

**Current behavior:** 192 lines. Readiness dashboard with weighted modules (permits, gear, fitness, logistics, safety). Each module has a score contributing to overall readiness percentage.

**iOS implementation:**

- `@Query` against permit checklist state, gear loadout completeness, etc.
- Circular progress indicators (SwiftUI `Gauge` with `.circular`)
- Module scores derived from SwiftData queries
- Offline-safe (all local data)

---

## 6. Execution Phases

### Phase 1: Foundation (Xcode Project + SwiftData + Static UI)

- [ ] Initialize Xcode project: SwiftUI, target iOS 26.0+, Swift 6.0
- [ ] Add `supabase-swift` via SPM (`from: "2.0.0"`)
- [ ] Define SwiftData `@Model` classes (see §4 above)
- [ ] Write first-launch data ingestor: parse bundled `hike_data.json` → `TrailPoint`, `CampSite`, `WaterSource` models
- [ ] Convert `planContent.js` → `PlanContent.swift` (struct literals with all narrative)
- [ ] Convert `connectivityData.js` → `ConnectivityZone` seed data
- [ ] Convert `resourcesIndex.js` → `Source` struct array
- [ ] Build `ContentView` with `TabView` scaffolding (8 tabs)
- [ ] Build `MissionView` (trip stats, team cards, overview text)
- [ ] Build `ItineraryView` (day-by-day from `dayItinerary`)
- [ ] Build `PrepView` (permit checklist, packing reminders)

### Phase 2: Trail Map + Elevation Profile

- [ ] Build `TrailMapView` with MapKit `Map`
- [ ] Render trail as `MapPolyline` from `TrailPoint` query
- [ ] Add `Annotation` views for camps (SF Symbol `tent.fill`)
- [ ] Add water source, connectivity, transport annotations
- [ ] Implement tap → detail sheet for each annotation type
- [ ] Add map style picker (standard / hybrid / imagery)
- [ ] Build `ElevationProfileView` with Swift Charts
- [ ] Port 5-point moving average smoothing
- [ ] Port altitude zone coloring (AreaMark backgrounds)
- [ ] Port cumulative gain/loss calculation (10ft threshold)
- [ ] Port Naismith's rule time estimates
- [ ] Sync chart cursor with map selection (`@Binding selectedMile`)
- [ ] Investigate offline tile strategy (pre-cache corridor or bundle tiles)

### Phase 3: Team Features (Auth + Gear + OpsLog)

- [ ] Build `AuthManager` with supabase-swift auth
- [ ] Implement Sign in with Apple → `signInWithIdToken`
- [ ] Add email allowlist validation (3 DDG team emails)
- [ ] Build `GearPlannerView` with SwiftData-backed loadouts
- [ ] Port weight calculation logic (oz/g/lb normalization)
- [ ] Build custom item creation form
- [ ] Build `OpsLogView` with SwiftData persistence
- [ ] Port auto-classification logic (TASK/ALERT/NOTE)
- [ ] Add status cycling (swipe actions or context menu)
- [ ] Build `ConnectivityView` (zone list with carrier ratings)
- [ ] Build `SafetyView` (risks, evacuation routes from planContent)

### Phase 4: Background Sync Engine

- [ ] Build `NetworkMonitor` singleton wrapping `NWPathMonitor`
- [ ] Build `SyncEngine` actor with outbox queue (pending local writes)
- [ ] Implement `SyncStatus` tracking on all sync-able models
- [ ] Handle Supabase 503 with exponential backoff + queue retention
- [ ] Register `BGAppRefreshTask` for periodic sync check
- [ ] Register `BGProcessingTask` for bulk sync (requires network)
- [ ] Implement Supabase Realtime channel for `ops_logs` (pull remote changes)
- [ ] Implement Supabase Realtime channel for `gear_loadouts` (pull remote changes)
- [ ] Implement conflict resolution (last-write-wins with sync timestamp)
- [ ] Add keep-alive ping task (every 6 days, no-op edge function call)
- [ ] Add sync status indicator in UI (green/yellow/red dot)

### Phase 5: Apple Intelligence Integration

- [ ] Build `AIAssistant` service wrapping `FoundationModels` framework
- [ ] Create `LanguageModelSession` with trail-specific instructions
- [ ] Implement "Summarize Today's Log" action in OpsLogView
- [ ] Implement structured extraction via `@Generable`: classify new log entries with confidence
- [ ] Register App Intents for Siri:
  - "Log a task: [dictation]" → creates OpsLogEntry
  - "What's our water status?" → reads water sources for current day
  - "Summarize today" → runs Foundation Models summarization
- [ ] Add on-device trail Q&A: "How far to Castle Crags?" using Tool protocol + SwiftData queries
- [ ] Handle Foundation Models unavailability gracefully (device too old, AI disabled)

### Phase 6: External Services + Polish

- [ ] Port `WildfireService` (NIFC ArcGIS + EPA AirNow)
- [ ] Port `TransitView` (static data, deep links)
- [ ] Build `ReadinessView` (readiness dashboard)
- [ ] Build `ResourcesView` (source citations with `Link` views)
- [ ] Port `liveSatelliteService` (or replace with on-device satellite status check)
- [ ] Add widgets (Lock Screen: next camp distance, total progress)
- [ ] Add Watch companion (basic stats, SOS info)
- [ ] TestFlight deployment for Dan, Drew, Gunnar
- [ ] Battery profiling and optimization pass

---

## 7. Risk Register

| Risk                                                            | Impact                                | Likelihood | Mitigation                                                              |
| --------------------------------------------------------------- | ------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| iOS 26 not available on team devices at hike time               | Cannot use Foundation Models          | Medium     | Ship with iOS 18+ target, make AI features optional                     |
| MapKit offline tile coverage insufficient for PCT corridor      | Blank map tiles on trail              | High       | Pre-walk the trail in Maps app to cache tiles, or bundle custom overlay |
| Supabase free tier sleeps during hike                           | 503s on sync attempts                 | High       | Keep-alive ping + robust retry queue + consider Pro tier                |
| 4,096 token context window too small for full-day summarization | Truncated AI output                   | Medium     | Batch notes in chunks, summarize incrementally                          |
| Cell coverage data outdated at hike time                        | Wrong expectations about connectivity | Low        | Add field-update capability for zones                                   |
| 48,000 trail points cause SwiftData performance issues          | Slow map/chart rendering              | Medium     | Downsample to 5,000 points for charts; use full set only for map        |
| Team members' devices differ (iPhone model, iOS version)        | Feature disparity                     | Low        | Target lowest common denominator, make AI optional                      |

---

## 8. Open Questions

- [ ] **iOS version target:** iOS 26+ (enables Foundation Models) vs iOS 18+ (wider compat, no native AI)?
- [ ] **Offline maps strategy:** MapKit cached tiles vs bundled tile overlay vs Mapbox offline?
- [ ] **Auth flow:** Sign in with Apple (recommended) vs Supabase magic link (matches web)?
- [ ] **Supabase tier:** Upgrade to Pro for hike duration, or rely on keep-alive architecture?
- [ ] **Watch app:** Worth building a WatchOS companion for wrist-level stats?
- [ ] **Trail data updates:** How to handle mid-hike corrections to camp locations or water source status?
- [ ] **Model size:** If using Foundation Models, is 4,096 tokens enough for our use cases?

---

_This document is a living reference. Check off boxes by changing `[ ]` to `[x]` as phases complete._
