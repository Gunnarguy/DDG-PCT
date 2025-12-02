# Plan: PCT Hike Visualization (Burney Falls to Castle Crags)

This plan outlines the steps to build a web application that visualizes the 6-day PCT hike described in the user's text file, utilizing the `nst-guide` ecosystem.

## 1. Investigation Findings

### Is 'nst-guide' a library?
No, **`nst-guide` is not a single library**. It is a collection of repositories that form a complete ecosystem for generating, hosting, and displaying topographic map data.
*   **`terrain`**: Scripts to generate elevation tiles (hillshade, contours, terrain-rgb) from USGS data.
*   **`openmaptiles`**: Scripts to generate vector map tiles from OpenStreetMap data.
*   **`data`**: Python pipelines to fetch and process trail data (waypoints, water sources).
*   **`osm-liberty-topo`**: A Mapbox GL JSON style definition that ties everything together.
*   **`web`**: A reference web application using React, Gatsby, and Deck.gl.

### How to build the web app?
You do **not** need to generate the tiles yourself. The `nst-guide` project hosts public tile servers that are used in their style definitions.
*   **Tile Server**: `https://tiles.nst.guide`
*   **Style URL**: `https://raw.githubusercontent.com/nst-guide/osm-liberty-topo/gh-pages/style.json`
*   **Method**: You can build a standard React application using `maplibre-gl` (open-source Mapbox GL compatible library) and point it to the hosted style. This avoids the complexity of running the generation scripts.

### Tech Stack of 'web'
*   **Framework**: React (via GatsbyJS)
*   **Map Rendering**: `react-map-gl` (Mapbox GL JS wrapper) + `deck.gl` (for advanced visualizations).
*   **UI**: Semantic UI React.
*   **Language**: TypeScript/JavaScript.

### Integrating the Custom Itinerary
The itinerary from `Original-DDG-PCT-PDF.txt` needs to be converted into **GeoJSON** format.
1.  **Parse**: Extract the daily start/end points (Burney Falls, Round Valley, etc.).
2.  **Geocode**: Find the latitude/longitude for these named locations.
3.  **Format**: Create a GeoJSON `FeatureCollection` containing:
    *   `Point` features for campsites.
    *   `LineString` features for the daily route segments (ideally snapped to the PCT trail geometry).
4.  **Overlay**: Add this GeoJSON as a source and layer in the Mapbox/Maplibre map.

## 2. Recommended Architecture

We will build a lightweight **React** application using **Vite**. We will use **MapLibre GL** instead of Mapbox GL to avoid needing an API key for the map rendering (since we are using `nst-guide` tiles, not Mapbox tiles).

### Structure
*   **Frontend**: React + Vite
*   **Map Library**: `maplibre-gl` (compatible with the `osm-liberty-topo` style)
*   **Data**: Custom GeoJSON file for the itinerary.

### Steps
1.  **Scaffold Project**: Create a new Vite React project.
2.  **Install Dependencies**: `npm install maplibre-gl react-map-gl`.
3.  **Map Component**: Create a component that loads the `osm-liberty-topo` style.
4.  **Data Integration**: Convert the text itinerary to GeoJSON and load it onto the map.
5.  **Deployment**: Deploy to GitHub Pages.

## 3. Itinerary Data (Draft)

Based on your text file, here are the segments. *Note: Coordinates need to be verified.*

*   **Day 1**: Burney Falls -> Round Valley Campground
*   **Day 2**: Round Valley -> Black Rock Camp
*   **Day 3**: Black Rock -> Horse Camp
*   **Day 4**: Horse Camp -> Indian Springs
*   **Day 5**: Indian Springs -> Castle Crags Vista
*   **Day 6**: Castle Crags Vista -> Castle Crags State Park
