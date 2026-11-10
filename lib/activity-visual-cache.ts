import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { getFreshStravaAccessToken } from "./strava";
import {
  getStravaActivityVisualData,
  type ActivityVisualData
} from "./strava-activity-detail";

/**
 * A finished activity's route and streams never change, so the workout page
 * fetches them from Strava once and then serves them from Next's data cache.
 * That makes repeat visits fast and saves two requests from the app's shared
 * Strava rate limit (100 per 15 minutes) on every view.
 *
 * The access token is looked up inside the cached function, not passed in:
 * cache keys include the arguments, and the token changes every few hours.
 * Failures throw, and thrown results are never cached.
 */
const loadActivityVisualData = unstable_cache(
  async (
    userId: string,
    stravaActivityId: string,
    fallbackDistanceMeters: number | null
  ): Promise<ActivityVisualData> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        tokenExpiresAt: true
      }
    });

    if (!user) {
      throw new Error("User not found.");
    }

    const accessToken = await getFreshStravaAccessToken(user);

    return getStravaActivityVisualData({
      accessToken,
      stravaActivityId,
      fallbackDistanceMeters
    });
  },
  // Bump the version when the shape of ActivityVisualData changes.
  ["strava-activity-visual-v1"],
  { revalidate: 60 * 60 * 24 * 30 }
);

/** Route and streams for one activity, or null when Strava can't provide them. */
export async function getActivityVisualData(options: {
  userId: string;
  stravaActivityId: string;
  fallbackDistanceMeters: number | null;
}): Promise<ActivityVisualData | null> {
  try {
    return await loadActivityVisualData(
      options.userId,
      options.stravaActivityId,
      options.fallbackDistanceMeters
    );
  } catch (error) {
    console.error(error);

    return null;
  }
}
