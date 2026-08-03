import { describe, expect, it } from "vitest";
import {
  CURRENT_TERRAIN_CONTRACT_SHA256,
  CURRENT_TERRAIN_PLAN_VERSION,
  mergeWaterSourcesWithLiveConditions,
} from "./trailConditionsService";

const snapshot = {
  planVersion: CURRENT_TERRAIN_PLAN_VERSION,
  fetchedAt: "2026-08-03T00:54:22.090Z",
  routeFacts: {
    terrainContractVersion: CURRENT_TERRAIN_PLAN_VERSION,
    dataContractSha256: CURRENT_TERRAIN_CONTRACT_SHA256,
  },
  water: {
    sourceUrl: "https://pctwater.com/",
    sources: [
      {
        mile: 1426.0,
        waypoint: "PCTAID_650",
        name: "*Cross Rock Creek on a wood bridge.",
        condition: "flowing",
        freshness: "recent",
        latestReport: "08/02/26 flowing well",
        report: "08/02/26 flowing well",
        observedAt: "2026-08-02",
        ageDays: 1,
        reportedBy: "Druid",
      },
      {
        mile: 1468.8,
        waypoint: "WA1467 PCTAID_666",
        name: "Small spring",
        condition: "limited",
        freshness: "aging",
        latestReport: "07/20/26 trickle",
        report: "07/20/26 trickle",
      },
    ],
  },
};

describe("mergeWaterSourcesWithLiveConditions", () => {
  it("uses PCTA waypoint IDs before rounded-mile or name guesses", () => {
    const [rockCreek] = mergeWaterSourcesWithLiveConditions([
      {
        name: "Rock Creek",
        waypoint: "PCTAID_650",
        pctMile: 1426.05,
        routeMile: 5.397,
        report: "Static location only",
      },
    ], snapshot);

    expect(rockCreek.condition).toBe("flowing");
    expect(rockCreek.currentStatus).toBe("flowing · recent");
    expect(rockCreek.liveMatchMethod).toBe("waypoint");
    expect(rockCreek.latestReport).toBe("08/02/26 flowing well");
    expect(rockCreek.liveWaterSourceUrl).toBe("https://pctwater.com/");
  });

  it("matches embedded PCTA IDs used by the live water sheet", () => {
    const [spring] = mergeWaterSourcesWithLiveConditions([
      {
        name: "McCloud drainage spring",
        waypoint: "PCTAID_666",
        pctMile: 1468.851,
        routeMile: 48.198,
      },
    ], snapshot);

    expect(spring.condition).toBe("limited");
    expect(spring.liveMatchMethod).toBe("waypoint");
  });

  it("does not apply a live observation from another terrain contract", () => {
    const [source] = mergeWaterSourcesWithLiveConditions([
      {
        name: "Rock Creek",
        waypoint: "PCTAID_650",
        pctMile: 1426.05,
        reportStatus: "current-condition-check-required",
      },
    ], {
      ...snapshot,
      planVersion: "obsolete-route-contract",
    });

    expect(source.condition).toBeUndefined();
    expect(source.latestReport).toBeUndefined();
  });

  it("does not apply a live observation with an old terrain hash", () => {
    const [source] = mergeWaterSourcesWithLiveConditions([
      {
        name: "Rock Creek",
        waypoint: "PCTAID_650",
        pctMile: 1426.05,
        reportStatus: "current-condition-check-required",
      },
    ], {
      ...snapshot,
      routeFacts: {
        ...snapshot.routeFacts,
        dataContractSha256: "obsolete-terrain-hash",
      },
    });

    expect(source.condition).toBeUndefined();
    expect(source.latestReport).toBeUndefined();
  });
});
