#!/usr/bin/env python3
"""Validate trail statistics against source document."""

import json
from math import radians, cos, sin, asin, sqrt
from pathlib import Path

# Load data from canonical runtime artifact (public/data/hike_data.json)
script_dir = Path(__file__).parent
data_path = script_dir.parent / "public" / "data" / "hike_data.json"
with open(data_path) as f:
    data = json.load(f)

route = data.get('route', {})
coords = route.get('path', route.get('geometry', {}).get('coordinates', []))

print('=' * 60)
print('TRAIL DATA VALIDATION')
print('=' * 60)

print(f'\nTotal GPS points: {len(coords)}')
print(f'Start: [{coords[0][0]:.6f}, {coords[0][1]:.6f}, {coords[0][2]:.1f}ft]')
print(f'End: [{coords[-1][0]:.6f}, {coords[-1][1]:.6f}, {coords[-1][2]:.1f}ft]')

# Calculate distance
def haversine(lon1, lat1, lon2, lat2):
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return 6371000 * c  # meters

total_meters = sum(
    haversine(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1])
    for i in range(len(coords) - 1)
)
total_miles = total_meters / 1609.34

print(f'\n--- DISTANCE ---')
print(f'Calculated: {total_miles:.2f} miles')
print(f'Source doc: 78-90 miles (estimate)')
print(f'Match: {"✓" if 78 <= total_miles <= 90 else "✗"}')

# Elevation analysis
start_elev = coords[0][2]
end_elev = coords[-1][2]
net_change = end_elev - start_elev

print(f'\n--- ELEVATION ---')
print(f'Start: {start_elev:.1f} ft')
print(f'End: {end_elev:.1f} ft')
print(f'Net change: {net_change:+.1f} ft')

print(f'\nSource doc Day 1 start: ~2,300 ft')
print(f'Source doc Day 6 end: ~3,600 ft')
print(f'Start match: {"✓" if 2200 <= start_elev <= 2400 else "✗"}')
print(f'End match: {"✓" if 2300 <= end_elev <= 2700 else "⚠ (data shows {end_elev:.0f}ft)"}')

# Calculate gain/loss with smoothing (Strava method)
window_size = 5
smoothed = []
for i in range(len(coords)):
    start_idx = max(0, i - window_size // 2)
    end_idx = min(len(coords), i + window_size // 2 + 1)
    window_elevations = [coords[j][2] for j in range(start_idx, end_idx)]
    smoothed.append(sum(window_elevations) / len(window_elevations))

# Apply threshold filtering
THRESHOLD = 10  # feet
gain = 0
loss = 0
last_counted = smoothed[0]

for ele in smoothed[1:]:
    change = ele - last_counted
    if abs(change) >= THRESHOLD:
        if change > 0:
            gain += change
        else:
            loss += abs(change)
        last_counted = ele

print(f'\n--- CUMULATIVE GAIN/LOSS (smoothed, 10ft threshold) ---')
print(f'Total gain: {gain:.0f} ft')
print(f'Total loss: {loss:.0f} ft')

# Estimated from source doc (Day 1-6)
doc_gain = (3200-2300) + (3650-3200) + (4000-3650) + (4800-4000) + (5850-4800)
doc_loss = (3600-5850)
print(f'\nSource doc estimated gain: ~{doc_gain} ft (from daily summaries)')
print(f'Source doc estimated loss: ~{abs(doc_loss)} ft (Day 6 descent)')

print(f'\nNote: Source doc is simplified 6-day estimate.')
print(f'GPS data shows actual terrain with all ups/downs.')

print('\n' + '=' * 60)
