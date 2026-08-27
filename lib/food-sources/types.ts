export type FoodSourceName = "usda" | "off";

export type NormalizedServing = {
  label: string;
  grams: number;
  isDefault?: boolean;
};

/**
 * Provider-agnostic food shape. Every external adapter maps its own response
 * into this so the search route and cache-through layer never see raw
 * provider payloads. Macros are always per 100 g.
 */
export type NormalizedFood = {
  source: FoodSourceName;
  externalId: string;
  name: string;
  brand?: string;
  barcode?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  defaultServingGrams: number;
  defaultServingLabel: string;
  /** True for curated datasets (USDA Foundation / SR Legacy). */
  verified: boolean;
  servings: NormalizedServing[];
};
