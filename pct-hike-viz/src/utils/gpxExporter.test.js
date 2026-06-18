import { describe, it, expect } from 'vitest';
import { generateGPX } from './gpxExporter';

describe('generateGPX', () => {
  it('should generate basic GPX structure with empty inputs', () => {
    const resultNull = generateGPX(null, null);
    expect(resultNull).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(resultNull).toContain('<gpx version="1.1" creator="PCT Hike Viz" xmlns="http://www.topografix.com/GPX/1/1">');
    expect(resultNull).toContain('</gpx>');
    expect(resultNull).toContain('<name>Hiking Route</name>');
    expect(resultNull).toContain('<trkseg>');
    expect(resultNull).toContain('</trkseg>');

    const resultEmpty = generateGPX([], []);
    expect(resultEmpty).toEqual(resultNull);
  });

  it('should generate correct <trkpt> tags for route coordinates (2D and 3D)', () => {
    const routeCoordinates = [
      [-122.1, 41.2],
      [-122.2, 41.3, 1500]
    ];

    const result = generateGPX(routeCoordinates, null);

    // Check 2D coord
    expect(result).toContain('<trkpt lat="41.2" lon="-122.1">');

    // Check 3D coord
    expect(result).toContain('<trkpt lat="41.3" lon="-122.2">');
    expect(result).toContain('<ele>1500</ele>');
  });

  it('should generate correct <wpt> tags for waypoints', () => {
    const waypoints = [
      {
        geometry: { coordinates: [-121.5, 40.5] },
        properties: { name: 'Camp 1', segment: 'Section O' }
      },
      {
        geometry: { coordinates: [-121.6, 40.6] },
        properties: { name: undefined, segment: undefined } // Test missing properties fallback
      }
    ];

    const result = generateGPX(null, waypoints);

    // First waypoint
    expect(result).toContain('<wpt lat="40.5" lon="-121.5">');
    expect(result).toContain('<name>Camp 1</name>');
    expect(result).toContain('<desc>Section O</desc>');

    // Second waypoint
    expect(result).toContain('<wpt lat="40.6" lon="-121.6">');
    expect(result).toContain('<name>Waypoint</name>'); // fallback
    expect(result).toContain('<desc></desc>'); // fallback empty string
  });

  it('should correctly escape XML characters in waypoint properties', () => {
    const waypoints = [
      {
        geometry: { coordinates: [-121.0, 40.0] },
        properties: {
          name: 'Camp < & >',
          segment: '"Quotes" & \'Apos\''
        }
      }
    ];

    const result = generateGPX(null, waypoints);

    expect(result).toContain('<name>Camp &lt; &amp; &gt;</name>');
    expect(result).toContain('<desc>&quot;Quotes&quot; &amp; &apos;Apos&apos;</desc>');
  });
});
