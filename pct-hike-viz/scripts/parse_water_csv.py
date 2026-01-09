import csv, json
from pathlib import Path

csv_path = Path('/tmp/pct_water_northern_ca.csv')
# Use canonical runtime artifact for geometry snaps
route_path = Path(__file__).parent.parent / "public" / "data" / "hike_data.json"

route_data = json.loads(route_path.read_text())
route_coords = route_data.get('route', {}).get('path', [])

def find_nearest_coord(mile_target):
    """Snap to route geometry using simple linear interpolation by index."""
    if not route_coords or len(route_coords) < 2:
        return None
    # Section O starts ~mile 1420.7 (Burney Falls), ends ~mile 1502 (Castle Crags)
    # Our GPX is ~83 miles total
    section_start_mile = 1420.7
    section_end_mile = 1502.0
    section_length = section_end_mile - section_start_mile
    if mile_target < section_start_mile or mile_target > section_end_mile:
        return None
    normalized = (mile_target - section_start_mile) / section_length
    idx = int(normalized * (len(route_coords) - 1))
    idx = max(0, min(idx, len(route_coords) - 1))
    return route_coords[idx]

water_sources = []
with csv_path.open('r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for i, row in enumerate(reader):
        if i < 9 or not row or len(row) < 4:
            continue
        try:
            mile = float(row[1])
        except (ValueError, IndexError):
            continue
        if mile < 1420 or mile > 1502:
            continue
        waypoint_id = row[2].strip() if len(row) > 2 else ''
        location = row[3].strip() if len(row) > 3 else 'Water source'
        report = row[4].strip() if len(row) > 4 else ''
        coords = find_nearest_coord(mile)
        if coords:
            water_sources.append({
                'mile': mile,
                'waypoint': waypoint_id,
                'name': location[:80],
                'coordinates': coords,
                'report': report[:200] if report else 'No recent update',
                'type': 'water'
            })

print(f"Extracted {len(water_sources)} water sources between mile 1420-1502")
for w in water_sources[:10]:
    print(f"  Mile {w['mile']}: {w['name']}")
print('...')

out_path = Path('/tmp/water_sources_section_o.json')
out_path.write_text(json.dumps(water_sources, indent=2))
print(f"\nWrote {len(water_sources)} sources to {out_path}")
