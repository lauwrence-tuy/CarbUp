import type { Prisma } from "@prisma/client";
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
// After the first sync, only re-read this many days before the newest stored
// activity: enough to pick up late uploads, renames and calories Strava adds
// after processing, without re-reading six months every time.
const INCREMENTAL_OVERLAP_DAYS = 7;
const DAY_SECONDS = 24 * 60 * 60;
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

/**
 * Unix seconds to fetch activities after: the full window on a first sync,
 * otherwise a short overlap before the newest activity already stored.
 */
async function getSyncStart(userId: string) {
  const windowStart = getSyncWindowStart();
  const newest = await prisma.activity.findFirst({
    where: { userId },
    orderBy: { startDate: "desc" },
    select: { startDate: true }
  });

  if (!newest) {
    return windowStart;
  }

  const overlapStart =
    Math.floor(newest.startDate.getTime() / 1000) - INCREMENTAL_OVERLAP_DAYS * DAY_SECONDS;

  return Math.max(windowStart, overlapStart);
}

type StoredActivity = {
  stravaActivityId: string;
  name: string;
  type: string;
  startDate: Date;
  distance: number | null;
  movingTime: number | null;
  calories: number | null;
  sufferScore: number | null;
};

function toActivityFields(activity: StravaActivity) {
  return {
    name: activity.name,
    type: activity.sport_type ?? activity.type ?? "Activity",
    startDate: new Date(activity.start_date),
    distance: activity.distance ?? null,
    movingTime: activity.moving_time ?? null,
    calories: typeof activity.calories === "number" ? activity.calories : null,
    sufferScore:
      typeof activity.suffer_score === "number" ? activity.suffer_score : null
  };
}

/**
 * The fields to update on a stored activity, or null when nothing changed.
 * calories / sufferScore are only written when Strava returned a value, so a
 * summary-only record never blanks out data an earlier detailed sync stored.
 */
function getChangedFields(
  stored: StoredActivity,
  next: ReturnType<typeof toActivityFields>
) {
  const changes: Partial<ReturnType<typeof toActivityFields>> = {};

  if (stored.name !== next.name) changes.name = next.name;
  if (stored.type !== next.type) changes.type = next.type;
  if (stored.startDate.getTime() !== next.startDate.getTime()) {
    changes.startDate = next.startDate;
  }
  if (stored.distance !== next.distance) changes.distance = next.distance;
  if (stored.movingTime !== next.movingTime) changes.movingTime = next.movingTime;
  if (next.calories !== null && stored.calories !== next.calories) {
    changes.calories = next.calories;
  }
  if (next.sufferScore !== null && stored.sufferScore !== next.sufferScore) {
    changes.sufferScore = next.sufferScore;
  }

  return Object.keys(changes).length > 0 ? changes : null;
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
  const windowStart = await getSyncStart(userId);
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

  // Stored copies of the activities in this window: used to skip detail calls
  // for activities that already have calories, and to write only what changed.
  const storedActivities: StoredActivity[] = await prisma.activity.findMany({
    where: {
      userId,
      stravaActivityId: {
        in: activitySummaries.map((activity) => String(activity.id))
      }
    },
    select: {
      stravaActivityId: true,
      name: true,
      type: true,
      startDate: true,
      distance: true,
      movingTime: true,
      calories: true,
      sufferScore: true
    }
  });
  const storedById = new Map(
    storedActivities.map((activity) => [activity.stravaActivityId, activity])
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
          typeof storedById.get(String(activity.id))?.calories === "number";

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

  const newActivities: Prisma.ActivityCreateManyInput[] = [];
  const changedActivities: Array<{
    stravaActivityId: string;
    data: Prisma.ActivityUpdateInput;
  }> = [];

  for (const activity of activities) {
    const stravaActivityId = String(activity.id);
    const fields = toActivityFields(activity);
    const stored = storedById.get(stravaActivityId);

    if (!stored) {
      newActivities.push({ userId, stravaActivityId, ...fields });
      continue;
    }

    const changes = getChangedFields(stored, fields);

    if (changes) {
      changedActivities.push({ stravaActivityId, data: changes });
    }
  }

  // One insert for every new activity; individual updates only for the few
  // that changed. skipDuplicates covers a sync racing another sync.
  if (newActivities.length > 0) {
    await prisma.activity.createMany({
      data: newActivities,
      skipDuplicates: true
    });
  }

  if (changedActivities.length > 0) {
    await prisma.$transaction(
      changedActivities.map(({ stravaActivityId, data }) =>
        prisma.activity.update({ where: { stravaActivityId }, data })
      )
    );
  }

  return activities.length;
}
