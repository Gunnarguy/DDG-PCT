# DDG · Burney Falls ➜ Castle Crags Mission Control

This Vite + React application digests everything in `Original-DDG-PCT-PDF.txt` and visualizes it on top of the full **NST Guide** mapping stack. It is built specifically for planning a late-August Pacific Crest Trail push from Burney Falls State Park to Castle Crags, complete with day-by-day intel, transportation strategy, resupply plans, and permit checklists.

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

* **Deck.gl route layer** – multicolor segments show daily mileage, totally derived from the itinerary in the PDF.
* **Interactive markers** – tap a campsite to view day-specific notes, elevation gains, and “need-to-remember” comments from the narrative.
* **Schedule comparison** – 9-day vs. 16-day options so the team can debate PTO and budget trade-offs.
* **Travel, resupply, and permits** – every logistical bullet from the document is captured with actionable lists and outbound links to the source research.

## Getting started

```bash
cd pct-hike-viz
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`) and start exploring. Build with `npm run build` for a production bundle (expect large chunks because of MapLibre + deck.gl).

## Data sources

* `src/hike_data.json` – GeoJSON-style data derived from `Original-DDG-PCT-PDF.txt` (points, route segments, Dunsmuir waypoint).
* `src/data/planContent.js` – Structured logistics (schedules, travel plan, resupply notes, permit checklist, research links) extracted verbatim from the narrative and associated research URLs.

Swap these files with live feeds (e.g., from `nst-guide/data` pipelines or the PCT water report) when you are ready for real-time planning.
