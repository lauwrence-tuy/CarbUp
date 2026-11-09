import { describe, expect, it } from "vitest";
import {
  estimateActivityCalories,
  getActivityCalories,
  getActivityWeightKg
} from "./activity-calories";

describe("getActivityWeightKg", () => {
  it("defaults to 70 kg when weight is missing or invalid", () => {
    expect(getActivityWeightKg({ units: "imperial", weight: null })).toBe(70);
    expect(getActivityWeightKg({ units: "metric", weight: 0 })).toBe(70);
    expect(getActivityWeightKg({ units: "metric", weight: Number.NaN })).toBe(70);
  });

  it("returns metric weight as is and converts pounds", () => {
    expect(getActivityWeightKg({ units: "metric", weight: 80 })).toBe(80);
    expect(getActivityWeightKg({ units: "imperial", weight: 220.46226218 })).toBeCloseTo(100);
  });
});

describe("estimateActivityCalories", () => {
  it("uses the MET formula", () => {
    // run MET 9.8: 9.8 * 3.5 * 70 kg * 60 min / 200 = 720.3
    expect(
      estimateActivityCalories({ movingTime: 3600, type: "Run", weightKg: 70 })
    ).toBe(720);
  });

  it("matches Strava type names in any casing or separator style", () => {
    const trailRun = estimateActivityCalories({ movingTime: 3600, type: "trailRun", weightKg: 70 });

    expect(estimateActivityCalories({ movingTime: 3600, type: "TrailRun", weightKg: 70 })).toBe(trailRun);
    expect(estimateActivityCalories({ movingTime: 3600, type: "trail_run", weightKg: 70 })).toBe(trailRun);
    // trail run MET 10.5
    expect(trailRun).toBe(772);
  });

  it("uses MET 6 for unknown activity types", () => {
    // 6 * 3.5 * 70 * 60 / 200 = 441
    expect(
      estimateActivityCalories({ movingTime: 3600, type: "Underwater Basket Weaving", weightKg: 70 })
    ).toBe(441);
  });

  it("returns 0 without a usable duration", () => {
    expect(estimateActivityCalories({ movingTime: null, type: "Run", weightKg: 70 })).toBe(0);
    expect(estimateActivityCalories({ movingTime: 0, type: "Run", weightKg: 70 })).toBe(0);
  });
});

describe("getActivityCalories", () => {
  it("prefers Strava's calories when they are positive", () => {
    expect(
      getActivityCalories({ calories: 512.4, movingTime: 3600, type: "Run", weightKg: 70 })
    ).toBe(512);
  });

  it("falls back to the estimate when Strava reports none", () => {
    expect(
      getActivityCalories({ calories: 0, movingTime: 3600, type: "Run", weightKg: 70 })
    ).toBe(720);
  });
});
