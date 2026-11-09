import { Plus, Trash2 } from "lucide-react";
import type {
  CatalogFood,
  SavedMealIngredient
} from "@/components/dashboard/nutrition-diary-storage";
import { getFoodPortion, getMealTotals } from "@/lib/nutrition-portions";
import { GramsInput, NutritionPreview } from "./nutrition-inputs";

/** Build a new saved meal from browse/search results. */
export function MealBuilder({
  name,
  onNameChange,
  ingredients,
  onAddIngredient,
  onIngredientGramsChange,
  onRemoveIngredient,
  onSave,
  heading,
  foods,
  emptyMessage
}: {
  name: string;
  onNameChange: (name: string) => void;
  ingredients: SavedMealIngredient[];
  onAddIngredient: (food: CatalogFood) => void;
  onIngredientGramsChange: (index: number, grams: number) => void;
  onRemoveIngredient: (index: number) => void;
  onSave: () => void;
  heading: string;
  foods: CatalogFood[];
  emptyMessage: string;
}) {
  const totals = getMealTotals(ingredients);

  return (
    <section className="mt-5 border-t border-white/[0.06] pt-5">
      <h2 className="text-sm font-bold text-white">Build meal</h2>
      <input
        className="mt-3 min-h-11 w-full rounded-full border border-white/[0.06] bg-black/28 px-4 text-sm font-semibold text-white outline-none placeholder:text-app-muted focus:border-app-green/60"
        onChange={(event) => onNameChange(event.target.value)}
        placeholder="Meal name"
        type="text"
        value={name}
      />

      <p className="mt-4 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-app-secondary">
        {heading}
      </p>

      <div className="mt-2 max-h-[190px] space-y-2 overflow-y-auto pr-1">
        {foods.length === 0 ? (
          <p className="rounded-[18px] bg-black/24 px-3 py-3 text-xs font-semibold text-app-muted">
            {emptyMessage}
          </p>
        ) : null}

        {foods.map((food) => (
          <div
            key={food.id}
            className="flex items-center justify-between gap-3 rounded-[18px] bg-black/24 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{food.name}</p>
              <p className="mt-1 text-xs font-semibold text-app-muted">
                {food.per100g.calories} kcal / 100 g
              </p>
            </div>
            <button
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-app-green"
              type="button"
              aria-label={`Add ${food.name} to meal`}
              onClick={() => onAddIngredient(food)}
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      {ingredients.length > 0 ? (
        <div className="mt-4 space-y-2">
          {ingredients.map((ingredient, index) => (
            <div
              key={`${ingredient.food.id}-${index}`}
              className="grid grid-cols-[minmax(0,1fr)_96px_auto] items-center gap-2 rounded-[18px] bg-black/24 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {ingredient.food.name}
                </p>
                <p className="mt-1 text-xs font-semibold text-app-muted">
                  {getFoodPortion(ingredient.food, ingredient.grams).calories.toLocaleString()}{" "}
                  kcal
                </p>
              </div>
              <GramsInput
                label="g"
                value={String(ingredient.grams)}
                onChange={(value) => onIngredientGramsChange(index, Number(value))}
              />
              <button
                className="flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-app-muted transition hover:bg-app-red/20 hover:text-app-red"
                type="button"
                aria-label={`Remove ${ingredient.food.name}`}
                onClick={() => onRemoveIngredient(index)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <NutritionPreview
        calories={totals.calories}
        protein={totals.protein}
        carbs={totals.carbs}
        fat={totals.fat}
      />

      <button
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-app-green px-5 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5"
        type="button"
        onClick={onSave}
      >
        <Plus className="size-5" aria-hidden="true" />
        Save meal
      </button>
    </section>
  );
}
