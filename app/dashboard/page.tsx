import { AppDashboard } from "@/components/dashboard/app-dashboard";
import type { Workout } from "@/components/dashboard/workout-history-card";
import { getActivitySlug } from "@/lib/activity-slug";
import {
  formatActivityTime,
  getLocalDateKey,
  getTrailingSevenLocalDays,
  isSameLocalDay
} from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { redirect } from "next/navigation";

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
  distance: number | null;
  startDate: Date;
};

type FoodLogRow = {
  dateKey: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

function formatDuration(seconds: number | null) {
  if (!seconds) {
    return "Duration unavailable";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes} min`;
}

function formatDistance(meters: number | null) {
  if (!meters) {
    return "Distance unavailable";
  }

  return `${(meters / 1609.344).toFixed(1)} mi`;
}

function getEffortBadge(load: number): Workout["badge"] {
  if (load >= 100) {
    return "Very Hard";
  }

  if (load >= 65) {
    return "Hard";
  }

  if (load >= 30) {
    return "Moderate";
  }

  return "Easy";
}

function calculateActivityLoad(activity: {
  movingTime: number | null;
  calories: number | null;
}) {
  const durationLoad = (activity.movingTime ?? 0) / 90;
  const calorieLoad = (activity.calories ?? 0) / 18;

  return Math.round(durationLoad + calorieLoad);
}

function mapActivityToWorkout(
  activity: {
    id: string;
    name: string;
    type: string;
    calories: number | null;
    movingTime: number | null;
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
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: {
          activities: {
            orderBy: { startDate: "desc" },
            take: 30
          },
          foodLogs: {
            orderBy: { createdAt: "asc" }
          }
        }
      })
    : null;

  if (!user) {
    redirect("/");
  }

  const activities = (user?.activities ?? []) as ActivityRow[];
  const foodLogs = (user?.foodLogs ?? []) as FoodLogRow[];
  const todaysActivities =
    activities.filter((activity) => isSameLocalDay(activity.startDate));
  const activityCalories = Math.round(
    todaysActivities.reduce(
      (total, activity) => total + (activity.calories ?? 0),
      0
    )
  );
  const workouts: Workout[] = todaysActivities.map(mapActivityToWorkout);
  const trainingLoad = workouts.reduce(
    (total, workout) => total + workout.effort,
    0
  );
  const calendarDays = calendarBaseDays.map((day) => {
    const activitiesForDay =
      activities.filter(
        (activity) => getLocalDateKey(activity.startDate) === day.key
      );
    const calories = Math.round(
      activitiesForDay.reduce(
        (total, activity) => total + (activity.calories ?? 0),
        0
      )
    );
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

      grouped[key] = [...(grouped[key] ?? []), mapActivityToWorkout(activity)];

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

  return (
    <AppDashboard
      isConnected={Boolean(user)}
      authStatus={params.connected === "strava" ? "connected" : undefined}
      authError={params.auth_error}
      baseCalories={user?.maintenanceCalories ?? 0}
      activityCalories={activityCalories}
      goalAdjustment={user?.maintenanceCalories == null ? 0 : user.goalAdjustment}
      workouts={workouts}
      workoutsByDate={workoutsByDate}
      nutritionTotalsByDate={nutritionTotalsByDate}
      trainingLoad={trainingLoad}
      calendarDays={calendarDays}
    />
  );
}
