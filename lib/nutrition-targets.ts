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
