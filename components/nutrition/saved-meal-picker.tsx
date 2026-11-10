import { Apple, Plus, Trash2 } from "lucide-react";
import type { SavedMeal } from "./nutrition-diary-storage";
import { getMealTotals, getScaledMealTotals } from "@/lib/nutrition-portions";
import { GramsInput, NutritionPreview } from "./nutrition-inputs";

/** Pick a saved meal, scale it by total grams, and log it. */
export function SavedMealPicker({
  savedMeals,
  selectedMeal,
  gramsInput,
  onGramsInputChange,
  onSelect,
  onAdd,
  onRemove
}: {
  savedMeals: SavedMeal[];
  selectedMeal: SavedMeal | undefined;
  gramsInput: string;
  onGramsInputChange: (value: string) => void;
  onSelect: (mealId: string) => void;
  onAdd: (meal: SavedMeal, grams: number) => void;
  onRemove: (mealId: string) => void;
}) {
  const defaultGrams = selectedMeal ? getMealTotals(selectedMeal.ingredients).grams : 0;
  const grams = Number(gramsInput) || defaultGrams;
  const preview = selectedMeal ? getScaledMealTotals(selectedMeal, grams) : null;

  return (
    <section className="mt-5 border-t border-white/[0.06] pt-5">
      <div className="rounded-[24px] bg-black/30 p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-cds-interactive text-black">
            <Apple className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white">Saved meal</h2>
            <p className="mt-1 text-xs font-semibold text-cds-text-helper">
              Add a full dish by grams
            </p>
          </div>
        </div>

        {savedMeals.length > 0 && selectedMeal && preview ? (
          <div className="mt-4 space-y-3">
            <label>
              <span className="sr-only">Saved meal</span>
              <select
                className="min-h-11 w-full rounded-full border border-white/[0.06] bg-black/30 px-4 text-sm font-semibold text-white outline-none focus:border-cds-interactive"
                value={selectedMeal.id}
                onChange={(event) => onSelect(event.target.value)}
              >
                {savedMeals.map((meal) => (
                  <option key={meal.id} value={meal.id}>
                    {meal.name}
                  </option>
                ))}
              </select>
            </label>

            <GramsInput
              label="Meal grams"
              value={gramsInput}
              onChange={onGramsInputChange}
            />

            <NutritionPreview
              calories={preview.calories}
              protein={preview.protein}
              carbs={preview.carbs}
              fat={preview.fat}
            />

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-cds-interactive px-4 text-sm font-bold text-black shadow-[var(--cu-shadow-glow)] transition hover:-translate-y-0.5"
                type="button"
                onClick={() => onAdd(selectedMeal, grams)}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add meal
              </button>
              <button
                className="flex size-11 items-center justify-center rounded-full bg-white/[0.06] text-cds-text-helper transition hover:bg-app-red/20 hover:text-app-red"
                type="button"
                aria-label={`Delete saved meal ${selectedMeal.name}`}
                onClick={() => onRemove(selectedMeal.id)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-[20px] bg-cds-layer px-4 py-4 text-sm text-cds-text-helper">
            No saved meals yet.
          </p>
        )}
      </div>
    </section>
  );
}
