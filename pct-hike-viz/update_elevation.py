import json
import xml.etree.ElementTree as ET
import os

# Paths
GPX_PATH = "../COURSE_334289912.gpx"
JSON_SRC_PATH = "src/hike_data.json"
JSON_PUBLIC_PATH = "public/data/hike_data.json"

def parse_gpx(gpx_path):
    """Parse GPX file and extract lat/lon/elevation points."""
    tree = ET.parse(gpx_path)
    root = tree.getroot()
    ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
    
    points = []
    for trkpt in root.findall('.//gpx:trkpt', ns):
        lat_str = trkpt.get('lat')
        lon_str = trkpt.get('lon')
        # Skip points missing coordinates
        if lat_str is None or lon_str is None:
            continue
        lat = float(lat_str)
        lon = float(lon_str)
        ele_elem = trkpt.find('gpx:ele', ns)
        if ele_elem is not None and ele_elem.text is not None:
            ele = float(ele_elem.text)
            # Convert meters to feet
            ele_ft = ele * 3.28084
            points.append([lon, lat, round(ele_ft, 1)])
        else:
            points.append([lon, lat])
    return points

def update_json(json_path, new_path_data):
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    # Update the route path
    if 'route' in data:
        print(f"Updating route path in {json_path} with {len(new_path_data)} points.")
        data['route']['path'] = new_path_data
        
        # Also calculate min/max elevation for metadata if useful, but for now just the path
        eles = [p[2] for p in new_path_data if len(p) > 2]
        if eles:
            data['route']['properties'] = data['route'].get('properties', {})
            data['route']['properties']['min_elevation'] = min(eles)
            data['route']['properties']['max_elevation'] = max(eles)
            
    with open(json_path, 'w') as f:
        json.dump(data, f, indent=2)

def main():
    print("Parsing GPX...")
    points = parse_gpx(GPX_PATH)
    print(f"Found {len(points)} points with elevation.")
    
    print("Updating src/hike_data.json...")
    update_json(JSON_SRC_PATH, points)
    
    print("Updating public/data/hike_data.json...")
    update_json(JSON_PUBLIC_PATH, points)
    
    print("Done.")

if __name__ == "__main__":
    main()
