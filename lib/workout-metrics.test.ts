import { describe, expect, it } from "vitest";
import {
  calculateActivityLoad,
  formatDistance,
  formatDuration,
  getEffortBadge,
  metersToMiles
} from "./workout-metrics";

describe("calculateActivityLoad", () => {
  it("uses Strava's suffer score when present", () => {
    expect(
      calculateActivityLoad({ movingTime: 3600, calories: 540, sufferScore: 42.6 })
    ).toBe(43);
  });

  it("treats a suffer score of 0 as a real score", () => {
    expect(
      calculateActivityLoad({ movingTime: 3600, calories: 540, sufferScore: 0 })
    ).toBe(0);
  });

  it("estimates from moving time and calories without a suffer score", () => {
    // 3600 / 90 = 40, 540 / 18 = 30
    expect(
      calculateActivityLoad({ movingTime: 3600, calories: 540, sufferScore: null })
    ).toBe(70);
  });

  it("returns 0 when nothing is known", () => {
    expect(
      calculateActivityLoad({ movingTime: null, calories: null, sufferScore: null })
    ).toBe(0);
  });
});

describe("getEffortBadge", () => {
  it.each([
    [0, "Easy"],
    [29, "Easy"],
    [30, "Moderate"],
    [64, "Moderate"],
    [65, "Hard"],
    [99, "Hard"],
    [100, "Very Hard"],
    [250, "Very Hard"]
  ] as const)("load %i is %s", (load, badge) => {
    expect(getEffortBadge(load)).toBe(badge);
  });
});

describe("formatDuration", () => {
  it.each([
    [null, "Duration unavailable"],
    [0, "Duration unavailable"],
    [1500, "25 min"],
    [5400, "1h 30m"],
    [3599, "1h 0m"],
    [7199, "2h 0m"]
  ])("%s seconds is %s", (seconds, label) => {
    expect(formatDuration(seconds)).toBe(label);
  });
});

describe("distance", () => {
  it("converts meters to miles", () => {
    expect(metersToMiles(1609.344)).toBe(1);
  });

  it.each([
    [null, "Distance unavailable"],
    [0, "Distance unavailable"],
    [1609.344, "1.0 mi"],
    [5000, "3.1 mi"]
  ])("%s meters is %s", (meters, label) => {
    expect(formatDistance(meters)).toBe(label);
  });
});
