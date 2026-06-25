import { describe, it, expect } from "vitest";
import { getAQIInfo, assessHikingSafety } from "./wildfireService";

describe("getAQIInfo", () => {
  it("should return Unknown for null or undefined", () => {
    expect(getAQIInfo(null)).toEqual({
      category: "Unknown",
      color: "#999",
      emoji: "❓",
    });
    expect(getAQIInfo(undefined)).toEqual({
      category: "Unknown",
      color: "#999",
      emoji: "❓",
    });
  });

  it("should return Good for AQI <= 50", () => {
    expect(getAQIInfo(0)).toEqual({
      category: "Good",
      color: "#00E400",
      emoji: "✅",
    });
    expect(getAQIInfo(25)).toEqual({
      category: "Good",
      color: "#00E400",
      emoji: "✅",
    });
    expect(getAQIInfo(50)).toEqual({
      category: "Good",
      color: "#00E400",
      emoji: "✅",
    });
  });

  it("should return Moderate for AQI > 50 and <= 100", () => {
    expect(getAQIInfo(51)).toEqual({
      category: "Moderate",
      color: "#FFFF00",
      emoji: "⚠️",
    });
    expect(getAQIInfo(75)).toEqual({
      category: "Moderate",
      color: "#FFFF00",
      emoji: "⚠️",
    });
    expect(getAQIInfo(100)).toEqual({
      category: "Moderate",
      color: "#FFFF00",
      emoji: "⚠️",
    });
  });

  it("should return Unhealthy for Sensitive Groups for AQI > 100 and <= 150", () => {
    expect(getAQIInfo(101)).toEqual({
      category: "Unhealthy for Sensitive Groups",
      color: "#FF7E00",
      emoji: "🟠",
    });
    expect(getAQIInfo(125)).toEqual({
      category: "Unhealthy for Sensitive Groups",
      color: "#FF7E00",
      emoji: "🟠",
    });
    expect(getAQIInfo(150)).toEqual({
      category: "Unhealthy for Sensitive Groups",
      color: "#FF7E00",
      emoji: "🟠",
    });
  });

  it("should return Unhealthy for AQI > 150 and <= 200", () => {
    expect(getAQIInfo(151)).toEqual({
      category: "Unhealthy",
      color: "#FF0000",
      emoji: "🔴",
    });
    expect(getAQIInfo(175)).toEqual({
      category: "Unhealthy",
      color: "#FF0000",
      emoji: "🔴",
    });
    expect(getAQIInfo(200)).toEqual({
      category: "Unhealthy",
      color: "#FF0000",
      emoji: "🔴",
    });
  });

  it("should return Very Unhealthy for AQI > 200 and <= 300", () => {
    expect(getAQIInfo(201)).toEqual({
      category: "Very Unhealthy",
      color: "#8F3F97",
      emoji: "🟣",
    });
    expect(getAQIInfo(250)).toEqual({
      category: "Very Unhealthy",
      color: "#8F3F97",
      emoji: "🟣",
    });
    expect(getAQIInfo(300)).toEqual({
      category: "Very Unhealthy",
      color: "#8F3F97",
      emoji: "🟣",
    });
  });

  it("should return Hazardous for AQI > 300", () => {
    expect(getAQIInfo(301)).toEqual({
      category: "Hazardous",
      color: "#7E0023",
      emoji: "☠️",
    });
    expect(getAQIInfo(500)).toEqual({
      category: "Hazardous",
      color: "#7E0023",
      emoji: "☠️",
    });
  });
});

describe("assessHikingSafety", () => {
  it("should return safe assessment when there are no nearby fires and AQI is good", () => {
    const wildfireData = {
      fires: [
        {
          name: "Distant Fire",
          distanceToTrail: 50,
          acres: 1000,
          containment: 50,
        },
      ],
    };
    const airQualityData = {
      readings: [{ location: "Trailhead", aqi: 45 }],
    };

    const result = assessHikingSafety(wildfireData, airQualityData);

    expect(result.safe).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.recommendations).toContain(
      "Conditions currently favorable for hiking",
    );
    expect(result.recommendations).toContain(
      "Continue monitoring every 4 hours during trip",
    );
  });

  it("should return unsafe assessment with warnings when there are nearby fires (< 25 miles)", () => {
    const wildfireData = {
      fires: [
        {
          name: "Nearby Fire",
          distanceToTrail: 10,
          acres: 5000,
          containment: 10,
        },
      ],
    };
    const airQualityData = {
      readings: [{ location: "Trailhead", aqi: 45 }],
    };

    const result = assessHikingSafety(wildfireData, airQualityData);

    expect(result.safe).toBe(false);
    expect(result.warnings).toContain(
      "1 active fire(s) within 25 miles of trail",
    );
    expect(result.warnings).toContain(
      "Nearby Fire: 5,000 acres, 10% contained, 10 mi away",
    );
    expect(result.recommendations).toContain(
      "Monitor conditions daily via InciWeb and PCTA trail updates",
    );
    expect(result.recommendations).toContain(
      "Consider N95 masks for smoke exposure",
    );
    expect(result.recommendations).toContain(
      "Have evacuation plan and emergency contacts ready",
    );
    expect(result.recommendations).toContain(
      "Check trail closure status before departure",
    );
  });

  it("should return unsafe assessment with warnings when AQI is poor (> 100)", () => {
    const wildfireData = {
      fires: [],
    };
    const airQualityData = {
      readings: [
        { location: "Trailhead", aqi: 150 },
        { location: "Camp", aqi: 120 },
      ],
    };

    const result = assessHikingSafety(wildfireData, airQualityData);

    expect(result.safe).toBe(false);
    expect(result.warnings).toContain(
      "Poor air quality detected at 2 location(s)",
    );
    expect(result.recommendations).toContain(
      "Monitor conditions daily via InciWeb and PCTA trail updates",
    );
  });

  it("should return unsafe assessment with combined warnings when both fires are nearby and AQI is poor", () => {
    const wildfireData = {
      fires: [
        {
          name: "Nearby Fire",
          distanceToTrail: 15,
          acres: 2000,
          containment: 20,
        },
      ],
    };
    const airQualityData = {
      readings: [{ location: "Trailhead", aqi: 150 }],
    };

    const result = assessHikingSafety(wildfireData, airQualityData);

    expect(result.safe).toBe(false);
    expect(result.warnings).toContain(
      "1 active fire(s) within 25 miles of trail",
    );
    expect(result.warnings).toContain(
      "Nearby Fire: 2,000 acres, 20% contained, 15 mi away",
    );
    expect(result.warnings).toContain(
      "Poor air quality detected at 1 location(s)",
    );
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("should handle missing or null distanceToTrail", () => {
    const wildfireData = {
      fires: [
        {
          name: "Unknown Fire",
          distanceToTrail: null,
          acres: 100,
          containment: 0,
        },
      ],
    };
    const airQualityData = {
      readings: [{ location: "Trailhead", aqi: 50 }],
    };

    const result = assessHikingSafety(wildfireData, airQualityData);
    expect(result.safe).toBe(true);
  });

  it("should handle empty fire and reading arrays", () => {
    const wildfireData = { fires: [] };
    const airQualityData = { readings: [] };

    const result = assessHikingSafety(wildfireData, airQualityData);
    expect(result.safe).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});
