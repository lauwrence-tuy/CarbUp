import { describe, expect, it } from "vitest";
import {
  calculateBaseTdee,
  isActivityLevel,
  isGoalType,
  toPounds
} from "./calorie-settings";

describe("calculateBaseTdee", () => {
  it("multiplies pounds by the activity multiplier", () => {
    expect(
      calculateBaseTdee({ everydayActivity: "active", units: "imperial", weight: 150 })
    ).toBe(2400);
  });

  it("converts metric weight to pounds first", () => {
    // 70 kg = 154.32 lb, x 14 = 2160.5
    expect(
      calculateBaseTdee({ everydayActivity: "light", units: "metric", weight: 70 })
    ).toBe(2161);
  });

  it("falls back to the active multiplier for an unknown level", () => {
    expect(
      calculateBaseTdee({ everydayActivity: "couch", units: "imperial", weight: 150 })
    ).toBe(2400);
  });
});

describe("toPounds", () => {
  it("leaves imperial weight alone", () => {
    expect(toPounds(150, "imperial")).toBe(150);
  });

  it("converts kilograms", () => {
    expect(toPounds(100, "metric")).toBeCloseTo(220.462, 3);
  });
});

describe("type guards", () => {
  it("accepts known activity levels and goals", () => {
    expect(isActivityLevel("very_active")).toBe(true);
    expect(isGoalType("lose_fast")).toBe(true);
  });

  it("rejects unknown values, including inherited object keys", () => {
    expect(isActivityLevel("extreme")).toBe(false);
    expect(isGoalType("toString")).toBe(false);
  });
});
