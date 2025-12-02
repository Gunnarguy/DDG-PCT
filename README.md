# DDG-PCT Mission Control

Interactive web app for a **Burney Falls → Castle Crags** PCT section hike. Built from Dad's original planning doc with GPS-accurate data and mission-critical logistics.

## 🎯 The Plan

**52 miles • 6 hiking days • August 29 - September 6**

Dad's exact route from `Original-DDG-PCT-PDF.txt`:
- Day 1: Burney Falls → Round Valley (10 mi)
- Day 2: Round Valley → Black Rock (9 mi)  
- Day 3: Black Rock → Horse Camp (8 mi)
- Day 4: Horse Camp → Indian Springs (9 mi)
- Day 5: Indian Springs → Castle Crags Vista (8 mi)
- Day 6: Castle Crags Vista → Castle Crags SP (8 mi)

Designed for **"someone not in great shape"** with 8-10 mile days.

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
python scripts/snap_camps_to_route.py # Snap camp coords to trail
```

## 📊 Data Pipeline

1. **Source truth**: `Original-DDG-PCT-PDF.txt` + `PCT-prep-guide.md`
2. **GPS tracks**: Garmin GPX files → `hike_data.json` (via snapper script)
3. **UI content**: `planContent.js` + `resourcesIndex.js` (hand-curated)
4. **Map render**: `App.jsx` → `TrailMap` + `Sidebar` + `ElevationProfile`

**⚠️ Note on Public Repo:**
To keep this repository lightweight, the raw high-resolution GPX files and the generated `hike_data.json` (48k+ lines) are **excluded** from git.
- **Cloning**: When you clone this repo, `npm install` will automatically copy a **placeholder** dataset so the app builds and runs in "Demo Mode".
- **Real Data**: To generate the full dataset, you need the source Garmin GPX files (not included) and must run `python scripts/snap_camps_to_route.py`.

## 🔧 Cache Busting

After modifying `hike_data.json`, bump `VITE_HIKE_DATA_VERSION` in `.env`:

```bash
echo "VITE_HIKE_DATA_VERSION=$(date +%s)" >> pct-hike-viz/.env
```

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

✅ **Core mission complete**: Map, itinerary, gear, logistics all wired  
✅ **Data verified**: GPS-accurate elevations, 52-mile route confirmed  
✅ **Ready to hike**: All placeholder content removed, factual data only

---

*"Nursing blisters with the salve of memories"* — Dan's Original-DDG-PCT-PDF.txt
