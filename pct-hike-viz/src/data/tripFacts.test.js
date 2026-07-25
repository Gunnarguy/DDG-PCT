import { describe, expect, it } from "vitest";
import { primaryItinerary, tripFacts } from "./tripFacts";

describe("canonical trip facts", () => {
  it("covers the confirmed nine-day hiking window", () => {
    expect(tripFacts.dates.hikingStart).toBe("2026-08-29");
    expect(tripFacts.dates.hikingFinish).toBe("2026-09-06");
    expect(primaryItinerary).toHaveLength(9);
    expect(primaryItinerary.map((day) => day.day)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });

  it("uses the confirmed Burney Falls to Ash Camp route", () => {
    const itineraryMiles = primaryItinerary.reduce(
      (sum, day) => sum + day.distance,
      0,
    );

    expect(tripFacts.route.gpsMiles).toBe(54.2);
    expect(itineraryMiles).toBeCloseTo(54.2, 1);
    expect(primaryItinerary.at(-1).routeMileEnd).toBe(54.2);
    expect(Math.max(...primaryItinerary.map((day) => day.distance))).toBe(8.2);
  });

  it("keeps unresolved travel and campsite facts explicitly unresolved", () => {
    expect(tripFacts.outboundFlight.verification).toBe(
      "needs-booking-confirmation",
    );
    expect(tripFacts.outboundFlight.departureLocalOptions).toEqual([
      "6:40 AM",
      "10:40 AM",
    ]);
    expect(
      primaryItinerary.slice(0, -1).every(
        (day) => day.campStatus === "documented-needs-current-verification",
      ),
    ).toBe(true);
  });

  it("uses the real Ash Camp exit rather than arbitrary route mile 52", () => {
    expect(tripFacts.extractionOptions.primary.routeMile).toBe(54.2);
    expect(tripFacts.extractionOptions.primary.coordinates).toEqual({
      latitude: 41.1171,
      longitude: -122.0606,
    });
    expect(tripFacts.extractionOptions.primary.plannedDate).toBe("2026-09-06");
  });
});
