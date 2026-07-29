# DDG-PCT Mission Control

Interactive web app for the active **Burney Falls → Ash Camp** PCT section hike. Built from Dad's original planning doc with GPS-accurate data and mission-critical logistics.

> [!IMPORTANT]
> The controlling audit is
> [docs/2026-trip-source-of-truth.md](docs/2026-trip-source-of-truth.md).
> Route, daily splits, and elevation are generated into the web and iOS bundles;
> volatile water, fire, smoke, weather, and agency-source checks come from the
> protected daily Supabase snapshot. A successful source fetch is not an
> all-clear when an official map or campsite status still requires human review.

## 🎯 The Plan

**51.844 PCTA 2026 miles • 8 hiking days • August 29–September 5, 2026 • September 6 contingency**

The route begins at the actual Burney Falls PCT access at PCTA mile 1420.653 and
ends at the official Ash Camp pickup at PCTA mile 1472.497. The PCTA January
2026 centerline measures 51.844 miles. The checked-in map geometry measures
51.664 miles, while the active crop of Gunnar’s supplied Garmin export measures
51.153 miles and supplies the normalized elevation model. An arbitrary “mile
52” is not a vehicle exit.

The eight legs are 5.609 / 8.678 / 12.591 / 5.369 / 3.789 / 6.350 /
5.604 / 3.854 miles. Day 2 ends at a screened USFS dry camp. Day 3 is a
supported day-pack traverse to an exact Bartle Gap extraction/re-entry pin;
Day 2 has the largest climb and Day 7 has the largest knee-load descent. The
supplied Garmin source course measures 80.826 miles; the old 82.898-mile app
crop is a different excluded reference geometry. Neither is the active trip.

## 🚀 Quick Start

```bash
# Run the mission control dashboard
npm run dev:viz

# Or from pct-hike-viz/
npm run dev
```

Opens at `http://localhost:5173` (or `http://127.0.0.1:4173` for remote preview)

## 📂 Structure

```
DDG-PCT/
├── Original-DDG-PCT-PDF.txt          # Dad's source narrative
├── PCT-prep-guide.md                 # Compiled logistics guide
├── pct-hike-viz/                     # Active web app
│   ├── src/
│   │   ├── App.jsx                   # Main orchestration
│   │   ├── hike_data.json            # GPS route + camps (48k lines, GENERATED)
│   │   ├── components/
│   │   │   ├── TrailMap.jsx          # MapLibre + Deck.gl
│   │   │   ├── Sidebar.jsx           # 6-tab mission control
│   │   │   ├── ElevationProfile.jsx  # d3 elevation chart
│   │   │   └── GearPlanner.jsx       # RPG-style loadout
│   │   └── data/
│   │       ├── planContent.js        # All narrative content
│   │       ├── resourcesIndex.js     # Citation lookup
│   │       └── connectivityData.js   # Cell/satellite zones
│   └── scripts/
│       └── snap_camps_to_route.py    # Coordinate snapper
└── docs/data/source/                 # Canonical user-supplied Garmin GPX
```

## 🛠️ Key Commands

```bash
npm run dev:viz                       # Dev server (remote preview)
npm run build:viz                     # Production build
npm run fetch:pct                     # Update USFS PCT route data
node pct-hike-viz/scripts/configure_active_route.js # Regenerate all route bundles
node scripts/normalize_garmin_itinerary.mjs --output docs/data/garmin-itinerary-normalization.json # Recalculate normalized daily terrain
node scripts/audit_route_parcels.mjs   # Re-run parcel/road/terrain camp screen
node scripts/validate_water_sources.mjs # Compare itinerary vs PCT Water Report
```

## 📊 Data Pipeline

1. **Trip facts and unresolved decisions**: `src/data/tripFacts.js`
2. **Map geometry**: checked-in 51.664-mile app crop → `hike_data.json`
3. **Elevation contract**: canonical user GPX → 25m resampling → 200m smoothing → continuous 20ft hysteresis
4. **Current field conditions**: official closures, PCT Water Report, NIFC, and AQI feeds
5. **Narrative context**: `Original-DDG-PCT-PDF.txt` (preserved, not treated as measured geometry)
6. **UI content**: `planContent.js` + `resourcesIndex.js`

