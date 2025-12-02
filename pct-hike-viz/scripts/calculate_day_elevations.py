#!/usr/bin/env python3
"""Calculate accurate elevation data for each day from GPS coordinates."""

import json
from pathlib import Path
from math import radians, cos, sin, asin, sqrt

# Load data
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
    return 6371000 * c  # meters

def find_nearest_route_point(camp_coords):
    """Find nearest point on route to a camp."""
    min_dist = float('inf')
    nearest = None
    for pt in route_coords:
        dist = haversine(camp_coords[0], camp_coords[1], pt[0], pt[1])
        if dist < min_dist:
            min_dist = dist
            nearest = pt
    return nearest

# Smooth elevation data
def smooth_elevations(coords, window=5):
    smoothed = []
    for i in range(len(coords)):
        start = max(0, i - window // 2)
        end = min(len(coords), i + window // 2 + 1)
        window_vals = [coords[j][2] for j in range(start, end)]
        smoothed.append(sum(window_vals) / len(window_vals))
    return smoothed

smoothed_elevations = smooth_elevations(route_coords)

# Calculate gain/loss between points using 10ft threshold
def calc_gain_loss(start_idx, end_idx):
    gain = loss = 0
    last_counted = smoothed_elevations[start_idx]
    THRESHOLD = 10
    
    for i in range(start_idx + 1, end_idx + 1):
        change = smoothed_elevations[i] - last_counted
        if abs(change) >= THRESHOLD:
            if change > 0:
                gain += change
            else:
                loss += abs(change)
            last_counted = smoothed_elevations[i]
    
    return round(gain), round(loss)

print("SCIENTIFICALLY ACCURATE ELEVATION DATA")
print("=" * 80)
print("Based on GPS route data with 5-point smoothing + 10ft threshold\n")

# Map camps to route indices
camp_route_indices = []
for camp in camps:
    camp_coords = camp['geometry']['coordinates']
    nearest_pt = find_nearest_route_point(camp_coords)
    if nearest_pt is None:
        print(f"Warning: Could not find route point for {camp['properties']['name']}")
        continue
    idx = route_coords.index(nearest_pt)
    camp_route_indices.append((camp['properties']['day'], camp['properties']['name'], idx, nearest_pt[2]))

for i, (day, name, idx, elev) in enumerate(camp_route_indices):
    if i == 0:
        print(f"Day {day} (Start): {name}")
        print(f"  Elevation: {elev:.0f} ft")
        print()
        continue
    
    prev_day, prev_name, prev_idx, prev_elev = camp_route_indices[i-1]
    gain, loss = calc_gain_loss(prev_idx, idx)
    
    # Calculate distance
    segment_dist = sum(haversine(route_coords[j][0], route_coords[j][1], 
                                  route_coords[j+1][0], route_coords[j+1][1]) 
                        for j in range(prev_idx, idx)) / 1609.34
    
    print(f"Day {day}: {prev_name} → {name}")
    print(f"  Start elevation: {prev_elev:.0f} ft")
    print(f"  End elevation: {elev:.0f} ft")
    print(f"  Net change: {elev - prev_elev:+.0f} ft")
    print(f"  Cumulative gain: +{gain} ft")
    print(f"  Cumulative loss: -{loss} ft")
    print(f"  Distance: {segment_dist:.1f} mi")
    print()

print("\nJavaScript format for planContent.js:\n")
for i, (day, name, idx, elev) in enumerate(camp_route_indices):
    if i == 0:
        continue
    prev_day, prev_name, prev_idx, prev_elev = camp_route_indices[i-1]
    gain, loss = calc_gain_loss(prev_idx, idx)
    print(f"  // Day {day}")
    print(f"  elevation: {{ start: {prev_elev:.0f}, end: {elev:.0f}, gain: {gain}, loss: {loss} }},")
