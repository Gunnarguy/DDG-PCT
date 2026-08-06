import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  describeGeolocationError,
  formatOffTrail,
  locateOnRoute,
  nextStopAhead,
} from "./trailPosition";

/**
 * Independent spherical check on the planar approximation used by
 * locateOnRoute. Recomputing the same planar math here would prove nothing, so
 * the off-trail assertions below are graded against haversine instead.
 */
const haversineFeet = (from, to) => {
  const radius = 20902259;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(to[1] - from[1]);
  const deltaLongitude = toRadians(to[0] - from[0]);
  const half =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(from[1])) *
      Math.cos(toRadians(to[1])) *
      Math.sin(deltaLongitude / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(half));
};

// A single north-south segment: 0.01° of latitude, 100 ft of climb, 0.69 mi.
const straightSegment = [
  [-121.0, 41.0, 3000, 0],
  [-121.0, 41.01, 3100, 0.6909],
];

const hikeData = JSON.parse(
  readFileSync(new URL("../../public/data/hike_data.json", import.meta.url)),
);
const canonicalRoute = hikeData.route.path;
const canonicalCamps = hikeData.features.filter(
  (feature) => feature.properties.day >= 0,
);

describe("snapping a GPS fix to the route", () => {
  it("interpolates mile and elevation between two points", () => {
    const fix = locateOnRoute(straightSegment, [-121.0, 41.005]);

    expect(fix.offTrailFeet).toBeLessThan(0.5);
    expect(fix.routeMile).toBeCloseTo(0.34545, 4);
    expect(fix.elevationFeet).toBeCloseTo(3050, 6);
  });

  it("measures perpendicular drift off the corridor", () => {
    const fix = locateOnRoute(straightSegment, [-120.999, 41.005]);
    const expected = haversineFeet([-121.0, 41.005], [-120.999, 41.005]);

    expect(expected).toBeGreaterThan(270);
    expect(fix.offTrailFeet).toBeCloseTo(expected, 0);
    // Drifting sideways does not move you along the trail.
    expect(fix.routeMile).toBeCloseTo(0.34545, 4);
  });

  it("clamps past either end instead of extrapolating a mile that does not exist", () => {
    const beforeStart = locateOnRoute(straightSegment, [-121.0, 40.99]);
    const pastEnd = locateOnRoute(straightSegment, [-121.0, 41.02]);

    expect(beforeStart.routeMile).toBe(0);
    expect(pastEnd.routeMile).toBeCloseTo(0.6909, 6);
    // Both are a real distance away, and the readout should say so.
    expect(beforeStart.offTrailFeet).toBeCloseTo(
      haversineFeet([-121.0, 40.99], [-121.0, 41.0]),
      0,
    );
  });

  it("returns null rather than a wrong number for an unusable fix", () => {
    expect(locateOnRoute(straightSegment, null)).toBeNull();
    expect(locateOnRoute(straightSegment, [Number.NaN, 41])).toBeNull();
    expect(locateOnRoute([], [-121.0, 41.0])).toBeNull();
  });

  it("handles a degenerate single-point route", () => {
    const fix = locateOnRoute([[-121.0, 41.0, 3000, 4.2]], [-121.0, 41.001]);

    expect(fix.routeMile).toBe(4.2);
    expect(fix.offTrailFeet).toBeCloseTo(
      haversineFeet([-121.0, 41.001], [-121.0, 41.0]),
      0,
    );
  });
});

describe("snapping against the canonical 3,345-point route", () => {
  it("recovers the exact PCTA route mile when standing on a route point", () => {
    for (const index of [0, 1200, 2500, canonicalRoute.length - 1]) {
      const point = canonicalRoute[index];
      const fix = locateOnRoute(canonicalRoute, [point[0], point[1]]);

      expect(fix.offTrailFeet).toBeLessThan(0.5);
      expect(fix.routeMile).toBeCloseTo(point[3], 5);
      expect(fix.elevationFeet).toBeCloseTo(point[2], 2);
    }
  });

  it("pins the finish at the official 51.844-mile mark", () => {
    const finish = canonicalRoute.at(-1);
    const fix = locateOnRoute(canonicalRoute, [finish[0], finish[1]]);

    expect(fix.routeMile).toBeCloseTo(51.844, 6);
  });

  it("reports drift for a fix a quarter mile off the corridor", () => {
    const point = canonicalRoute[1800];
    // ~0.0048° of latitude is a bit over a quarter mile due north.
    const strayed = [point[0], point[1] + 0.0048];
    const fix = locateOnRoute(canonicalRoute, strayed);

    expect(fix.offTrailFeet).toBeGreaterThan(1000);
    expect(fix.offTrailFeet).toBeLessThan(2000);
  });
});

describe("next stop ahead", () => {
  it("skips camps already behind you and names the next one", () => {
    const atStart = nextStopAhead(canonicalCamps, 0);
    expect(atStart).toMatchObject({ day: 1, routeMile: 5.609 });
    expect(atStart.milesAhead).toBeCloseTo(5.609, 3);

    // Mid-way through the Day 4 push out of Moosehead Creek.
    const midDayFour = nextStopAhead(canonicalCamps, 30);
    expect(midDayFour).toMatchObject({ day: 4, routeMile: 32.247 });
    expect(midDayFour.milesAhead).toBeCloseTo(2.247, 3);
  });

  it("returns null past the finish and for an unusable mile", () => {
    expect(nextStopAhead(canonicalCamps, 51.844)).toBeNull();
    expect(nextStopAhead(canonicalCamps, Number.NaN)).toBeNull();
    expect(nextStopAhead(null, 10)).toBeNull();
  });
});

describe("explaining a missing dot", () => {
  it("says GPS still works without cell service on every failure", () => {
    expect(describeGeolocationError({ code: 1 })).toMatch(/no cell service/i);
    expect(describeGeolocationError({ code: 2 })).toMatch(
      /does not use the cell network/i,
    );
    expect(describeGeolocationError({ code: 3 })).toMatch(/slow, not broken/i);
  });

  it("falls back to the underlying message and to null when there is no error", () => {
    expect(describeGeolocationError({ message: "kaput" })).toContain("kaput");
    expect(describeGeolocationError(null)).toBeNull();
  });
});

describe("off-trail formatting", () => {
  it("switches from feet to miles at a tenth of a mile", () => {
    expect(formatOffTrail(412)).toBe("412 ft");
    expect(formatOffTrail(527)).toBe("527 ft");
    expect(formatOffTrail(528)).toBe("0.10 mi");
    expect(formatOffTrail(7392)).toBe("1.40 mi");
    expect(formatOffTrail(Number.NaN)).toBe("unknown");
  });
});
