import { describe, expect, it } from "vitest";
import {
  DEFAULT_TARGET_CALORIES,
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
