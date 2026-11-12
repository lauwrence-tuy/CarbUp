import { describe, expect, it } from "vitest";
import {
  DEFAULT_TARGET_CALORIES,
  getCalorieBalance,
  getDailyCalorieTarget,
  getEffectiveGoalAdjustment,
  getMacroTargets,
  resolveBaseCalories
} from "./nutrition-targets";

describe("resolveBaseCalories", () => {
  it("uses the default when no base calories are set", () => {
    expect(resolveBaseCalories(0)).toBe(DEFAULT_TARGET_CALORIES);
  });

  it("keeps a positive value", () => {
    expect(resolveBaseCalories(2100)).toBe(2100);
  });
});

describe("getMacroTargets", () => {
  it("splits calories 18/52/30 into grams", () => {
    expect(getMacroTargets(2000)).toEqual({ protein: 90, carbs: 260, fat: 67 });
  });

  it("never returns negative grams", () => {
    expect(getMacroTargets(-500)).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });
});

describe("getDailyCalorieTarget", () => {
  it("adds activity calories and the goal adjustment to the base", () => {
    expect(
      getDailyCalorieTarget({ baseCalories: 2200, activityCalories: 800, goalAdjustment: -500 })
    ).toBe(2500);
  });

  it("starts from the default when no base is set", () => {
    expect(
      getDailyCalorieTarget({ baseCalories: 0, activityCalories: 0, goalAdjustment: 0 })
    ).toBe(DEFAULT_TARGET_CALORIES);
  });
});

describe("getCalorieBalance", () => {
  it("reports calories remaining under the target", () => {
    expect(getCalorieBalance(2500, 1800)).toEqual({ remaining: 700, over: 0 });
  });

  it("reports calories over the target", () => {
    expect(getCalorieBalance(2500, 2700)).toEqual({ remaining: 0, over: 200 });
  });
});

describe("getEffectiveGoalAdjustment", () => {
  it("ignores the goal until maintenance calories are set", () => {
    expect(getEffectiveGoalAdjustment({ maintenanceCalories: null, goalAdjustment: -500 })).toBe(0);
  });

  it("uses the goal once maintenance calories are set", () => {
    expect(getEffectiveGoalAdjustment({ maintenanceCalories: 2200, goalAdjustment: -500 })).toBe(-500);
  });
});
