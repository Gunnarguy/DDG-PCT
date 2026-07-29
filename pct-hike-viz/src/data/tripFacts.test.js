import { describe, expect, it } from "vitest";
import { primaryItinerary, tripFacts } from "./tripFacts";

describe("canonical trip facts", () => {
  it("covers the eight-day hiking window plus a contingency day", () => {
    expect(tripFacts.dates.hikingStart).toBe("2026-08-29");
    expect(tripFacts.dates.hikingFinish).toBe("2026-09-05");
    expect(tripFacts.dates.contingency).toBe("2026-09-06");
    expect(primaryItinerary).toHaveLength(8);
    expect(primaryItinerary.map((day) => day.day)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("uses the confirmed Burney Falls to Ash Camp route", () => {
    const itineraryMiles = primaryItinerary.reduce(
      (sum, day) => sum + day.distance,
      0,
    );

    expect(tripFacts.route.officialMiles).toBe(51.844);
    expect(tripFacts.route.gpsMiles).toBe(51.664);
    expect(itineraryMiles).toBeCloseTo(51.844, 3);
    expect(primaryItinerary.at(-1).routeMileEnd).toBe(51.844);
    expect(Math.max(...primaryItinerary.map((day) => day.distance))).toBe(12.591);
    expect(primaryItinerary.find((day) => day.day === 3)).toMatchObject({
      to: "Bartle Gap supported extraction",
      packMode: "day-pack-supported",
      stopType: "support-transfer",
      campStatus: "support-transfer-needs-booking-road-check",
    });
  });

  it("keeps travel, campsite, and support verification states explicit", () => {
    expect(tripFacts.outboundFlight.verification).toBe(
      "provided-by-team-needs-united-booking",
    );
    expect(tripFacts.outboundFlight.scheduledDepartureLocal).toBe("6:40 AM PDT");
    expect(
      primaryItinerary.find((day) => day.day === 2)?.campStatus,
    ).toBe("gis-screened-needs-ground-check");
    expect(primaryItinerary.find((day) => day.day === 3)?.stopType).toBe(
      "support-transfer",
    );
  });

  it("uses the real Ash Camp exit rather than arbitrary route mile 52", () => {
    expect(tripFacts.extractionOptions.primary.routeMile).toBe(51.844);
    expect(tripFacts.extractionOptions.primary.coordinates).toEqual({
      latitude: 41.1170914,
      longitude: -122.0606252,
    });
    expect(tripFacts.extractionOptions.primary.plannedDate).toBe("2026-09-05");
    expect(tripFacts.extractionOptions.primary.backupDate).toBe("2026-09-06");
  });

  it("exposes granular ascent, descent, and knee-load planning metrics", () => {
    const day2 = primaryItinerary.find((day) => day.day === 2);
    const day8 = primaryItinerary.find((day) => day.day === 8);

    expect(day2.elevation.gain).toBe(2199);
    expect(day2.terrainLoad.effortRank).toBe(2);
    expect(day8.elevation.loss).toBe(917);
    expect(day8.terrainLoad.descentPerMile).toBe(238);
    expect(day8.terrainLoad.kneeLoad).toBe("high");
    const day7 = primaryItinerary.find((day) => day.day === 7);
    expect(day7.elevation.loss).toBe(1834);
    expect(day7.terrainLoad.descentPerMile).toBe(327);
    expect(day7.terrainLoad.kneeLoad).toBe("very-high");
  });
});
