# DDG-PCT Mission Control

Interactive web app for the active **Burney Falls → Ash Camp** PCT section hike. Built from Dad's original planning doc with GPS-accurate data and mission-critical logistics.

## 🎯 The Plan

**54.2 GPS miles • 9 hiking days • August 29–September 6, 2026**

The approximately 52 PCT guide miles in the original concept terminate near Ash
Camp. The checked-in Garmin course measures 54.2 miles from the Burney Falls
start to the official Ash Camp pickup pin. Route mile 52 itself is not a vehicle
exit.

The active plan uses nine documented camp-to-camp legs averaging 6.0 miles, with
an 8.2-mile longest day and a 3.8-mile final day. The full 82.9-mile Garmin
track to Castle Crags remains stored as a future-trip alternative and is not
part of the 2026 itinerary.

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
└── Garmin-compatible GPX files/      # Section O tracks (multiple densities)
```

## 🛠️ Key Commands

```bash
npm run dev:viz                       # Dev server (remote preview)
npm run build:viz                     # Production build
npm run fetch:pct                     # Update USFS PCT route data
node scripts/configure_active_route.js # Crop active geometry at Ash Camp
python scripts/snap_camps_to_route.py # Snap camp coords to trail
node scripts/validate_water_sources.mjs # Compare itinerary vs PCT Water Report
```

## 📊 Data Pipeline

1. **Trip facts and unresolved decisions**: `src/data/tripFacts.js`
2. **GPS geometry**: Garmin GPX → `hike_data.json`
3. **Current field conditions**: official closures, PCT Water Report, NIFC, and AQI feeds
4. **Narrative context**: `Original-DDG-PCT-PDF.txt` (preserved, not treated as measured geometry)
5. **UI content**: `planContent.js` + `resourcesIndex.js`

**⚠️ Note on Public Repo:**
To keep this repository lightweight, the raw high-resolution GPX files and the generated `hike_data.json` (48k+ lines) are **excluded** from git.
- **Cloning**: When you clone this repo, `npm install` will automatically copy a **placeholder** dataset so the app builds and runs in "Demo Mode".
- **Real Data**: To generate the full dataset, you need the source Garmin GPX files (not included) and must run `python scripts/snap_camps_to_route.py`.

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
| Cell coverage | `src/data/connectivityData.js` | 9 checkpoints with carrier ratings |

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

✅ **Route scope decided**: 54.2 GPS miles to Ash Camp over nine hiking days
✅ **Backend secured**: team profiles are the authorization source of truth
⚠️ **Still to verify**: eight documented camps, current water, FS Road 38N11 condition, late-arrival sleep access, closures, and the September 7 flight time

---

*"Nursing blisters with the salve of memories"* — Dan's Original-DDG-PCT-PDF.txt
