import type { CalendarDay } from "@/components/dashboard/weekly-calendar";
import type { Workout } from "@/components/dashboard/workout-history-card";
import type { NutritionTotals } from "@/components/nutrition/nutrition-diary-storage";
import { getTrailingSevenLocalDays } from "@/lib/date";
import { getEffortBadge } from "@/lib/workout-metrics";

/** Sample workouts keyed by how many days ago they happened. */
const sampleWorkoutsByDaysAgo: Record<
  number,
  Omit<Workout, "id" | "slug" | "badge">[]
> = {
  0: [
    {
      name: "Z2 Endurance Ride",
      type: "Ride",
      calories: 1540,
      duration: "2h 22m",
      distance: "42.8 mi",
      startTime: "7:12 AM",
      effort: 98
    },
    {
      name: "Hill Repeats",
      type: "Ride",
      calories: 303,
      duration: "31 min",
      distance: "8.4 mi",
      startTime: "5:48 PM",
      effort: 112
    }
  ],
  2: [
    {
      name: "Tempo Run",
      type: "Run",
      calories: 610,
      duration: "52 min",
      distance: "7.1 mi",
      startTime: "6:05 AM",
      effort: 70
    }
  ],
  4: [
    {
      name: "Recovery Spin",
      type: "Ride",
      calories: 420,
      duration: "45 min",
      distance: "12.1 mi",
      startTime: "6:30 AM",
      effort: 42
    }
  ]
};

export type SampleDay = {
  baseCalories: number;
  goalAdjustment: number;
  activityCalories: number;
  workoutsByDate: Record<string, Workout[]>;
  nutritionTotalsByDate: Record<string, NutritionTotals>;
  calendarDays: CalendarDay[];
};

/**
 * Builds a week of sample data anchored on the real current date.
 * Calendar calories and today's exercise calories are both summed from the
 * same workout list, so the numbers always agree.
 */
export function buildSampleDay(now = new Date()): SampleDay {
  const baseDays = getTrailingSevenLocalDays(now);
  const workoutsByDate: Record<string, Workout[]> = {};

  baseDays.forEach((day, index) => {
    const daysAgo = baseDays.length - 1 - index;
    const workouts = sampleWorkoutsByDaysAgo[daysAgo] ?? [];

    workoutsByDate[day.key] = workouts.map((workout, workoutIndex) => ({
      ...workout,
      id: `sample-${day.key}-${workoutIndex}`,
      slug: "",
      badge: getEffortBadge(workout.effort)
    }));
  });

  const calendarDays: CalendarDay[] = baseDays.map((day) => {
    const workouts = workoutsByDate[day.key] ?? [];

    return {
      ...day,
      calories: sumCalories(workouts),
      load: workouts.reduce((total, workout) => total + workout.effort, 0),
      activityCount: workouts.length
    };
  });

  const todayKey = baseDays[baseDays.length - 1].key;

  return {
    baseCalories: 2400,
    goalAdjustment: 0,
    activityCalories: sumCalories(workoutsByDate[todayKey] ?? []),
    workoutsByDate,
    nutritionTotalsByDate: {
      [todayKey]: { calories: 1285, protein: 72, carbs: 168, fat: 36 }
    },
    calendarDays
  };
}

export function sumCalories(workouts: Pick<Workout, "calories">[]) {
  return Math.round(
    workouts.reduce((total, workout) => total + (workout.calories ?? 0), 0)
  );
}
