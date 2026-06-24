#!/usr/bin/env python3
"""Validate GPS elevations against USGS National Map Elevation API."""

import urllib.request
import json
import time
import concurrent.futures

waypoints = [
    ("Burney Falls Trailhead", 41.013480, -121.620709, "3,020 ft"),
    ("Round Valley Camp", 41.027728, -121.732282, "3,765 ft"),
    ("Black Rock Camp", 41.091989, -121.800767, "5,425 ft"),
    ("Horse Camp", 41.168960, -121.783984, "5,297 ft"),
    ("Indian Springs Camp", 41.173417, -121.897491, "5,605 ft"),
]

def process_waypoint(waypoint):
    name, lat, lon, gps_elev = waypoint
    url = f"https://epqs.nationalmap.gov/v1/json?x={lon}&y={lat}&units=Feet&wkid=4326"
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read())
            usgs_elev = round(float(data['value']))
            gps_feet = int(gps_elev.replace(',', '').replace(' ft', ''))
            diff = gps_feet - usgs_elev
            pct_error = abs(diff / usgs_elev * 100)
            
            # Color code based on error
            status = "✓" if pct_error < 3.0 else "⚠" if pct_error < 5.0 else "✗"
            
            return f"{name:<25} {gps_feet:>6}ft  {usgs_elev:>6}ft  {diff:>+5}ft  {pct_error:>4.1f}% {status}"
    except Exception as e:
        return f"{name:<25} {gps_elev:<10} ERROR: {e}"

print("=" * 75)
print("GPS ELEVATION VALIDATION vs. USGS NATIONAL MAP")
print("=" * 75)
print(f"\n{'Location':<25} {'GPS':<10} {'USGS':<10} {'Diff':<8} {'%Err':<6}")
print("-" * 75)

# Use ThreadPoolExecutor to make requests concurrently
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
    # Map preserves the order of results
    results = executor.map(process_waypoint, waypoints)
    for result in results:
        print(result)

print("-" * 75)
print("\n✓ = <3% error (excellent)  |  ⚠ = 3-5% error (good)  |  ✗ = >5% error (check)")
print("=" * 75)
