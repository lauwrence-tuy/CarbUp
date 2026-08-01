import { prisma } from "./prisma";

type StravaActivity = {
  id: number;
  name: string;
  type?: string;
  sport_type?: string;
  start_date: string;
  distance?: number;
  moving_time?: number;
  calories?: number;
  suffer_score?: number;
};

function getSyncWindowStart() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 8);

  return Math.floor(date.getTime() / 1000);
}

async function fetchActivityDetail(accessToken: string, id: number) {
  const response = await fetch(`https://www.strava.com/api/v3/activities/${id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as StravaActivity;
}

export async function syncRecentStravaActivities({
  accessToken,
  userId
}: {
  accessToken: string;
  userId: string;
}) {
  const activitiesUrl = new URL(
    "https://www.strava.com/api/v3/athlete/activities"
  );
  activitiesUrl.searchParams.set("per_page", "100");
  activitiesUrl.searchParams.set("after", String(getSyncWindowStart()));

  const response = await fetch(activitiesUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Strava activity sync failed: ${response.status} ${body}`);
  }

  const activitySummaries = (await response.json()) as StravaActivity[];
  const activities = await Promise.all(
    activitySummaries.map(async (activity) => {
      const detail = await fetchActivityDetail(accessToken, activity.id);

      return detail ?? activity;
    })
  );

  await Promise.all(
    activities.map((activity) =>
      prisma.activity.upsert({
        where: {
          stravaActivityId: String(activity.id)
        },
        update: {
          name: activity.name,
          type: activity.sport_type ?? activity.type ?? "Activity",
          startDate: new Date(activity.start_date),
          distance: activity.distance ?? null,
          movingTime: activity.moving_time ?? null,
          calories:
            typeof activity.calories === "number" ? activity.calories : null,
          sufferScore:
            typeof activity.suffer_score === "number"
              ? activity.suffer_score
              : null
        },
        create: {
          userId,
          stravaActivityId: String(activity.id),
          name: activity.name,
          type: activity.sport_type ?? activity.type ?? "Activity",
          startDate: new Date(activity.start_date),
          distance: activity.distance ?? null,
          movingTime: activity.moving_time ?? null,
          calories:
            typeof activity.calories === "number" ? activity.calories : null,
          sufferScore:
            typeof activity.suffer_score === "number"
              ? activity.suffer_score
              : null
        }
      })
    )
  );

  return activities.length;
}
