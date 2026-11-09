import { notFound } from "next/navigation";
import { ActivityDetailPage } from "@/components/dashboard/activity-detail-page";
import { getActivitySlug } from "@/lib/activity-slug";
import { formatActivityTime, formatWorkoutDate } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { getFreshStravaAccessToken } from "@/lib/strava";
import { getStravaActivityVisualData } from "@/lib/strava-activity-detail";
import {
  estimateActivityLoad,
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
      id: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
      activities: {
        orderBy: { startDate: "desc" }
      }
    }
  });

  if (!user) {
    notFound();
  }

  const activities = user.activities as ActivityDetailRow[];
  const activity = activities.find(
    (item) => getActivitySlug(item.name) === activitySlug
  );

  if (!activity) {
    notFound();
  }

  const visualData = await getFreshStravaAccessToken(user)
    .then((accessToken) =>
      getStravaActivityVisualData({
        accessToken,
        stravaActivityId: activity.stravaActivityId,
        fallbackDistanceMeters: activity.distance
      })
    )
    .catch(() => null);

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
        effort: estimateActivityLoad(activity)
      }}
      visualData={visualData}
    />
  );
}
