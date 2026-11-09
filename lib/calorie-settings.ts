// Shared by the settings form (live preview) and the saveUserSettings action
// (the value that's actually stored), so the two can't drift apart.

export const POUNDS_PER_KILOGRAM = 2.2046226218;

/** Calories per pound of body weight for each everyday activity level. */
export const ACTIVITY_MULTIPLIERS = {
  sedentary: 13,
  light: 14,
  active: 16,
  very_active: 18
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;

export const DEFAULT_ACTIVITY_LEVEL: ActivityLevel = "active";

/** Daily calorie adjustment for each weight goal. */
export const GOAL_ADJUSTMENTS = {
  maintain: 0,
  lose_slow: -250,
  lose_steady: -500,
  lose_fast: -750
} as const;

export type GoalType = keyof typeof GOAL_ADJUSTMENTS;

export function isActivityLevel(value: string): value is ActivityLevel {
  return Object.hasOwn(ACTIVITY_MULTIPLIERS, value);
}

export function isGoalType(value: string): value is GoalType {
  return Object.hasOwn(GOAL_ADJUSTMENTS, value);
}

export function toPounds(weight: number, units: string) {
  return units === "metric" ? weight * POUNDS_PER_KILOGRAM : weight;
}

export function calculateBaseTdee({
  everydayActivity,
  units,
  weight
}: {
  everydayActivity: string;
  units: string;
  weight: number;
}) {
  const level = isActivityLevel(everydayActivity)
    ? everydayActivity
    : DEFAULT_ACTIVITY_LEVEL;

  return Math.round(toPounds(weight, units) * ACTIVITY_MULTIPLIERS[level]);
}
