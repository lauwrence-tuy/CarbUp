import { APP_TIMEZONE, getLocalDateKey } from "@/lib/date";
import type { FitnessFreshnessPoint } from "@/lib/trends";
import { calculateActivityLoad } from "@/lib/workout-metrics";

/**
 * Fitness (chronic load) and fatigue (acute load) are exponentially weighted
 * averages of daily load over these many days. Form is fitness minus fatigue.
 */
export const FITNESS_TIME_CONSTANT_DAYS = 42;
export const FATIGUE_TIME_CONSTANT_DAYS = 7;

/** Days shown when the athlete has no activities yet. */
const EMPTY_HISTORY_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type LoadActivity = Parameters<typeof calculateActivityLoad>[0] & {
  stravaActivityId: string;
  name: string;
  type: string;
  startDate: Date;
};

const chartLabelFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  month: "short",
  day: "numeric"
});

/** Noon on the app-time-zone day of `date`, so DST shifts never skip a day. */
function startOfLocalDay(date: Date) {
  return new Date(`${getLocalDateKey(date)}T12:00:00`);
}

/**
 * One fitness/fatigue/form point per day, from the athlete's first activity
 * (or the last 90 days when there are none) through `referenceDate`.
 */
export function buildFitnessFreshnessSeries(
  activities: LoadActivity[],
  referenceDate: Date
): FitnessFreshnessPoint[] {
  const earliestActivity = activities.reduce<LoadActivity | null>(
    (earliest, activity) =>
      !earliest || activity.startDate < earliest.startDate ? activity : earliest,
    null
  );
  const rangeStart = startOfLocalDay(earliestActivity?.startDate ?? referenceDate);

  if (!earliestActivity) {
    rangeStart.setDate(rangeStart.getDate() - (EMPTY_HISTORY_DAYS - 1));
  }

  const loadByDate: Record<string, number> = {};
  const activitiesByDate: Record<string, FitnessFreshnessPoint["activities"]> = {};

  for (const activity of activities) {
    const key = getLocalDateKey(activity.startDate);
    const load = calculateActivityLoad(activity);

    loadByDate[key] = (loadByDate[key] ?? 0) + load;
    (activitiesByDate[key] ??= []).push({
      stravaActivityId: activity.stravaActivityId,
      name: activity.name,
      type: activity.type,
      load
    });
  }

  const rangeEnd = startOfLocalDay(referenceDate);
  const dayCount =
    Math.max(0, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / MS_PER_DAY)) + 1;
  const points: FitnessFreshnessPoint[] = [];
  let fitness = 0;
  let fatigue = 0;

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    const date = new Date(rangeStart);
    date.setDate(rangeStart.getDate() + dayIndex);

    const dateKey = getLocalDateKey(date);
    const load = loadByDate[dateKey] ?? 0;

    fitness += (load - fitness) / FITNESS_TIME_CONSTANT_DAYS;
    fatigue += (load - fatigue) / FATIGUE_TIME_CONSTANT_DAYS;

    points.push({
      dateKey,
      label: chartLabelFormatter.format(date),
      load,
      activities: activitiesByDate[dateKey] ?? [],
      fitness: Math.round(fitness),
      fatigue: Math.round(fatigue),
      form: Math.round(fitness - fatigue)
    });
  }

  return points;
}
