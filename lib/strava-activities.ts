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
// Strava's read rate limit is shared across the whole app (100 requests / 15
// minutes on the free tier), so space the detail batches out and bail before we
// actually get throttled.
const DETAIL_BATCH_DELAY_MS = 1500;
const RATE_LIMIT_BUFFER = 5;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSyncWindowStart() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - SYNC_WINDOW_DAYS);

  return Math.floor(date.getTime() / 1000);
}

function isNearRateLimit(response: Response) {
  const usage = response.headers.get("x-ratelimit-usage");
  const limit = response.headers.get("x-ratelimit-limit");

  if (!usage || !limit) {
    return false;
  }

  const used15 = Number(usage.split(",")[0]?.trim());
  const limit15 = Number(limit.split(",")[0]?.trim());

  if (!Number.isFinite(used15) || !Number.isFinite(limit15)) {
    return false;
  }

  return used15 >= limit15 - RATE_LIMIT_BUFFER;
}

type DetailFetch = {
  // `null` means the detail call failed but the summary is still usable.
  activity: StravaActivity | null;
  // `true` means we hit (or are about to hit) the rate limit — stop calling the
  // detail endpoint for the rest of this sync.
  rateLimited: boolean;
};

async function fetchActivityDetail(
  accessToken: string,
  id: number
): Promise<DetailFetch> {
  const response = await fetch(`https://www.strava.com/api/v3/activities/${id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (response.status === 429) {
    return { activity: null, rateLimited: true };
  }

  if (!response.ok) {
    return { activity: null, rateLimited: false };
  }

  const detail = (await response.json()) as StravaActivity;

  return { activity: detail, rateLimited: isNearRateLimit(response) };
}

export async function syncRecentStravaActivities({
  accessToken,
  userId
}: {
  accessToken: string;
  userId: string;
}) {
  const windowStart = getSyncWindowStart();
  const activitySummaries: StravaActivity[] = [];
  let page = 1;

  while (true) {
    const activitiesUrl = new URL(
      "https://www.strava.com/api/v3/athlete/activities"
    );
    activitiesUrl.searchParams.set("per_page", String(ACTIVITIES_PER_PAGE));
    activitiesUrl.searchParams.set("after", String(windowStart));
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

  // Activities we've already stored calories for don't need a detail call —
  // skipping them keeps most syncs well under the rate limit.
  const storedActivities = await prisma.activity.findMany({
    where: { userId },
    select: { stravaActivityId: true, calories: true }
  });
  const storedCalories = new Map(
    storedActivities.map((activity) => [
      activity.stravaActivityId,
      activity.calories
    ])
  );

  const activities: StravaActivity[] = [];
  let rateLimited = false;

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
        const alreadyHaveCalories =
          typeof activity.calories === "number" ||
          typeof storedCalories.get(String(activity.id)) === "number";

        if (alreadyHaveCalories || rateLimited) {
          return activity;
        }

        const result = await fetchActivityDetail(accessToken, activity.id);

        if (result.rateLimited) {
          rateLimited = true;
        }

        return result.activity ?? activity;
      })
    );

    activities.push(...detailedBatch);

    if (rateLimited) {
      // Persist the remaining summaries so their metadata still syncs; the
      // null-guard on the upsert keeps previously-stored calories intact.
      activities.push(...activitySummaries.slice(startIndex + DETAIL_BATCH_SIZE));
      break;
    }

    if (startIndex + DETAIL_BATCH_SIZE < activitySummaries.length) {
      await sleep(DETAIL_BATCH_DELAY_MS);
    }
  }

  await Promise.all(
    activities.map((activity) => {
      const type = activity.sport_type ?? activity.type ?? "Activity";
      const distance = activity.distance ?? null;
      const movingTime = activity.moving_time ?? null;
      const calories =
        typeof activity.calories === "number" ? activity.calories : null;
      const sufferScore =
        typeof activity.suffer_score === "number" ? activity.suffer_score : null;

      return prisma.activity.upsert({
        where: {
          stravaActivityId: String(activity.id)
        },
        update: {
          name: activity.name,
          type,
          startDate: new Date(activity.start_date),
          distance,
          movingTime,
          // Only write calories / sufferScore when we actually have a value. A
          // summary-only record (rate-limited run, or a detail call that never
          // happened) must not blank out data an earlier detailed sync stored.
          ...(calories !== null ? { calories } : {}),
          ...(sufferScore !== null ? { sufferScore } : {})
        },
        create: {
          userId,
          stravaActivityId: String(activity.id),
          name: activity.name,
          type,
          startDate: new Date(activity.start_date),
          distance,
          movingTime,
          calories,
          sufferScore
        }
      });
    })
  );

  return activities.length;
}
