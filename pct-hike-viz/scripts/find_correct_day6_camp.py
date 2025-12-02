#!/usr/bin/env python3
"""Find the correct Day 6 camp location ~8 miles from Vista Camp."""

import json
from pathlib import Path
from math import radians, cos, sin, asin, sqrt

script_dir = Path(__file__).parent
data_path = script_dir.parent / 'src' / 'hike_data.json'
with open(data_path) as f:
    data = json.load(f)

route_coords = data.get('route', {}).get('path', data.get('route', {}).get('geometry', {}).get('coordinates', []))
camps = [f for f in data['features'] if f['properties'].get('day', -1) >= 0]
camps.sort(key=lambda x: x['properties']['day'])

def haversine(lon1, lat1, lon2, lat2):
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return 6371000 * c

# Find Vista Camp (Day 5) in route
vista_coords = [-121.982003, 41.139897]
min_dist = float('inf')
vista_idx = 0
for i, pt in enumerate(route_coords):
    dist = haversine(vista_coords[0], vista_coords[1], pt[0], pt[1])
    if dist < min_dist:
        min_dist = dist
        vista_idx = i

print(f"Vista Camp is at route index {vista_idx}")
print(f"Vista Camp coords: {route_coords[vista_idx]}")
print(f"Vista Camp elevation: {route_coords[vista_idx][2]:.0f} ft")
print()

# Walk ~8 miles down the trail from Vista
TARGET_MILES = 8.0
cumulative_miles = 0
day6_idx = vista_idx

for i in range(vista_idx, len(route_coords) - 1):
    segment_meters = haversine(route_coords[i][0], route_coords[i][1],
                               route_coords[i+1][0], route_coords[i+1][1])
    cumulative_miles += segment_meters / 1609.34
    
    if cumulative_miles >= TARGET_MILES:
        day6_idx = i + 1
        break

day6_point = route_coords[day6_idx]
print(f"Proposed Day 6 camp location ({cumulative_miles:.1f} miles from Vista):")
print(f"  Coordinates: [{day6_point[0]:.6f}, {day6_point[1]:.6f}]")
print(f"  Elevation: {day6_point[2]:.0f} ft")
print()

# Calculate what remains to actual trail end
remaining_miles = 0
for i in range(day6_idx, len(route_coords) - 1):
    segment_meters = haversine(route_coords[i][0], route_coords[i][1],
                               route_coords[i+1][0], route_coords[i+1][1])
    remaining_miles += segment_meters / 1609.34

print(f"Remaining to trail end: {remaining_miles:.1f} miles")
print()
print("SUMMARY:")
print(f"Days 1-5: 44.0 miles (matches PDF plan)")
print(f"Day 6 (corrected): {cumulative_miles:.1f} miles")
print(f"Total for 6-day plan: {44.0 + cumulative_miles:.1f} miles")
print()
print(f"This leaves {remaining_miles:.1f} miles if continuing to Dunsmuir/end of Section O")
print("(Could be a 7th day or exit point for resupply)")
