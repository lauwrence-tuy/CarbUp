import { WorkoutsPage, type WorkoutListItem } from "@/components/dashboard/workouts-page";
import { getActivitySlug } from "@/lib/activity-slug";
import { APP_TIMEZONE, formatActivityTime, getLocalDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { redirect } from "next/navigation";

type ActivityRow = {
  id: string;
  name: string;
  type: string;
  calories: number | null;
  movingTime: number | null;
  distance: number | null;
  startDate: Date;
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

function getEffortBadge(load: number): WorkoutListItem["badge"] {
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

function formatWorkoutDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export default async function WorkoutsRoute() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        include: {
          activities: {
            orderBy: { startDate: "desc" },
            take: 180
          }
        }
      })
    : null;

  if (!user) {
    redirect("/");
  }

  const activities = (user?.activities ?? []) as ActivityRow[];
  const workouts: WorkoutListItem[] =
    activities.map((activity) => {
      const effort = calculateActivityLoad(activity);

      return {
        id: activity.id,
        slug: getActivitySlug(activity.name),
        name: activity.name,
        type: activity.type,
        dateKey: getLocalDateKey(activity.startDate),
        dateLabel: formatWorkoutDate(activity.startDate),
        startTime: formatActivityTime(activity.startDate),
        calories:
          typeof activity.calories === "number"
            ? Math.round(activity.calories)
            : null,
        durationMinutes: Math.round((activity.movingTime ?? 0) / 60),
        durationLabel: formatDuration(activity.movingTime),
        distanceMiles:
          typeof activity.distance === "number"
            ? activity.distance / 1609.344
            : null,
        distanceLabel: formatDistance(activity.distance),
        effort,
        badge: getEffortBadge(effort)
      };
    });

  return <WorkoutsPage workouts={workouts} isConnected={Boolean(user)} />;
}
