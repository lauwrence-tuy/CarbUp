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
