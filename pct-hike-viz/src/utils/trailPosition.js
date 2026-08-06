import { normalizeCoordinatePair } from "./coordinates";

/**
 * Turns a raw GPS fix into the only three numbers that matter on trail: which
 * route mile you are standing at, how far off the corridor you have drifted,
 * and how much farther it is to the next camp.
 *
 * A blue dot floating on a basemap answers none of those. The canonical route
 * carries an explicit PCTA route mile on every one of its 3,345 points, so
 * snapping a fix to that line converts "somewhere near a green squiggle" into
 * "mile 28.4, 60 ft off trail, 3.8 mi to the saddle camp" — which is what you
 * actually need when deciding whether to push on before dark.
 *
 * None of this needs a network. GPS is satellite-based and keeps producing a
 * fix in a dead zone; only the basemap tiles underneath require data.
 */

// IUGG mean Earth radius, in feet. The route spans 51.844 mi around 41°N, so a
// spherical model is accurate to far better than the GPS error being measured
// against it.
const EARTH_RADIUS_FEET = 20902259;
const FEET_PER_DEGREE = (EARTH_RADIUS_FEET * Math.PI) / 180;

export const FEET_PER_MILE = 5280;

/**
 * Projects a lon/lat pair into a local planar frame measured in feet, anchored
 * at `origin`. Over the few hundred feet that separate a hiker from the trail
 * this is exact for our purposes, and it makes the segment projection below a
 * plain 2D dot product instead of spherical trigonometry.
 */
const toLocalFeet = (point, origin, cosLatitude) => [
  (Number(point[0]) - origin[0]) * cosLatitude * FEET_PER_DEGREE,
  (Number(point[1]) - origin[1]) * FEET_PER_DEGREE,
];

const lerp = (from, to, t) => {
  const start = Number(from);
  const end = Number(to);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return start + (end - start) * t;
};

/**
 * Snaps a GPS fix to the nearest point on the route polyline.
 *
 * Every segment is tested rather than only those adjacent to the nearest
 * vertex. At ~82 ft point spacing the shortcut would almost always agree, but
 * "almost always" is not worth the risk on a navigation readout, and 3,344
 * dot products is nothing.
 *
 * Returns null when there is no usable fix or no route, so callers can render
 * an explanation rather than a wrong number.
 */
export const locateOnRoute = (trail, coordinates) => {
  const target = normalizeCoordinatePair(coordinates);
  if (!target || !Array.isArray(trail) || trail.length === 0) return null;

  const cosLatitude = Math.cos((target[1] * Math.PI) / 180);
  const project = (point) => toLocalFeet(point, target, cosLatitude);

  let bestSegment = 0;
  let bestT = 0;
  let bestDistanceSquared = Number.POSITIVE_INFINITY;

  if (trail.length === 1) {
    const only = project(trail[0]);
    bestDistanceSquared = only[0] ** 2 + only[1] ** 2;
  }

  for (let index = 0; index < trail.length - 1; index += 1) {
    const start = project(trail[index]);
    const end = project(trail[index + 1]);
    const deltaX = end[0] - start[0];
    const deltaY = end[1] - start[1];
    const lengthSquared = deltaX * deltaX + deltaY * deltaY;

    // The fix sits at the origin of this frame, so the vector from the segment
    // start to the hiker is simply -start, and the clamped projection
    // parameter falls out of one dot product.
    let t = 0;
    if (lengthSquared > 0) {
      t = -(start[0] * deltaX + start[1] * deltaY) / lengthSquared;
      t = Math.min(1, Math.max(0, t));
    }

    const offsetX = start[0] + t * deltaX;
    const offsetY = start[1] + t * deltaY;
    const distanceSquared = offsetX * offsetX + offsetY * offsetY;

    if (distanceSquared < bestDistanceSquared) {
      bestDistanceSquared = distanceSquared;
      bestSegment = index;
      bestT = t;
    }
  }

  const start = trail[bestSegment];
  const end = trail[Math.min(bestSegment + 1, trail.length - 1)];

  return {
    // Index of the vertex you are standing beside, for callers that need to
    // reach back into the point array (elevation profile, canopy samples).
    index: bestT < 0.5 ? bestSegment : Math.min(bestSegment + 1, trail.length - 1),
    segmentIndex: bestSegment,
    offTrailFeet: Math.sqrt(bestDistanceSquared),
    routeMile: lerp(start?.[3], end?.[3], bestT),
    elevationFeet: lerp(start?.[2], end?.[2], bestT),
    coordinates: [
      lerp(start?.[0], end?.[0], bestT),
      lerp(start?.[1], end?.[1], bestT),
    ],
  };
};

/**
 * The next scheduled stop ahead of a given route mile, with the distance still
 * to walk. Camps carry their own PCTA route mile, so this is a lookup rather
 * than a re-measurement of the line.
 */
export const nextStopAhead = (campPoints, routeMile) => {
  if (!Number.isFinite(routeMile) || !Array.isArray(campPoints)) return null;

  let best = null;
  for (const camp of campPoints) {
    const properties = camp?.properties ?? {};
    const mile = Number(properties.routeMile);
    if (!Number.isFinite(mile) || mile <= routeMile) continue;
    if (best && mile >= best.routeMile) continue;
    best = {
      name: properties.name ?? "Next stop",
      day: Number.isFinite(properties.day) ? properties.day : null,
      routeMile: mile,
      milesAhead: mile - routeMile,
    };
  }
  return best;
};

/**
 * Plain-language reason there is no dot, written for someone standing in a
 * canyon rather than for a console. A blank map read as "GPS is broken" is the
 * worst failure mode here, and the most common real cause — no cell service —
 * is not actually a cause at all, so every message says so.
 */
export const describeGeolocationError = (error) => {
  if (!error) return null;

  if (error.code === 1 /* PERMISSION_DENIED */) {
    return "Location permission is blocked for this site. Re-allow it from the lock or settings icon in the address bar, then tap Locate again. GPS itself still works with no cell service — the browser just is not allowed to read it.";
  }
  if (error.code === 2 /* POSITION_UNAVAILABLE */) {
    return "No GPS fix yet. Under heavy canopy or down in a canyon the first fix can take a minute — step into the open, keep the screen awake, and try again. This is not a signal problem; GPS does not use the cell network.";
  }
  if (error.code === 3 /* TIMEOUT */) {
    return "The GPS fix timed out before the phone got a position. Stay put with the screen on and tap Locate again — a cold fix under tree cover is slow, not broken.";
  }
  return error.message
    ? `Location is unavailable: ${error.message}`
    : "Location is unavailable for an unknown reason.";
};

/**
 * Why the browser will not even be asked. Geolocation is gated on a secure
 * context, so a page opened over plain http silently has no API at all.
 */
export const describeGeolocationSupport = () => {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return "This browser does not expose a location API, so the map cannot show your position.";
  }
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return "Browsers only hand out GPS over a secure connection. Open this page over https (the GitHub Pages build already is) and the position will work.";
  }
  return null;
};

/** "412 ft" below a tenth of a mile, "1.4 mi" above it. */
export const formatOffTrail = (feet) => {
  if (!Number.isFinite(feet)) return "unknown";
  if (feet < FEET_PER_MILE / 10) return `${Math.round(feet)} ft`;
  return `${(feet / FEET_PER_MILE).toFixed(2)} mi`;
};
