import { describe, expect, it } from "vitest";
import { buildFitnessFreshnessSeries, type LoadActivity } from "./training-load";

// Midday in the app's default time zone (America/Los_Angeles), so each
// activity lands on the intended calendar day.
function activity(isoDay: string, sufferScore: number, id = isoDay): LoadActivity {
  return {
    stravaActivityId: id,
    name: `Ride ${id}`,
    type: "Ride",
    startDate: new Date(`${isoDay}T20:00:00Z`),
    movingTime: 3600,
    calories: null,
    sufferScore
  };
}

const reference = (isoDay: string) => new Date(`${isoDay}T20:00:00Z`);

describe("buildFitnessFreshnessSeries", () => {
  it("shows 90 empty days when there are no activities", () => {
    const points = buildFitnessFreshnessSeries([], reference("2026-06-30"));

    expect(points).toHaveLength(90);
    expect(points.at(-1)?.dateKey).toBe("2026-06-30");
    expect(points.every((p) => p.load === 0 && p.fitness === 0 && p.form === 0)).toBe(true);
  });

  it("applies 42-day fitness and 7-day fatigue to a single load", () => {
    const [point] = buildFitnessFreshnessSeries(
      [activity("2026-06-30", 100)],
      reference("2026-06-30")
    );

    expect(point).toMatchObject({ load: 100, fitness: 2, fatigue: 14, form: -12 });
  });

  it("decays both averages on a rest day", () => {
    const points = buildFitnessFreshnessSeries(
      [activity("2026-06-29", 100)],
      reference("2026-06-30")
    );

    expect(points.map((p) => p.dateKey)).toEqual(["2026-06-29", "2026-06-30"]);
    expect(points[1]).toMatchObject({ load: 0, fitness: 2, fatigue: 12, form: -10 });
  });

  it("adds up loads and lists every activity on the same day", () => {
    const [point] = buildFitnessFreshnessSeries(
      [activity("2026-06-30", 40, "a"), activity("2026-06-30", 60, "b")],
      reference("2026-06-30")
    );

    expect(point.load).toBe(100);
    expect(point.activities.map((a) => a.stravaActivityId)).toEqual(["a", "b"]);
  });

  it("keeps one point per day across the end of daylight saving time", () => {
    const points = buildFitnessFreshnessSeries(
      [activity("2026-10-31", 50)],
      reference("2026-11-03")
    );

    expect(points.map((p) => p.dateKey)).toEqual([
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03"
    ]);
  });
});
