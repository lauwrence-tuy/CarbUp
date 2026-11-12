import { describe, expect, it } from "vitest";
import {
  formatActivityTime,
  formatWorkoutDate,
  getLocalDateKey,
  getTrailingSevenLocalDays,
  isSameLocalDay
} from "./date";

// The app's default time zone is America/Los_Angeles.
describe("app time zone dates", () => {
  it("keys a late-evening activity by the Pacific day, not the UTC day", () => {
    expect(getLocalDateKey(new Date("2026-07-01T05:30:00Z"))).toBe("2026-06-30");
  });

  it("compares days in the app time zone", () => {
    const evening = new Date("2026-07-01T05:30:00Z");

    expect(isSameLocalDay(evening, new Date("2026-06-30T16:00:00Z"))).toBe(true);
    expect(isSameLocalDay(evening, new Date("2026-07-01T16:00:00Z"))).toBe(false);
  });

  it("formats times and dates in the app time zone", () => {
    expect(formatActivityTime(new Date("2026-07-01T05:30:00Z"))).toBe("10:30 PM");
    expect(formatWorkoutDate(new Date("2026-07-01T05:30:00Z"))).toBe("Jun 30, 2026");
  });

  it("lists the trailing seven days ending today", () => {
    const days = getTrailingSevenLocalDays(new Date("2026-11-03T20:00:00Z"));

    expect(days.map((d) => d.key)).toEqual([
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03"
    ]);
    expect(days.at(-1)).toMatchObject({ day: "Tue", date: 3, isToday: true });
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
  });
});
