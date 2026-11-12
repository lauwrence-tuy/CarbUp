export const DEFAULT_TARGET_CALORIES = 2400;

const MACRO_SPLIT = {
  protein: 0.18,
  carbs: 0.52,
  fat: 0.3
};

export function resolveBaseCalories(baseCalories: number) {
  return baseCalories > 0 ? baseCalories : DEFAULT_TARGET_CALORIES;
}

export function getMacroTargets(targetCalories: number) {
  const safeCalories = Math.max(targetCalories, 0);

  return {
    protein: Math.round((safeCalories * MACRO_SPLIT.protein) / 4),
    carbs: Math.round((safeCalories * MACRO_SPLIT.carbs) / 4),
    fat: Math.round((safeCalories * MACRO_SPLIT.fat) / 9)
  };
}

/**
 * A day's calorie target: maintenance (or the default when unset) plus that
 * day's activity calories plus the goal adjustment (0 to -750).
 */
export function getDailyCalorieTarget({
  baseCalories,
  activityCalories,
  goalAdjustment
}: {
  baseCalories: number;
  activityCalories: number;
  goalAdjustment: number;
}) {
  return resolveBaseCalories(baseCalories) + activityCalories + goalAdjustment;
}

/** Calories left before the target, and how far over it, never negative. */
export function getCalorieBalance(targetCalories: number, eatenCalories: number) {
  return {
    remaining: Math.max(targetCalories - eatenCalories, 0),
    over: Math.max(eatenCalories - targetCalories, 0)
  };
}

/**
 * The goal adjustment only applies once the user has set maintenance
 * calories; until then the default target is used as is.
 */
export function getEffectiveGoalAdjustment({
  maintenanceCalories,
  goalAdjustment
}: {
  maintenanceCalories: number | null;
  goalAdjustment: number;
}) {
  return maintenanceCalories == null ? 0 : goalAdjustment;
}
