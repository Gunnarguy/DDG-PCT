const xmlEscape = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

export const generateGPX = (routeCoordinates, waypoints) => {
  const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="PCT Hike Viz" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>PCT Section O</name>
    <desc>Exported from PCT Mission Control Dashboard</desc>
  </metadata>
`;

  const gpxWaypoints = (waypoints || []).map(wp => `
  <wpt lat="${wp.geometry.coordinates[1]}" lon="${wp.geometry.coordinates[0]}">
    <name>${xmlEscape(wp.properties?.name) || 'Waypoint'}</name>
    <desc>${xmlEscape(wp.properties?.segment) || ''}</desc>
  </wpt>`).join("");

  const gpxRoute = `
  <trk>
    <name>Hiking Route</name>
    <trkseg>
      ${(routeCoordinates || []).map(coord => `
      <trkpt lat="${coord[1]}" lon="${coord[0]}">
        ${coord[2] !== undefined ? `<ele>${coord[2]}</ele>` : ''}
      </trkpt>`).join("")}
    </trkseg>
  </trk>
`;

  const gpxFooter = `</gpx>`;

  return gpxHeader + gpxWaypoints + gpxRoute + gpxFooter;
};
