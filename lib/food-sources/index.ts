import type { NormalizedFood } from "./types";
import { searchOffFoods } from "./off";
import { searchUsdaFoods } from "./usda";

export type {
  FoodSourceName,
  NormalizedFood,
  NormalizedServing
} from "./types";
export {
  normalizeUsdaFood,
  searchUsdaFoods,
  type UsdaFood,
  type UsdaNutrient
} from "./usda";
export { lookupOffBarcode, searchOffFoods } from "./off";

/**
 * Fan out to every external food provider in parallel and merge the results.
 * One provider failing or timing out must not sink the others, so each is
 * settled independently. USDA covers generic foods well; Open Food Facts adds
 * branded/packaged coverage.
 */
export async function searchExternalFoods(
  query: string
): Promise<NormalizedFood[]> {
  const trimmed = query.trim();

  if (trimmed.length < 2) {
    return [];
  }

  const settled = await Promise.allSettled([
    searchUsdaFoods(trimmed),
    searchOffFoods(trimmed)
  ]);

  return settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
}
