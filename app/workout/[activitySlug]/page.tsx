import { notFound } from "next/navigation";
import { ActivityDetailPage } from "@/components/dashboard/activity-detail-page";
import { getActivitySlug } from "@/lib/activity-slug";
import { APP_TIMEZONE, formatActivityTime } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { getFreshStravaAccessToken } from "@/lib/strava";
import { getStravaActivityVisualData } from "@/lib/strava-activity-detail";

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
        effort: calculateActivityLoad(activity)
      }}
      visualData={visualData}
    />
  );
}
