import { WorkoutsPage, type WorkoutListItem } from "@/components/workouts/workouts-page";
import { StravaLoginRequiredPage } from "@/components/strava/strava-login-required-page";
import { getActivitySlug } from "@/lib/activity-slug";
import { formatActivityTime, formatWorkoutDate, getLocalDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import {
  calculateActivityLoad,
  formatDistance,
  formatDuration,
  getEffortBadge,
  metersToMiles
} from "@/lib/workout-metrics";
import { getCurrentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

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

export default async function WorkoutsRoute() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          activities: {
            orderBy: { startDate: "desc" },
            take: 180,
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
          }
        }
      })
    : null;

  if (!user) {
    return <StravaLoginRequiredPage pageName="Workouts" />;
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
            ? metersToMiles(activity.distance)
            : null,
        distanceLabel: formatDistance(activity.distance),
        effort,
        badge: getEffortBadge(effort)
      };
    });

  return <WorkoutsPage workouts={workouts} isConnected={Boolean(user)} />;
}
