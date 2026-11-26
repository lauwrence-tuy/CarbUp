import { POUNDS_PER_KILOGRAM } from "@/lib/calorie-settings";
import { getLocalDateKey } from "@/lib/date";
import { calculateActivityLoad } from "@/lib/workout-metrics";

/**
 * Day-level fueling targets for a cyclist, from how long and how hard they
 * trained. All the numbers come from here; the AI coach only explains them.
 *
 * Carbohydrate bands (g per kg of body weight per day) follow the sports
 * nutrition consensus (Thomas, Erdman & Burke 2016; Burke et al. 2011):
 * light 3–5, moderate (~1 h) 5–7, high (1–3 h) 6–10, very high (4 h+) 8–12.
 */

/** Used when the rider hasn't set a weight. */
export const DEFAULT_WEIGHT_KG = 70;

export const PROTEIN_G_PER_KG = 1.6;

/** A day this hard counts one band higher than its duration alone. */
const HARD_DAY_LOAD = 100;

/** A ride this long, or a day this hard, earns a recovery snack. */
const RECOVERY_RIDE_MINUTES = 90;
const RECOVERY_DAY_LOAD = 65;
const RECOVERY_CARBS_G_PER_KG = 1;
const RECOVERY_PROTEIN_G_PER_KG = 0.3;

/** Rides shorter than this don't need carbs on the bike. */
const IN_RIDE_FUEL_MINUTES = 60;
const LONG_RIDE_MINUTES = 150;

export type DayType = "rest" | "light" | "moderate" | "high" | "very-high";

const CARB_BANDS: Record<DayType, { min: number; max: number }> = {
  rest: { min: 3, max: 5 },
  light: { min: 3, max: 5 },
  moderate: { min: 5, max: 7 },
  high: { min: 6, max: 10 },
  "very-high": { min: 8, max: 12 }
};

const DAY_TYPE_ORDER: DayType[] = ["rest", "light", "moderate", "high", "very-high"];

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  rest: "Rest day",
  light: "Light day",
  moderate: "Moderate day",
  high: "Big training day",
  "very-high": "Very big training day"
};

export type FuelingDayInput = {
  /** Body weight in kg, or null when the rider hasn't set one. */
  weightKg: number | null;
  /** Total moving time across the day's activities. */
  trainingMinutes: number;
  /** Total training load (Strava relative effort or our estimate). */
  load: number;
  longestRideMinutes: number;
  carbsEaten: number;
  proteinEaten: number;
  isToday: boolean;
};

export type FuelingPlan = {
  dayType: DayType;
  weightKg: number;
  weightIsDefault: boolean;
  trainingMinutes: number;
  load: number;
  isToday: boolean;
  carbs: {
    perKgMin: number;
    perKgMax: number;
    minG: number;
    maxG: number;
    targetG: number;
    eatenG: number;
    remainingG: number;
  };
  protein: {
    perKg: number;
    targetG: number;
    eatenG: number;
    remainingG: number;
  };
  /** Carbs and protein soon after a long or hard ride, or null. */
  recovery: { carbsG: number; proteinG: number } | null;
  /** Carbs per hour on the bike for rides like the day's longest, or null. */
  duringRide: { rideMinutes: number; carbsPerHourMin: number; carbsPerHourMax: number } | null;
};

/** The stored weight in kg, or null when it's missing or not a real weight. */
export function toWeightKg(weight: number | null | undefined, units: string) {
  if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) {
    return null;
  }

  return units === "metric" ? weight : weight / POUNDS_PER_KILOGRAM;
}

type TrainingActivity = {
  movingTime: number | null;
  calories: number | null;
  sufferScore: number | null;
};

export type TrainingSummary = {
  trainingMinutes: number;
  load: number;
  longestRideMinutes: number;
};

export const NO_TRAINING: TrainingSummary = { trainingMinutes: 0, load: 0, longestRideMinutes: 0 };

/**
 * A day's training from its activities: total moving minutes, total load and
 * the longest single session. Moving time is stored in seconds.
 */
