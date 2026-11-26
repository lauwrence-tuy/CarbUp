import { describe, expect, it } from "vitest";
import { buildFuelingPlan, type FuelingDayInput } from "@/lib/fueling";
import {
  coachCacheKey,
  CoachRejectedError,
  findUnsupportedNumbers,
  planNumbers,
  templateCoach,
  validateCoach,
  type CoachMessage
} from "./fueling-coach";

function plan(overrides: Partial<FuelingDayInput> = {}) {
  return buildFuelingPlan({
    weightKg: 70,
    trainingMinutes: 173,
    load: 150,
    longestRideMinutes: 142,
    carbsEaten: 168,
    proteinEaten: 72,
    isToday: true,
    ...overrides
  });
}

function coach(overrides: Partial<CoachMessage> = {}): CoachMessage {
  return {
    headline: "About 392 g of carbs still to go today.",
    advice: "Big days call for 6–10 g/kg, so aim for 560 g. You've had 168 g so far.",
    actions: ["Have 70 g of carbs and 20 g of protein within 1 hour of finishing."],
    ...overrides
  };
}

describe("findUnsupportedNumbers", () => {
  const allowed = [560, 168, 392, 1540];

  it("accepts the plan's numbers, with commas and a little rounding", () => {
    expect(findUnsupportedNumbers("Aim for 560 g; 168 g eaten; 1,540 kcal; about 391 g left", allowed)).toEqual([]);
  });

  it("accepts small whole numbers used in everyday phrasing", () => {
    expect(findUnsupportedNumbers("within 1 hour, 2 bottles, 3 meals, 12 g/kg", allowed)).toEqual([]);
  });

  it("flags made-up figures", () => {
    expect(findUnsupportedNumbers("Eat 650 g of carbs, about 2,600 kcal, 7.5 g/kg", allowed)).toEqual([650, 2600, 7.5]);
  });
});

describe("planNumbers", () => {
  it("includes the training time as hours and minutes", () => {
    const numbers = planNumbers(plan());

    expect(numbers).toEqual(expect.arrayContaining([173, 2, 53, 142, 22, 560, 392, 168]));
  });
});

describe("validateCoach", () => {
  it("keeps an answer that only quotes the plan", () => {
    expect(validateCoach(coach(), plan()).headline).toBe("About 392 g of carbs still to go today.");
  });

  it("rejects an answer with a number the plan doesn't have", () => {
    expect(() => validateCoach(coach({ advice: "Aim for 3,000 kcal today." }), plan())).toThrow(CoachRejectedError);

    try {
      validateCoach(coach({ actions: ["Eat 85 g of protein at dinner."] }), plan());
    } catch (error) {
      expect((error as CoachRejectedError).reason).toBe("unsupported-number");
    }
  });

  it("rejects an empty answer", () => {
    expect(() => validateCoach(coach({ headline: "  " }), plan())).toThrow(/empty/);
  });

  it("trims and caps the actions", () => {
    const result = validateCoach(coach({ actions: [" Eat rice ", "", "Drink", "Rest", "Sleep"] }), plan());

    expect(result.actions).toEqual(["Eat rice", "Drink", "Rest"]);
  });
});

describe("templateCoach", () => {
  it("says what's left today, with recovery and in-ride carbs", () => {
    const result = templateCoach(plan());

    expect(result.headline).toBe("About 392 g of carbs still to go today.");
    expect(result.advice).toContain("2 h 53 min of training");
    expect(result.advice).toContain("420–700 g");
    expect(result.actions).toHaveLength(2);
  });

  it("describes a past day by what was eaten", () => {
    expect(templateCoach(plan({ isToday: false })).headline).toBe("168 g of 560 g carbs on this big training day.");
  });

  it("asks for a weight when it used the default", () => {
    expect(templateCoach(plan({ weightKg: null })).actions.at(-1)).toMatch(/Set your weight/);
  });

  it("only ever quotes the plan's own numbers", () => {
    for (const input of [plan(), plan({ trainingMinutes: 0, load: 0, longestRideMinutes: 0 }), plan({ weightKg: null })]) {
      expect(() => validateCoach(templateCoach(input), input)).not.toThrow();
    }
  });
});

describe("coachCacheKey", () => {
  it("changes when the plan or model changes", () => {
    const base = coachCacheKey("m", plan());

    expect(coachCacheKey("m", plan())).toBe(base);
    expect(coachCacheKey("m", plan({ carbsEaten: 200 }))).not.toBe(base);
    expect(coachCacheKey("other", plan())).not.toBe(base);
  });
});