The production web and iOS route bundles are checked in. Regenerate them only
through `pct-hike-viz/scripts/configure_active_route.js`, then run both integrity
validators so all mirrors remain byte-identical.

## 🔧 Cache Busting

After modifying `hike_data.json`, bump `VITE_HIKE_DATA_VERSION` in `.env`:

```bash
echo "VITE_HIKE_DATA_VERSION=$(date +%s)" >> pct-hike-viz/.env
```

## 🔐 Environment Variables

All environment variables live in `pct-hike-viz/.env`:

| Variable | Purpose |
|----------|---------|
| `VITE_HIKE_DATA_VERSION` | Cache-busts `hike_data.json` so browsers pull the latest mission geometry. |
| `AIRNOW_API_KEY` | Optional Supabase Edge Function secret for EPA AirNow observations. Without it, the function clearly labels its Open-Meteo CAMS fallback. |

The repository ships with placeholder values—replace them with your own keys before production. Free AirNow API keys are available at [AirNow.gov](https://docs.airnowapi.org/). 

## 🎨 Component Patterns

| Pattern | Usage |
|---------|-------|
| Lazy loading | `TrailMap` via `React.lazy()` for instant Sidebar render |
| Heavy memoization | `useMemo` for `campPoints`, `routeSegments`, `deckLayers` |
| PropTypes | Required on all components; match existing shapes |
| Emoji markers | ⛺💧📡 lightweight divs; extend `getTransportIcon()` |

## 📝 Editing Content

| What | File | Notes |
|------|------|-------|
| Day schedules, risks | `src/data/planContent.js` | Sync with prep guide |
| Gear citations | `src/data/resourcesIndex.js` | Items reference `sourceIds` |
| Route coordinates | `src/hike_data.json` | Use snapper script only |
| Cell coverage | `src/data/connectivityData.js` | Conservative route checkpoints; field verification still required |

## 🗺️ Map Stack

- **Basemaps**: `nst-guide/osm-liberty-topo` (no API keys needed)
- **Trail rendering**: Deck.gl `PathLayer` with `hikingTrail` geometry
- **Markers**: Extend `driveSegments`/`transport`/`waterSources` arrays

## 📌 Sharp Edges

- **Offline dev**: Shows blank map tiles (remote-hosted styles)
- **Git diffs**: `hike_data.json` changes are huge — commit with "regenerated" notes
- **Elevation data**: `ElevationProfile` expects `hikingTrail[i][2]` for elevation
- **`pct-hike-planner/`**: Placeholder directory, no active code

## 🧭 The DDG Team

- **Dan** (Dad): Trail Boss, master planner, Logotherapy conference president
- **Drew**: Navigator, April detox trip veteran
- **Gunnar**: Driver, flight coordinator, tech support

## 📚 Key Sources

- [Wilderness Vagabond 2017](http://wildernessvagabond.com/PCT-2017/PCT-2017.htm)
- [Adventure Hacks Guide](https://adventurehacks.com/burney-falls-castle-crags/)
- [Halfway Anywhere NorCal Picks](https://www.halfwayanywhere.com/trails/pacific-crest-trail/best-section-hikes-pct-norcal/)
- [PCTA Permits](https://www.pcta.org/discover-the-trail/permits/)

## 🎯 Status

✅ **Route synchronized**: 51.844 official / 51.664 Garmin miles to Ash Camp over eight hiking days
✅ **Terrain synchronized**: +6,524/−7,050 feet, 6,129-foot normalized high point, exact daily loads
✅ **Private corridor resolved**: 12.591-mile supported day-pack traverse to Bartle Gap; no private-land campsite assumption
✅ **Condition backend live**: daily protected water, wildfire, smoke/AQI, weather, and agency-source snapshot
⚠️ **Operational gates**: book/verify the Bartle driver, road, gate, legal overnight, and exact re-entry; ground-check camps; verify Lake Britton, current restrictions, FS Road 38N11, and both United bookings

---

*"Nursing blisters with the salve of memories"* — Dan's Original-DDG-PCT-PDF.txt