export function summarizeTraining(activities: TrainingActivity[]): TrainingSummary {
  return activities.reduce<TrainingSummary>(
    (summary, activity) => {
      const minutes = Math.round((activity.movingTime ?? 0) / 60);

      return {
        trainingMinutes: summary.trainingMinutes + minutes,
        load: summary.load + calculateActivityLoad(activity),
        longestRideMinutes: Math.max(summary.longestRideMinutes, minutes)
      };
    },
    NO_TRAINING
  );
}

/** summarizeTraining for each local day that has activities. */
export function summarizeTrainingByDate(
  activities: (TrainingActivity & { startDate: Date })[]
): Record<string, TrainingSummary> {
  const byDate: Record<string, TrainingActivity[]> = {};

  for (const activity of activities) {
    (byDate[getLocalDateKey(activity.startDate)] ??= []).push(activity);
  }

  return Object.fromEntries(
    Object.entries(byDate).map(([dateKey, dayActivities]) => [dateKey, summarizeTraining(dayActivities)])
  );
}

/** Duration sets the band; a very hard day moves a light or moderate day up one. */
export function classifyDay(trainingMinutes: number, load: number): DayType {
  if (trainingMinutes <= 0) {
    return "rest";
  }

  let dayType: DayType;

  if (trainingMinutes < 60) {
    dayType = "light";
  } else if (trainingMinutes < 90) {
    dayType = "moderate";
  } else if (trainingMinutes < 240) {
    dayType = "high";
  } else {
    dayType = "very-high";
  }

  if (load >= HARD_DAY_LOAD && (dayType === "light" || dayType === "moderate")) {
    dayType = DAY_TYPE_ORDER[DAY_TYPE_ORDER.indexOf(dayType) + 1];
  }

  return dayType;
}

/** Gram targets read better as round numbers; 5 g is well inside the estimate's error. */
function roundTo5(grams: number) {
  return Math.round(grams / 5) * 5;
}

export function buildFuelingPlan(input: FuelingDayInput): FuelingPlan {
  const weightIsDefault = input.weightKg == null;
  const weightKg = Math.round((input.weightKg ?? DEFAULT_WEIGHT_KG) * 10) / 10;
  const trainingMinutes = Math.max(0, Math.round(input.trainingMinutes));
  const load = Math.max(0, Math.round(input.load));
  const longestRideMinutes = Math.max(0, Math.round(input.longestRideMinutes));
  const dayType = classifyDay(trainingMinutes, load);
  const band = CARB_BANDS[dayType];

  const carbTarget = roundTo5(((band.min + band.max) / 2) * weightKg);
  const carbsEaten = Math.round(Math.max(input.carbsEaten, 0));
  const proteinTarget = roundTo5(PROTEIN_G_PER_KG * weightKg);
  const proteinEaten = Math.round(Math.max(input.proteinEaten, 0));

  const needsRecovery =
    trainingMinutes > 0 &&
    (longestRideMinutes >= RECOVERY_RIDE_MINUTES || load >= RECOVERY_DAY_LOAD);

  return {
    dayType,
    weightKg,
    weightIsDefault,
    trainingMinutes,
    load,
    isToday: input.isToday,
    carbs: {
      perKgMin: band.min,
      perKgMax: band.max,
      minG: roundTo5(band.min * weightKg),
      maxG: roundTo5(band.max * weightKg),
      targetG: carbTarget,
      eatenG: carbsEaten,
      remainingG: Math.max(carbTarget - carbsEaten, 0)
    },
    protein: {
      perKg: PROTEIN_G_PER_KG,
      targetG: proteinTarget,
      eatenG: proteinEaten,
      remainingG: Math.max(proteinTarget - proteinEaten, 0)
    },
    recovery: needsRecovery
      ? {
          carbsG: roundTo5(RECOVERY_CARBS_G_PER_KG * weightKg),
          proteinG: roundTo5(RECOVERY_PROTEIN_G_PER_KG * weightKg)
        }
      : null,
    duringRide:
      longestRideMinutes >= IN_RIDE_FUEL_MINUTES
        ? {
            rideMinutes: longestRideMinutes,
            ...(longestRideMinutes > LONG_RIDE_MINUTES
              ? { carbsPerHourMin: 60, carbsPerHourMax: 90 }
              : { carbsPerHourMin: 30, carbsPerHourMax: 60 })
          }
        : null
  };
}

/** "2 h 22 min", "45 min". */
export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest} min`;
  }

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
