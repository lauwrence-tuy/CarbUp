import { describe, expect, it } from "vitest";
import {
  buildInsights,
  buildRangeBuckets,
  buildSportTrends,
  buildSummary,
  buildTrailingWeeklyBuckets,
  createEmptyTrendPoint,
  formatCompactCalories,
  formatDuration,
  getBucketRange,
  getRangeStartDateKey,
  type TrendActivity,
  type TrendPoint
} from "./trends";

function activity(dateKey: string, overrides: Partial<TrendActivity> = {}): TrendActivity {
  return {
    stravaActivityId: `${dateKey}-${overrides.type ?? "Ride"}`,
    name: "Workout",
    type: "Ride",
    dateKey,
    calories: 500,
    durationMinutes: 60,
    distanceMiles: 20,
    load: 50,
    ...overrides
  };
}

function point(label: string, calories: number, load = 0, workouts = 0): TrendPoint {
  return { ...createEmptyTrendPoint(label), calories, load, workouts };
}

describe("formatting", () => {
  it("formats durations as hours and minutes", () => {
    expect(formatDuration(135)).toBe("2h 15m");
    expect(formatDuration(45)).toBe("45m");
  });

  it("abbreviates calories of 1,000 and up", () => {
    expect(formatCompactCalories(1500)).toBe("1.5k");
    expect(formatCompactCalories(999)).toBe("999");
  });
});

describe("getRangeStartDateKey", () => {
  it("counts back so the range includes the latest day", () => {
    expect(getRangeStartDateKey("2026-06-30", 7)).toBe("2026-06-24");
  });

  it("returns null for all-time or no data", () => {
    expect(getRangeStartDateKey("2026-06-30", null)).toBeNull();
    expect(getRangeStartDateKey(undefined, 90)).toBeNull();
  });
});

describe("getBucketRange", () => {
  it("falls back to a single day when there are no activities", () => {
    const { start, end } = getBucketRange({
      activities: [],
      fallbackEndDateKey: "2026-06-30",
      rangeStart: null
    });

    expect(start.getTime()).toBe(end.getTime());
  });
});

describe("buildRangeBuckets", () => {
  const activities = [
    activity("2026-06-01", { calories: 100 }),
    activity("2026-06-10", { calories: 200 }),
    activity("2026-06-30", { calories: 300 })
  ];

  it("splits the range into equal buckets and totals each", () => {
    const buckets = buildRangeBuckets({ activities, count: 3, rangeStart: null });

    expect(buckets.map((b) => b.label)).toEqual(["Jun 1", "Jun 11", "Jun 21"]);
    expect(buckets.map((b) => b.calories)).toEqual([300, 0, 300]);
    expect(buckets.map((b) => b.workouts)).toEqual([2, 0, 1]);
  });

  it("leaves out activities before the range start", () => {
    const buckets = buildRangeBuckets({ activities, count: 2, rangeStart: "2026-06-05" });

    expect(buckets.reduce((total, b) => total + b.calories, 0)).toBe(500);
  });
});

describe("buildTrailingWeeklyBuckets", () => {
  it("makes four 7-day buckets ending on the latest activity", () => {
    const buckets = buildTrailingWeeklyBuckets({
      activities: [
        activity("2026-05-31", { calories: 999 }),
        activity("2026-06-01", { calories: 100 }),
        activity("2026-06-14", { calories: 200 }),
        activity("2026-06-28", { calories: 300 })
      ]
    });

    expect(buckets.map((b) => b.label)).toEqual(["Jun 1", "Jun 8", "Jun 15", "Jun 22"]);
    expect(buckets.map((b) => b.calories)).toEqual([100, 200, 0, 300]);
  });

  it("uses the fallback end date when there are no activities", () => {
    const buckets = buildTrailingWeeklyBuckets({ activities: [], fallbackEndDateKey: "2026-06-28" });

    expect(buckets[3].label).toBe("Jun 22");
    expect(buckets.every((b) => b.workouts === 0)).toBe(true);
  });
});

describe("buildSportTrends", () => {
  it("totals each sport and keeps the top five by calories", () => {
    const sports = ["Ride", "Run", "Swim", "Walk", "Hike", "Yoga"];
    const activities = sports.map((type, index) =>
      activity("2026-06-01", { type, calories: (index + 1) * 100 })
    );
    activities.push(activity("2026-06-02", { type: "Ride", calories: 1000 }));

    const trends = buildSportTrends(activities);

    expect(trends.map((t) => t.type)).toEqual(["Ride", "Yoga", "Hike", "Walk", "Swim"]);
    expect(trends[0]).toMatchObject({ calories: 1100, workouts: 2, durationMinutes: 120 });
  });
});

describe("buildSummary", () => {
  it("totals workouts and averages per workout and per hour", () => {
    expect(
      buildSummary([
        activity("2026-06-01", { calories: 600, durationMinutes: 90 }),
        activity("2026-06-01", { calories: 300, durationMinutes: 30 })
      ])
    ).toEqual({
      totalCalories: 900,
      totalWorkouts: 2,
      activeDays: 1,
      totalDurationMinutes: 120,
      averageCaloriesPerWorkout: 450,
      averageCaloriesPerHour: 450
    });
  });

  it("returns zeros instead of dividing by zero", () => {
    expect(buildSummary([])).toMatchObject({
      averageCaloriesPerWorkout: 0,
      averageCaloriesPerHour: 0
    });
  });
});

describe("buildInsights", () => {
  it("reports growth over the previous bucket", () => {
    const [shift, consistency, peak] = buildInsights(
      [point("Jun 1", 800, 90, 3), point("Jun 8", 1000, 40), point("Jun 15", 1200, 60)],
      12
    );

    expect(shift).toMatchObject({
      value: "+20%",
      detail: "200 kcal above prior bucket",
      tone: "green"
    });
    expect(consistency.value).toBe("Steady");
    expect(peak).toMatchObject({ value: "Jun 1", detail: "90 load from 3 workouts" });
  });

  it("reports a drop", () => {
    const [shift] = buildInsights([point("a", 1000), point("b", 750)], 3);

    expect(shift).toMatchObject({
      value: "-25%",
      detail: "250 kcal below prior bucket",
      tone: "orange"
    });
  });

  it("builds a baseline when the previous bucket is empty", () => {
    const [shift, consistency] = buildInsights([point("a", 0), point("b", 500)], 0);

    expect(shift).toMatchObject({ value: "+100%", detail: "building a baseline from synced workouts" });
    expect(consistency.value).toBe("Ready");
  });

  it("labels consistency by active days", () => {
    const label = (days: number) => buildInsights([point("a", 0), point("b", 0)], days)[1].value;

    expect([label(20), label(12), label(1), label(0)]).toEqual(["High", "Steady", "Light", "Ready"]);
  });
});
