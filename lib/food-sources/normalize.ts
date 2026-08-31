import type { NormalizedFood, NormalizedServing } from "./types";

// A food that is 100% fat is ~900 kcal / 100 g; anything above this is bad data.
export const MAX_SANE_KCAL_PER_100G = 1000;
// Stated calories vs. Atwater estimate (4/4/9). Loose enough to allow fiber,
// sugar alcohols and rounding; tight enough to drop clearly broken rows.
const ATWATER_TOLERANCE = 0.4;
const ATWATER_MIN_KCAL = 40;

export function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

/** Title-case a string that has no lowercase letters (USDA/OFF SHOUTING). */
export function titleCaseIfShouting(value: string): string {
  if (/[a-z]/.test(value)) {
    return value;
  }

  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function cleanText(value: string | undefined | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return titleCaseIfShouting(value.replace(/\s+/g, " ").trim()) || undefined;
}

/** Stated kcal is grossly inconsistent with the macro breakdown. */
export function failsAtwaterCheck(
  calories: number,
  protein: number,
  carbs: number,
  fat: number
): boolean {
  const estimate = 4 * protein + 4 * carbs + 9 * fat;

  if (calories < ATWATER_MIN_KCAL || estimate < ATWATER_MIN_KCAL) {
    return false;
  }

  return (
    Math.abs(calories - estimate) / Math.max(calories, estimate) >
    ATWATER_TOLERANCE
  );
}

/** "100 g" plus the provider's own serving when it's a usable gram amount. */
export function buildServings(
  servingGrams: number | null,
  servingLabel: string
): NormalizedServing[] {
  if (!servingGrams || servingGrams === 100 || servingGrams <= 0) {
    return [{ label: "100 g", grams: 100, isDefault: true }];
  }

  return [
    { label: servingLabel, grams: round(servingGrams, 2), isDefault: true },
    { label: "100 g", grams: 100 }
  ];
}

/** Drop repeats of the same name+brand, keeping the first (highest-ranked). */
export function dedupeByNameBrand(foods: NormalizedFood[]): NormalizedFood[] {
  const seen = new Set<string>();

  return foods.filter((food) => {
    const key = `${food.name.toLowerCase()}|${(food.brand ?? "").toLowerCase()}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);

    return true;
  });
}
