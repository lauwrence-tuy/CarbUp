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

const SYNC_WINDOW_DAYS = 183;
const ACTIVITIES_PER_PAGE = 200;
const DETAIL_BATCH_SIZE = 10;

function getSyncWindowStart() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - SYNC_WINDOW_DAYS);

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
  const activitySummaries: StravaActivity[] = [];
  let page = 1;

  while (true) {
    const activitiesUrl = new URL(
      "https://www.strava.com/api/v3/athlete/activities"
    );
    activitiesUrl.searchParams.set("per_page", String(ACTIVITIES_PER_PAGE));
    activitiesUrl.searchParams.set("after", String(getSyncWindowStart()));
    activitiesUrl.searchParams.set("page", String(page));

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

    const pageSummaries = (await response.json()) as StravaActivity[];
    activitySummaries.push(...pageSummaries);

    if (pageSummaries.length < ACTIVITIES_PER_PAGE) {
      break;
    }

    page += 1;
  }

  const activities: StravaActivity[] = [];

  for (
    let startIndex = 0;
    startIndex < activitySummaries.length;
    startIndex += DETAIL_BATCH_SIZE
  ) {
    const batch = activitySummaries.slice(
      startIndex,
      startIndex + DETAIL_BATCH_SIZE
    );
    const detailedBatch = await Promise.all(
      batch.map(async (activity) => {
        const detail = await fetchActivityDetail(accessToken, activity.id);

        return detail ?? activity;
      })
    );

    activities.push(...detailedBatch);
  }

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
