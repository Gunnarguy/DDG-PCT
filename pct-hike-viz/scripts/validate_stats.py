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
print(f'Active Garmin route: 51.664 GPS miles to Ash Camp')
print(f'Match: {"✓" if abs(total_miles - 51.664) <= 0.2 else "✗"}')

# Elevation analysis
start_elev = coords[0][2]
end_elev = coords[-1][2]
net_change = end_elev - start_elev

print(f'\n--- ELEVATION ---')
print(f'Start: {start_elev:.1f} ft')
print(f'End: {end_elev:.1f} ft')
print(f'Net change: {net_change:+.1f} ft')

print(f'\nActive GPS start reference: ~2,949 ft')
print(f'GPS route finish elevation: {end_elev:.0f} ft')
print(f'Start match: {"✓" if 2900 <= start_elev <= 3050 else "✗"}')
print(f'Finish is plausible for Ash Camp: {"✓" if 2300 <= end_elev <= 3300 else "⚠"}')

properties = route.get('properties', {})
gain = properties.get('total_gain_feet', 0)
loss = properties.get('total_loss_feet', 0)
method = properties.get('elevation_accumulation_method', 'method unavailable')

print(f'\n--- NORMALIZED CUMULATIVE GAIN/LOSS ---')
print(f'Total gain: {gain:.0f} ft')
print(f'Total loss: {loss:.0f} ft')
print(f'Method: {method}')

# Historical estimate from the incomplete six-row narrative.
doc_gain = (3200-2300) + (3650-3200) + (4000-3650) + (4800-4000) + (5850-4800)
doc_loss = (3600-5850)
print(f'\nLegacy six-row estimated gain: ~{doc_gain} ft')
print(f'Legacy six-row estimated loss: ~{abs(doc_loss)} ft')

print(f'\nNote: the historical six-row narrative stops at 52 miles and is not the active itinerary.')
print(f'PCTA mileage controls distance; the normalized user-supplied Garmin GPX controls terrain totals.')

print('\n' + '=' * 60)
