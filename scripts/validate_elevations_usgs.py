#!/usr/bin/env python3
"""Validate GPS elevations against USGS National Map Elevation API."""

import asyncio
import aiohttp
import json

waypoints = [
    ("Burney Falls Trailhead", 41.013480, -121.620709, "3,020 ft"),
    ("Round Valley Camp", 41.027728, -121.732282, "3,765 ft"),
    ("Black Rock Camp", 41.091989, -121.800767, "5,425 ft"),
    ("Horse Camp", 41.168960, -121.783984, "5,297 ft"),
    ("Indian Springs Camp", 41.173417, -121.897491, "5,605 ft"),
]

async def process_waypoint(session, waypoint):
    name, lat, lon, gps_elev = waypoint
    url = f"https://epqs.nationalmap.gov/v1/json?x={lon}&y={lat}&units=Feet&wkid=4326"
    try:
        async with session.get(url) as response:
            data = await response.json()
            usgs_elev = round(float(data['value']))
            gps_feet = int(gps_elev.replace(',', '').replace(' ft', ''))
            diff = gps_feet - usgs_elev
            pct_error = abs(diff / usgs_elev * 100)
            
            # Color code based on error
            status = "✓" if pct_error < 3.0 else "⚠" if pct_error < 5.0 else "✗"
            
            return f"{name:<25} {gps_feet:>6}ft  {usgs_elev:>6}ft  {diff:>+5}ft  {pct_error:>4.1f}% {status}"
    except Exception as e:
        return f"{name:<25} {gps_elev:<10} ERROR: {e}"

async def main():
    print("=" * 75)
    print("GPS ELEVATION VALIDATION vs. USGS NATIONAL MAP")
    print("=" * 75)
    print(f"\n{'Location':<25} {'GPS':<10} {'USGS':<10} {'Diff':<8} {'%Err':<6}")
    print("-" * 75)

    async with aiohttp.ClientSession() as session:
        tasks = [process_waypoint(session, wp) for wp in waypoints]
        results = await asyncio.gather(*tasks)
        for result in results:
            print(result)

    print("-" * 75)
    print("\n✓ = <3% error (excellent)  |  ⚠ = 3-5% error (good)  |  ✗ = >5% error (check)")
    print("=" * 75)

if __name__ == '__main__':
    asyncio.run(main())
