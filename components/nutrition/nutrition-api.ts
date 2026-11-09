// Browser-side calls to the nutrition API routes.

import type {
  FoodLogEntry,
  SavedMealIngredient
} from "./nutrition-diary-storage";

async function sendJson(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`${method} ${url} failed: ${response.status}`);
  }

  return response;
}

export async function saveFoodLog(entry: FoodLogEntry, dateKey: string) {
  const response = await sendJson("/api/nutrition/logs", "POST", { dateKey, entry });

  return (await response.json()) as { id: string };
}

export async function saveMeal(name: string, ingredients: SavedMealIngredient[]) {
  const response = await sendJson("/api/nutrition/saved-meals", "POST", {
    name,
    ingredients
  });

  return (await response.json()) as { id: string };
}

// Deletes are fire-and-forget: the UI removes the item right away and a
// failed request only means it reappears on the next page load.

export function deleteFoodLog(logId: string) {
  void sendJson("/api/nutrition/logs", "DELETE", { logId }).catch(() => {});
}

export function deleteSavedMeal(mealId: string) {
  void sendJson("/api/nutrition/saved-meals", "DELETE", { mealId }).catch(() => {});
}

export function deleteCustomFood(id: string) {
  void sendJson("/api/nutrition/foods", "DELETE", { id }).catch(() => {});
}
