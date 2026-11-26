import { describe, expect, it } from "vitest";
import {
  buildFuelingPlan,
  classifyDay,
  DEFAULT_WEIGHT_KG,
  formatMinutes,
  summarizeTraining,
  summarizeTrainingByDate,
  toWeightKg,
  type FuelingDayInput
} from "./fueling";

function day(overrides: Partial<FuelingDayInput> = {}): FuelingDayInput {
  return {
    weightKg: 70,
    trainingMinutes: 0,
    load: 0,
    longestRideMinutes: 0,
    carbsEaten: 0,
    proteinEaten: 0,
    isToday: true,
    ...overrides
  };
}

describe("classifyDay", () => {
  it.each([
    [0, 0, "rest"],
    [45, 30, "light"],
    [59, 60, "light"],
    [60, 50, "moderate"],
    [89, 80, "moderate"],
    [90, 80, "high"],
    [239, 150, "high"],
    [240, 150, "very-high"]
  ] as const)("%i min at load %i is %s", (minutes, load, expected) => {
    expect(classifyDay(minutes, load)).toBe(expected);
  });

  it("moves a very hard short day up one band", () => {
    expect(classifyDay(45, 112)).toBe("moderate");
    expect(classifyDay(75, 120)).toBe("high");
  });

  it("doesn't move a long day further up for being hard", () => {
    expect(classifyDay(120, 180)).toBe("high");
    expect(classifyDay(300, 300)).toBe("very-high");
  });
});

describe("toWeightKg", () => {
  it("keeps metric weights and converts pounds", () => {
    expect(toWeightKg(70, "metric")).toBe(70);
    expect(toWeightKg(154.32, "imperial")).toBeCloseTo(70, 1);
  });

  it.each([[null], [undefined], [0], [-5], [Number.NaN]])("treats %s as unset", (weight) => {
    expect(toWeightKg(weight, "metric")).toBeNull();
  });
});

describe("buildFuelingPlan", () => {
  it("sets a rest-day carb target from the 3–5 g/kg band", () => {
    const plan = buildFuelingPlan(day());

    expect(plan.dayType).toBe("rest");
    expect(plan.carbs).toMatchObject({ perKgMin: 3, perKgMax: 5, minG: 210, maxG: 350, targetG: 280 });
    expect(plan.recovery).toBeNull();
    expect(plan.duringRide).toBeNull();
  });

  it("scales a big day to body weight", () => {
    const plan = buildFuelingPlan(day({ weightKg: 80, trainingMinutes: 180, load: 140, longestRideMinutes: 180 }));

    expect(plan.dayType).toBe("high");
    expect(plan.carbs).toMatchObject({ minG: 480, maxG: 800, targetG: 640 });
    expect(plan.protein.targetG).toBe(130);
  });

  it("tracks what's left, never below zero", () => {
    const plan = buildFuelingPlan(day({ carbsEaten: 100.4, proteinEaten: 200 }));

    expect(plan.carbs).toMatchObject({ eatenG: 100, remainingG: 180 });
    expect(plan.protein).toMatchObject({ targetG: 110, eatenG: 200, remainingG: 0 });
  });

  it("adds a recovery snack after a long ride", () => {
    const plan = buildFuelingPlan(day({ trainingMinutes: 95, load: 50, longestRideMinutes: 95 }));

    expect(plan.recovery).toEqual({ carbsG: 70, proteinG: 20 });
  });

  it("adds a recovery snack after a short but hard day", () => {
    expect(buildFuelingPlan(day({ trainingMinutes: 40, load: 70, longestRideMinutes: 40 })).recovery).not.toBeNull();
    expect(buildFuelingPlan(day({ trainingMinutes: 40, load: 30, longestRideMinutes: 40 })).recovery).toBeNull();
  });

  it.each([
    [45, null],
    [60, { carbsPerHourMin: 30, carbsPerHourMax: 60 }],
    [150, { carbsPerHourMin: 30, carbsPerHourMax: 60 }],
    [151, { carbsPerHourMin: 60, carbsPerHourMax: 90 }]
  ])("gives in-ride carbs for a %i min ride", (minutes, expected) => {
    const plan = buildFuelingPlan(day({ trainingMinutes: minutes, load: 60, longestRideMinutes: minutes }));

    expect(plan.duringRide).toEqual(expected && { rideMinutes: minutes, ...expected });
  });

  it("falls back to a default weight and says so", () => {
    const plan = buildFuelingPlan(day({ weightKg: null }));

    expect(plan.weightKg).toBe(DEFAULT_WEIGHT_KG);
    expect(plan.weightIsDefault).toBe(true);
    expect(buildFuelingPlan(day()).weightIsDefault).toBe(false);
  });

  it("rounds grams to the nearest 5", () => {
    const plan = buildFuelingPlan(day({ weightKg: 63.3 }));

    expect(plan.weightKg).toBe(63.3);
    expect(plan.carbs.targetG % 5).toBe(0);
    expect(plan.protein.targetG % 5).toBe(0);
  });
});

describe("summarizeTraining", () => {
  it("adds up minutes and load and keeps the longest session", () => {
    expect(
      summarizeTraining([
        { movingTime: 8520, calories: 1540, sufferScore: 98 },
        { movingTime: 1860, calories: 303, sufferScore: null }
      ])
    ).toEqual({ trainingMinutes: 173, load: 98 + Math.round(1860 / 90 + 303 / 18), longestRideMinutes: 142 });
  });

  it("is a rest day with no activities", () => {
    expect(summarizeTraining([])).toEqual({ trainingMinutes: 0, load: 0, longestRideMinutes: 0 });
  });
});

describe("summarizeTrainingByDate", () => {
  it("groups activities by local day", () => {
    const byDate = summarizeTrainingByDate([
      { startDate: new Date("2026-11-20T15:00:00Z"), movingTime: 3600, calories: 600, sufferScore: 50 },
      { startDate: new Date("2026-11-20T23:00:00Z"), movingTime: 1800, calories: 300, sufferScore: 20 },
      { startDate: new Date("2026-11-22T16:00:00Z"), movingTime: 5400, calories: 900, sufferScore: 80 }
    ]);

    expect(byDate).toEqual({
      "2026-11-20": { trainingMinutes: 90, load: 70, longestRideMinutes: 60 },
      "2026-11-22": { trainingMinutes: 90, load: 80, longestRideMinutes: 90 }
    });
  });
});

describe("formatMinutes", () => {
  it.each([
    [45, "45 min"],
    [60, "1 h"],
    [142, "2 h 22 min"]
  ])("formats %i", (minutes, expected) => {
    expect(formatMinutes(minutes)).toBe(expected);
  });
});
