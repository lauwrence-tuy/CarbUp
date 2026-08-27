import type { NormalizedFood } from "./types";
import { searchUsdaFoods } from "./usda";

export type {
  FoodSourceName,
  NormalizedFood,
  NormalizedServing
} from "./types";
export { searchUsdaFoods } from "./usda";

/**
 * Fan out to every external food provider in parallel and merge the results.
 * One provider failing or timing out must not sink the others, so each is
 * settled independently. Open Food Facts slots in here as a second entry.
 */
export async function searchExternalFoods(
  query: string
): Promise<NormalizedFood[]> {
  const trimmed = query.trim();

  if (trimmed.length < 2) {
    return [];
  }

  const settled = await Promise.allSettled([searchUsdaFoods(trimmed)]);

  return settled.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
}
