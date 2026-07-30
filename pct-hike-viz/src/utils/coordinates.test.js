import { describe, expect, it } from "vitest";
import {
  normalizeCoordinatePair,
  normalizeFeaturePoint,
  normalizeTrailCoordinate,
} from "./coordinates";

describe("coordinate normalization", () => {
  it("accepts array and object coordinate formats", () => {
    expect(normalizeCoordinatePair([-121.65, 41.01])).toEqual([-121.65, 41.01]);
    expect(
      normalizeCoordinatePair({ longitude: -121.65, latitude: 41.01 }),
    ).toEqual([-121.65, 41.01]);
  });

  it("rejects missing, non-finite, and out-of-range coordinates", () => {
    expect(normalizeCoordinatePair(undefined)).toBeNull();
    expect(normalizeCoordinatePair([Number.NaN, 41])).toBeNull();
    expect(normalizeCoordinatePair([-181, 41])).toBeNull();
    expect(normalizeCoordinatePair([-121, 91])).toBeNull();
  });

  it("requires finite elevation for trail coordinates", () => {
    expect(normalizeTrailCoordinate([-121, 41, 5000])).toEqual([
      -121, 41, 5000,
    ]);
    expect(normalizeTrailCoordinate([-121, 41, null])).toBeNull();
  });

  it("normalizes GeoJSON point features without mutating properties", () => {
    const feature = {
      geometry: {
        type: "Point",
        coordinates: { longitude: -121.65, latitude: 41.01 },
      },
      properties: { name: "Trailhead" },
    };
    expect(normalizeFeaturePoint(feature)?.geometry.coordinates).toEqual([
      -121.65, 41.01,
    ]);
    expect(normalizeFeaturePoint(feature)?.properties.name).toBe("Trailhead");
  });
});
