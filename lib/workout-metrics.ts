export type EffortBadge = "Easy" | "Moderate" | "Hard" | "Very Hard";

const METERS_PER_MILE = 1609.344;

type LoadInputs = {
  movingTime: number | null;
  calories: number | null;
};

function estimateActivityLoad({ movingTime, calories }: LoadInputs) {
  const durationLoad = (movingTime ?? 0) / 90;
  const calorieLoad = (calories ?? 0) / 18;

  return Math.round(durationLoad + calorieLoad);
}

/**
 * Training load for an activity. Uses Strava's suffer score when the activity
 * has one; otherwise estimates it from moving time and calories.
 */
export function calculateActivityLoad(
  activity: LoadInputs & { sufferScore: number | null }
) {
  if (typeof activity.sufferScore === "number") {
    return Math.round(activity.sufferScore);
  }

  return estimateActivityLoad(activity);
}

export function getEffortBadge(load: number): EffortBadge {
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

export function metersToMiles(meters: number) {
  return meters / METERS_PER_MILE;
}

export function formatDuration(seconds: number | null) {
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

export function formatDistance(meters: number | null) {
  if (!meters) {
    return "Distance unavailable";
  }

  return `${metersToMiles(meters).toFixed(1)} mi`;
}
