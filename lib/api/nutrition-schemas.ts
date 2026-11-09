import { z } from "zod";

const id = z.string().trim().min(1);
const name = z.string().trim().min(1).max(200);
const optionalText = z
  .string()
  .nullish()
  .transform((value) => value?.trim() || null);

/** Missing or null amounts count as 0, matching what the app already stores. */
const amount = z
  .number()
  .finite()
  .nonnegative()
  .nullish()
  .transform((value) => value ?? 0);

// --- Food logs --------------------------------------------------------------

export const mealNames = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

export const createFoodLogSchema = z
  .object({
    dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
    entry: z.object({
      id: z.string().nullish(),
      name,
      brand: optionalText,
      meal: z.enum(mealNames),
      source: z.enum(["food", "meal", "quick"]).default("food"),
      serving: z.string().nullish(),
      grams: amount,
      baseGrams: z.number().finite().positive().nullish(),
      calories: amount,
      protein: amount,
      carbs: amount,
      fat: amount,
      items: z.array(z.unknown()).nullish()
    })
  })
  .transform(({ dateKey, entry }) => ({
    dateKey,
    foodId: entry.id || null,
    meal: entry.meal,
    source: entry.source,
    name: entry.name,
    brand: entry.brand,
    serving: entry.serving || `${Math.round(entry.grams)} g`,
    baseGrams: entry.baseGrams || entry.grams || 100,
    grams: entry.grams,
    calories: Math.round(entry.calories),
    protein: Math.round(entry.protein),
    carbs: Math.round(entry.carbs),
    fat: Math.round(entry.fat),
    itemsJson: entry.items ? JSON.stringify(entry.items) : null
  }));

export const deleteFoodLogSchema = z.object({ logId: id });

// --- Saved meals ------------------------------------------------------------

export const createSavedMealSchema = z.object({
  name,
  ingredients: z
    .array(
      z.looseObject({
        food: z.looseObject({ name }),
        grams: z.number().finite().nonnegative()
      })
    )
    .min(1, "A meal needs at least one ingredient")
});

export const deleteSavedMealSchema = z.object({ mealId: id });

// --- Custom foods -----------------------------------------------------------

const customFoodFields = z.object({
  name,
  brand: optionalText,
  caloriesPer100g: z.number().finite().nonnegative(),
  proteinPer100g: z.number().finite().nonnegative(),
  carbsPer100g: z.number().finite().nonnegative(),
  fatPer100g: z.number().finite().nonnegative(),
  defaultServingGrams: z.number().finite().positive().nullish(),
  defaultServingLabel: optionalText
});

function toCustomFood(fields: z.output<typeof customFoodFields>) {
  const servingGrams = fields.defaultServingGrams ?? 100;

  return {
    name: fields.name,
    brand: fields.brand,
    caloriesPer100g: fields.caloriesPer100g,
    proteinPer100g: fields.proteinPer100g,
    carbsPer100g: fields.carbsPer100g,
    fatPer100g: fields.fatPer100g,
    defaultServingGrams: servingGrams,
    defaultServingLabel: fields.defaultServingLabel ?? `${servingGrams} g`
  };
}

export const createCustomFoodSchema = customFoodFields.transform(toCustomFood);

export const updateCustomFoodSchema = customFoodFields
  .extend({ id })
  .transform(({ id: foodId, ...fields }) => ({
    id: foodId,
    food: toCustomFood(fields)
  }));

export const deleteCustomFoodSchema = z.object({ id });
