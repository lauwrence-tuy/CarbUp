import { z } from "zod";
import type { LlmMeal } from "./meal-parser";
import { sumMacros } from "./meal-resolver";

/**
 * Scoring for the meal-parsing eval (evals/meals.json). Each case has
 * reference macros worked out from USDA / label values; a parse passes when
 * its estimated totals land within tolerance on all four numbers.
 */

const macros = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative()
});

export const evalCaseSchema = z.union([
  z.object({ id: z.string(), text: z.string(), reference: macros, note: z.string().optional() }),
  z.object({ id: z.string(), text: z.string(), expectNoFood: z.literal(true), note: z.string().optional() })
]);

export const evalSetSchema = z.array(evalCaseSchema);

export type EvalCase = z.infer<typeof evalCaseSchema>;
export type Macros = z.infer<typeof macros>;

/** Calories within ±25%; each macro within ±35% or ±5 g, whichever is wider. */
export const CALORIE_TOLERANCE = 0.25;
export const MACRO_TOLERANCE = 0.35;
export const MACRO_ABSOLUTE_GRAMS = 5;

/** The share of cases that must pass for the eval to pass. */
export const DEFAULT_MIN_PASS_RATE = 0.8;

export function allowedRange(key: keyof Macros, reference: number): [number, number] {
  const slack =
    key === "calories"
      ? reference * CALORIE_TOLERANCE
      : Math.max(reference * MACRO_TOLERANCE, MACRO_ABSOLUTE_GRAMS);

  return [Math.max(0, reference - slack), reference + slack];
}

/** What one run produced for a case: a parse, or the reason there wasn't one. */
export type CaseOutput = { meal: LlmMeal } | { error: string };

export type CaseScore = {
  id: string;
  pass: boolean;
  /** Totals the parse estimated, when there was one. */
  totals: Macros | null;
  misses: string[];
  calorieErrorPct: number | null;
};

const MACRO_KEYS = ["calories", "protein", "carbs", "fat"] as const;

export function scoreCase(testCase: EvalCase, output: CaseOutput | undefined): CaseScore {
  if (!output) {
    return { id: testCase.id, pass: false, totals: null, misses: ["no output recorded"], calorieErrorPct: null };
  }

  if ("expectNoFood" in testCase) {
    const pass = "error" in output && output.error === "no-food";

    return {
      id: testCase.id,
      pass,
      totals: "meal" in output ? sumMacros(output.meal.items) : null,
      misses: pass ? [] : ["expected no food"],
      calorieErrorPct: null
    };
  }

  if ("error" in output) {
    return { id: testCase.id, pass: false, totals: null, misses: [`error: ${output.error}`], calorieErrorPct: null };
  }

  const totals = sumMacros(output.meal.items);
  const misses = MACRO_KEYS.flatMap((key) => {
    const [low, high] = allowedRange(key, testCase.reference[key]);
    // sumMacros rounds to whole numbers; show the bounds to match the units.
    const value = totals[key];
    const show = (bound: number) =>
      key === "calories" ? Math.round(bound) : Math.round(bound * 10) / 10;

    return value < low || value > high ? [`${key} ${value} not in ${show(low)}–${show(high)}`] : [];
  });
  const calorieErrorPct =
    testCase.reference.calories > 0
      ? (Math.abs(totals.calories - testCase.reference.calories) / testCase.reference.calories) * 100
      : null;

  return { id: testCase.id, pass: misses.length === 0, totals, misses, calorieErrorPct };
}

export type EvalSummary = {
  cases: number;
  passed: number;
  passRate: number;
  /** Mean absolute calorie error across cases with a parse, in percent. */
  meanCalorieErrorPct: number | null;
  scores: CaseScore[];
};

export function summarize(scores: CaseScore[]): EvalSummary {
  const passed = scores.filter((score) => score.pass).length;
  const errors = scores
    .map((score) => score.calorieErrorPct)
    .filter((value): value is number => value !== null);

  return {
    cases: scores.length,
    passed,
    passRate: scores.length > 0 ? passed / scores.length : 0,
    meanCalorieErrorPct:
      errors.length > 0 ? errors.reduce((sum, value) => sum + value, 0) / errors.length : null,
    scores
  };
}

export function formatSummaryMarkdown(summary: EvalSummary, details: { model: string; mode: string; costUsd?: number }) {
  const lines = [
    `### Meal parsing eval (${details.mode})`,
    "",
    `**${summary.passed}/${summary.cases} passed (${Math.round(summary.passRate * 100)}%)** · model \`${details.model}\``,
    summary.meanCalorieErrorPct === null
      ? ""
      : `Mean calorie error: ${summary.meanCalorieErrorPct.toFixed(1)}%`,
    details.costUsd === undefined ? "" : `Cost of this run: $${details.costUsd.toFixed(4)}`,
    ""
  ];
  const failures = summary.scores.filter((score) => !score.pass);

  if (failures.length > 0) {
    lines.push("| Case | Why it failed |", "|---|---|");
    for (const failure of failures) {
      lines.push(`| ${failure.id} | ${failure.misses.join("; ")} |`);
    }
  }

  return lines.filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}
