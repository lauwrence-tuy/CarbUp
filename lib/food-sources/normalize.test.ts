import { describe, expect, it } from "vitest";
import {
  cleanText,
  failsAtwaterCheck,
  round,
  titleCaseIfShouting
} from "./normalize";

describe("round", () => {
  it("rounds to the given number of decimals", () => {
    expect(round(1.25, 1)).toBe(1.3);
    expect(round(12.3456, 2)).toBe(12.35);
    expect(round(7.6, 0)).toBe(8);
  });
});

describe("text cleanup", () => {
  it("title-cases ALL CAPS names only", () => {
    expect(titleCaseIfShouting("PEANUT BUTTER")).toBe("Peanut Butter");
    expect(titleCaseIfShouting("Peanut butter")).toBe("Peanut butter");
  });

  it("collapses whitespace and drops empty values", () => {
    expect(cleanText("  RAW   ALMONDS ")).toBe("Raw Almonds");
    expect(cleanText("   ")).toBeUndefined();
    expect(cleanText(null)).toBeUndefined();
  });
});

describe("failsAtwaterCheck", () => {
  it("passes when calories roughly match 4/4/9 macros", () => {
    // 4*10 + 4*30 + 9*2.2 = 179.8 vs 200
    expect(failsAtwaterCheck(200, 10, 30, 2.2)).toBe(false);
  });

  it("fails when calories are far from the macro estimate", () => {
    // 4*10 + 4*10 + 9*5 = 125 vs 500
    expect(failsAtwaterCheck(500, 10, 10, 5)).toBe(true);
  });

  it("skips the check for very low-calorie foods", () => {
    expect(failsAtwaterCheck(100, 0, 0, 0)).toBe(false);
  });
});
