import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  allowedRange,
  evalSetSchema,
  formatSummaryMarkdown,
  scoreCase,
  summarize,
  type EvalCase
} from "./meal-eval";
import type { LlmMeal } from "./meal-parser";

const banana: EvalCase = {
  id: "banana",
  text: "a banana",
  reference: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 }
};

function mealWith(calories: number, carbs = 27): { meal: LlmMeal } {
  return {
    meal: {
      title: "Banana",
      mealHint: null,
      items: [{ name: "banana", searchTerm: "banana", quantity: "1", grams: 118, calories, protein: 1.3, carbs, fat: 0.4 }],
      notFood: []
    }
  };
}

describe("the eval set", () => {
  it("has 30 valid cases with unique ids", () => {
    const cases = evalSetSchema.parse(JSON.parse(readFileSync("evals/meals.json", "utf8")));

    expect(cases).toHaveLength(30);
    expect(new Set(cases.map((testCase) => testCase.id)).size).toBe(30);
  });
});

describe("allowedRange", () => {
  it("gives calories ±25% and macros ±35% or ±5 g", () => {
    expect(allowedRange("calories", 400)).toEqual([300, 500]);
    expect(allowedRange("carbs", 100)).toEqual([65, 135]);
    expect(allowedRange("fat", 2)).toEqual([0, 7]);
  });
});

describe("scoreCase", () => {
  it("passes a parse inside every range", () => {
    expect(scoreCase(banana, mealWith(110))).toMatchObject({ pass: true, misses: [] });
  });

  it("lists each number that missed", () => {
    const score = scoreCase(banana, mealWith(200, 60));

    expect(score.pass).toBe(false);
    expect(score.misses).toHaveLength(2);
    expect(score.calorieErrorPct).toBeCloseTo(90.5, 1);
  });

  it("fails on an error or a missing output", () => {
    expect(scoreCase(banana, { error: "refused" }).pass).toBe(false);
    expect(scoreCase(banana, undefined).misses).toEqual(["no output recorded"]);
  });

  it("expects no food for no-food cases", () => {
    const noFood: EvalCase = { id: "x", text: "hello", expectNoFood: true };

    expect(scoreCase(noFood, { error: "no-food" }).pass).toBe(true);
    expect(scoreCase(noFood, mealWith(100)).pass).toBe(false);
  });
});

describe("summarize", () => {
  it("reports the pass rate, mean error and failures", () => {
    const summary = summarize([scoreCase(banana, mealWith(105)), scoreCase(banana, mealWith(210))]);

    expect(summary).toMatchObject({ cases: 2, passed: 1, passRate: 0.5, meanCalorieErrorPct: 50 });

    const markdown = formatSummaryMarkdown(summary, { model: "m", mode: "live", costUsd: 0.0123 });
    expect(markdown).toContain("1/2 passed (50%)");
    expect(markdown).toContain("$0.0123");
    expect(markdown).toContain("| banana | calories 210 not in 79–131 |");
  });
});
