import { notFound } from "next/navigation";
import { ActivityDetailPage } from "@/components/workouts/activity-detail-page";
import { getActivitySlug } from "@/lib/activity-slug";
import { formatActivityTime, formatWorkoutDate } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { getActivityVisualData } from "@/lib/activity-visual-cache";
import {
  calculateActivityLoad,
  formatDistance,
  formatDuration
} from "@/lib/workout-metrics";

type ActivityRouteProps = {
  params: Promise<{
    activitySlug: string;
  }>;
};

type ActivityDetailRow = {
  stravaActivityId: string;
  name: string;
  type: string;
  calories: number | null;
  movingTime: number | null;
  sufferScore: number | null;
  distance: number | null;
  startDate: Date;
};

export default async function ActivityRoute({ params }: ActivityRouteProps) {
  const { activitySlug } = await params;
  const userId = await getCurrentUserId();

  if (!userId) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      // The slug is derived from the name, so match on names only and load
      // the full row for the one activity that matches.
      activities: {
        orderBy: { startDate: "desc" },
        select: { id: true, name: true }
      }
    }
  });

  if (!user) {
    notFound();
  }

  const match = user.activities.find(
    (item) => getActivitySlug(item.name) === activitySlug
  );
  const activity: ActivityDetailRow | null = match
    ? await prisma.activity.findUnique({
        where: { id: match.id },
        select: {
          stravaActivityId: true,
          name: true,
          type: true,
          calories: true,
          movingTime: true,
          sufferScore: true,
          distance: true,
          startDate: true
        }
      })
    : null;

  if (!activity) {
    notFound();
  }

  // Not awaited: the page renders its stats straight away and streams in the
  // route map and charts when Strava (or the cache) answers.
  const visualData = getActivityVisualData({
    userId,
    stravaActivityId: activity.stravaActivityId,
    fallbackDistanceMeters: activity.distance
  });

  return (
    <ActivityDetailPage
      activity={{
        name: activity.name,
        type: activity.type,
        dateLabel: formatWorkoutDate(activity.startDate),
        startTime: formatActivityTime(activity.startDate),
        calories:
          typeof activity.calories === "number"
            ? Math.round(activity.calories)
            : null,
        durationLabel: formatDuration(activity.movingTime),
        distanceLabel: formatDistance(activity.distance),
        effort: calculateActivityLoad(activity)
      }}
      visualData={visualData}
    />
  );
}
