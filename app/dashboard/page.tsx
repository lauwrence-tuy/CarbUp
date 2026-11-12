import { CarbonDashboard } from "@/components/carbon/carbon-dashboard";
import { StravaLoginRequiredPage } from "@/components/strava/strava-login-required-page";
import type { MealsByDate, Workout } from "@/lib/dashboard-types";
import { sumActivityCaloriesByDate } from "@/lib/activity-calories";
import { getActivitySlug } from "@/lib/activity-slug";
import {
  formatActivityTime,
  getLocalDateKey,
  getTrailingSevenLocalDays
} from "@/lib/date";
import { getEffectiveGoalAdjustment } from "@/lib/nutrition-targets";
import { prisma } from "@/lib/prisma";
import {
  calculateActivityLoad,
  formatDistance,
  formatDuration,
  getEffortBadge
} from "@/lib/workout-metrics";
import { getCurrentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    connected?: string;
    auth_error?: string;
  }>;
};

type ActivityRow = {
  id: string;
  name: string;
  type: string;
  calories: number | null;
  movingTime: number | null;
  sufferScore: number | null;
  distance: number | null;
  startDate: Date;
};

type FoodLogRow = {
  dateKey: string;
  meal: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

function mapActivityToWorkout(
  activity: {
    id: string;
    name: string;
    type: string;
    calories: number | null;
    movingTime: number | null;
    sufferScore: number | null;
    distance: number | null;
    startDate: Date;
  }
): Workout {
  const load = calculateActivityLoad(activity);

  return {
    id: activity.id,
    slug: getActivitySlug(activity.name),
    name: activity.name,
    type: activity.type,
    calories:
      typeof activity.calories === "number"
        ? Math.round(activity.calories)
        : null,
    duration: formatDuration(activity.movingTime),
    distance: formatDistance(activity.distance),
    startTime: formatActivityTime(activity.startDate),
    effort: load,
    badge: getEffortBadge(load)
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const calendarBaseDays = getTrailingSevenLocalDays();
  const userId = await getCurrentUserId();
  // Only the 7 days on screen: the week's activities (with a day of slack for
  // time zones) and the week's food logs, plus the two profile fields used.
  const weekStart = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          maintenanceCalories: true,
          goalAdjustment: true,
          activities: {
            where: { startDate: { gte: weekStart } },
            orderBy: { startDate: "desc" },
            select: {
              id: true,
              name: true,
              type: true,
              calories: true,
              movingTime: true,
              sufferScore: true,
              distance: true,
              startDate: true
            }
          },
          foodLogs: {
            where: { dateKey: { in: calendarBaseDays.map((day) => day.key) } },
            orderBy: { createdAt: "asc" },
            select: {
              dateKey: true,
              meal: true,
              name: true,
              calories: true,
              protein: true,
              carbs: true,
              fat: true
            }
          }
        }
      })
    : null;

  if (!user) {
    return <StravaLoginRequiredPage pageName="Dashboard" />;
  }

  const activities = (user?.activities ?? []) as ActivityRow[];
  const foodLogs = (user?.foodLogs ?? []) as FoodLogRow[];
  const activityCaloriesByDate = sumActivityCaloriesByDate(activities);
  const calendarDays = calendarBaseDays.map((day) => {
    const activitiesForDay =
      activities.filter(
        (activity) => getLocalDateKey(activity.startDate) === day.key
      );
    const calories = activityCaloriesByDate[day.key] ?? 0;
    const load = activitiesForDay.reduce(
      (total, activity) => total + calculateActivityLoad(activity),
      0
    );

    return {
      ...day,
      calories,
      load,
      activityCount: activitiesForDay.length
    };
  });
  const calendarDateKeys = new Set(calendarDays.map((day) => day.key));
  const workoutsByDate =
    activities.reduce<Record<string, Workout[]>>((grouped, activity) => {
      const key = getLocalDateKey(activity.startDate);

      if (!calendarDateKeys.has(key)) {
        return grouped;
      }

      (grouped[key] ??= []).push(mapActivityToWorkout(activity));

      return grouped;
    }, {});
  const nutritionTotalsByDate =
    foodLogs.reduce<
      Record<string, { calories: number; protein: number; carbs: number; fat: number }>
    >((grouped, foodLog) => {
      if (!calendarDateKeys.has(foodLog.dateKey)) {
        return grouped;
      }

      const current = grouped[foodLog.dateKey] ?? {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      };

      grouped[foodLog.dateKey] = {
        calories: current.calories + foodLog.calories,
        protein: current.protein + foodLog.protein,
        carbs: current.carbs + foodLog.carbs,
        fat: current.fat + foodLog.fat
      };

      return grouped;
    }, {});

  // Each day's logged foods grouped by meal, for the dashboard's meals card.
  const mealsByDate = foodLogs.reduce<MealsByDate>((grouped, foodLog) => {
    if (!calendarDateKeys.has(foodLog.dateKey)) {
      return grouped;
    }

    const day = (grouped[foodLog.dateKey] ??= {});
    (day[foodLog.meal] ??= []).push({
      name: foodLog.name,
      calories: Math.round(foodLog.calories)
    });

    return grouped;
  }, {});

  return (
    <CarbonDashboard
      isConnected={Boolean(user)}
      authStatus={params.connected === "strava" ? "connected" : undefined}
      authError={params.auth_error}
      baseCalories={user?.maintenanceCalories ?? 0}
      goalAdjustment={getEffectiveGoalAdjustment(user)}
      workoutsByDate={workoutsByDate}
      nutritionTotalsByDate={nutritionTotalsByDate}
      mealsByDate={mealsByDate}
      calendarDays={calendarDays}
    />
  );
}
