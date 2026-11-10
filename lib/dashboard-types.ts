import type { EffortBadge } from "@/lib/workout-metrics";

/** One workout as shown in the dashboard's workouts list. */
export type Workout = {
  id: string;
  slug: string;
  name: string;
  type: string;
  calories: number | null;
  duration: string;
  distance: string;
  startTime: string;
  effort: number;
  badge: EffortBadge;
};

/** One day in the dashboard's 7-day strip. */
export type CalendarDay = {
  key: string;
  day: string;
  date: number;
  calories: number;
  load: number;
  activityCount: number;
  isToday: boolean;
};

/** One logged food, as listed under its meal on the dashboard. */
export type MealEntry = {
  name: string;
  calories: number;
};

/** Food logged per day, grouped by meal name (Breakfast, Lunch, Dinner, Snacks). */
export type MealsByDate = Record<string, Record<string, MealEntry[]>>;
