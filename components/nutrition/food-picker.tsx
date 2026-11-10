import { Pencil, Plus, Trash2 } from "lucide-react";
import { Tile } from "@carbon/react";
import type {
  CatalogFood,
  MealName
} from "./nutrition-diary-storage";
import { getFoodPortion } from "@/lib/nutrition-portions";
import { GramsInput, NutritionPreview } from "./nutrition-inputs";

export type BrowseTab = "recent" | "frequent" | "mine";

/** Browse/search results. The portion panel lives in SelectedFoodCard. */
export function FoodPicker({
  heading,
  isSearching,
  browseTabs,
  activeBrowseTab,
  onBrowseTabChange,
  foods,
  emptyMessage,
  errorMessage,
  selectedFood,
  selectedMeal,
  onSelect,
  onAdd,
  onEditCustom,
  onDeleteCustom
}: {
  heading: string;
  isSearching: boolean;
  /** Empty while searching, which hides the tabs. */
  browseTabs: BrowseTab[];
  activeBrowseTab: BrowseTab;
  onBrowseTabChange: (tab: BrowseTab) => void;
  foods: CatalogFood[];
  emptyMessage: string | null;
  errorMessage: string | null;
  selectedFood: CatalogFood | null;
  selectedMeal: MealName;
  onSelect: (food: CatalogFood) => void;
  onAdd: (food: CatalogFood) => void;
  onEditCustom: (food: CatalogFood) => void;
  onDeleteCustom: (food: CatalogFood) => void;
}) {
  return (
    <>
      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-cds-text-secondary">
          {heading}
        </p>
        {isSearching ? (
          <span className="text-xs font-semibold text-cds-text-helper">Searching...</span>
        ) : null}
      </div>

      {browseTabs.length > 0 ? (
        <div
          className={`mt-2 grid gap-2 rounded-full bg-black/30 p-1 ${
            browseTabs.length === 3 ? "grid-cols-3" : "grid-cols-2"
          }`}
        >
          {browseTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={activeBrowseTab === tab}
              className={`min-h-9 rounded-full text-xs font-bold capitalize transition ${
                activeBrowseTab === tab
                  ? "bg-cds-interactive text-black"
                  : "text-cds-text-secondary hover:bg-white/[0.08] hover:text-white"
              }`}
              onClick={() => onBrowseTabChange(tab)}
            >
              {tab === "mine" ? "Mine" : tab}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-2 max-h-[300px] space-y-2 overflow-y-auto pr-1">
        {emptyMessage ? (
          <p className="rounded-[20px] bg-black/30 px-4 py-4 text-sm text-cds-text-helper">
            {emptyMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="rounded-[20px] bg-app-red/10 px-4 py-4 text-sm font-semibold text-app-red">
            {errorMessage}
          </p>
        ) : null}

        {foods.map((food) => (
          <FoodRow
            key={food.id}
            food={food}
            selected={selectedFood?.id === food.id}
            selectedMeal={selectedMeal}
            onSelect={onSelect}
            onAdd={onAdd}
            onEditCustom={onEditCustom}
            onDeleteCustom={onDeleteCustom}
          />
        ))}
      </div>

      <p className="mt-4 text-[0.65rem] leading-4 text-cds-text-helper">
        Food data from USDA FoodData Central (public domain) and{" "}
        <a
          className="underline hover:text-cds-text-secondary"
          href="https://world.openfoodfacts.org"
          target="_blank"
          rel="noreferrer"
        >
          Open Food Facts
        </a>{" "}
        (ODbL).
      </p>
    </>
  );
}

function FoodRow({
  food,
  selected,
  selectedMeal,
  onSelect,
  onAdd,
  onEditCustom,
  onDeleteCustom
}: {
  food: CatalogFood;
  selected: boolean;
  selectedMeal: MealName;
  onSelect: (food: CatalogFood) => void;
  onAdd: (food: CatalogFood) => void;
  onEditCustom: (food: CatalogFood) => void;
  onDeleteCustom: (food: CatalogFood) => void;
}) {
  const iconButtonClass = selected
    ? "bg-black/15 text-black"
    : "bg-white/[0.06] text-cds-text-helper";

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-[20px] p-4 transition ${
        selected ? "bg-cds-interactive text-black" : "bg-black/30 text-white"
      }`}
    >
      <button
        className="min-w-0 flex-1 text-left"
        type="button"
        onClick={() => onSelect(food)}
      >
        <p className="truncate text-sm font-bold">{food.name}</p>
        <p
          className={`mt-1 text-xs font-semibold ${
            selected ? "text-black/65" : "text-cds-text-helper"
          }`}
        >
          {food.brand} - {food.serving}
        </p>
        <p
          className={`mt-2 text-xs font-semibold ${
            selected ? "text-black/70" : "text-cds-text-secondary"
          }`}
        >
          {food.calories} kcal - P {food.protein}g / C {food.carbs}g / F {food.fat}g
        </p>
      </button>
      <div className="flex shrink-0 items-center gap-1.5">
        {food.source === "custom" ? (
          <>
            <button
              type="button"
              aria-label={`Edit ${food.name}`}
              onClick={() => onEditCustom(food)}
              className={`flex size-8 items-center justify-center rounded-full transition ${iconButtonClass} ${
                selected ? "" : "hover:text-white"
              }`}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Delete ${food.name}`}
              onClick={() => onDeleteCustom(food)}
              className={`flex size-8 items-center justify-center rounded-full transition ${iconButtonClass} ${
                selected ? "" : "hover:bg-app-red/20 hover:text-app-red"
              }`}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </>
        ) : null}
        <button
          className={`flex size-10 items-center justify-center rounded-full transition hover:-translate-y-0.5 ${
            selected ? "bg-black text-white" : "bg-white text-black"
          }`}
          type="button"
          aria-label={`Add ${food.name} to ${selectedMeal}`}
          onClick={() => onAdd(food)}
        >
          <Plus className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function PortionPanel({
  food,
  gramsInput,
  onGramsInputChange,
  selectedMeal,
  onAdd
}: {
  food: CatalogFood;
  gramsInput: string;
  onGramsInputChange: (value: string) => void;
  selectedMeal: MealName;
  onAdd: () => void;
}) {
  const preview = getFoodPortion(food, Number(gramsInput) || 0);
  const matchesServing = food.servings.some(
    (serving) => String(serving.grams) === gramsInput
  );

  return (
    <div className="rounded-[24px] bg-black/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{food.name}</p>
          <p className="mt-1 text-xs font-semibold text-cds-text-helper">
            {food.per100g.calories} kcal per 100 g
            {food.brand ? ` - ${food.brand}` : ""}
          </p>
        </div>
        <GramsInput label="Grams" value={gramsInput} onChange={onGramsInputChange} />
      </div>

      {food.servings.length > 1 ? (
        <label className="mt-3 block">
          <span className="sr-only">Serving size</span>
          <select
            className="min-h-11 w-full rounded-full border border-white/[0.06] bg-black/30 px-4 text-sm font-semibold text-white outline-none focus:border-cds-interactive"
            value={matchesServing ? gramsInput : "custom"}
            onChange={(event) => {
              if (event.target.value !== "custom") {
                onGramsInputChange(event.target.value);
              }
            }}
          >
            {/* Some foods list the same serving twice (e.g. two "100 g"); show each once. */}
            {food.servings
              .filter(
                (serving, index, all) =>
                  all.findIndex(
                    (other) => other.label === serving.label && other.grams === serving.grams
                  ) === index
              )
              .map((serving) => (
                <option key={`${serving.label}-${serving.grams}`} value={String(serving.grams)}>
                  {serving.label} ({serving.grams} g)
                </option>
              ))}
            <option value="custom">Custom amount</option>
          </select>
        </label>
      ) : null}

      <NutritionPreview
        calories={preview.calories}
        protein={preview.protein}
        carbs={preview.carbs}
        fat={preview.fat}
      />

      <button
        className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-cds-interactive px-5 text-sm font-bold text-black shadow-[var(--cu-shadow-glow)] transition hover:-translate-y-0.5"
        type="button"
        onClick={onAdd}
      >
        <Plus className="size-5" aria-hidden="true" />
        Add to {selectedMeal}
      </button>
    </div>
  );
}

/** Right-column card: portion and Add button for the food picked on the left. */
export function SelectedFoodCard({
  food,
  gramsInput,
  onGramsInputChange,
  selectedMeal,
  onAdd
}: {
  food: CatalogFood | null;
  gramsInput: string;
  onGramsInputChange: (value: string) => void;
  selectedMeal: MealName;
  onAdd: () => void;
}) {
  return (
    <Tile className="!p-6">
      <h2 className="cu-heading-02">Selected food</h2>
      <div className="mt-4">
        {food ? (
          <PortionPanel
            food={food}
            gramsInput={gramsInput}
            onGramsInputChange={onGramsInputChange}
            selectedMeal={selectedMeal}
            onAdd={onAdd}
          />
        ) : (
          <p className="cu-body-01 rounded-[22px] bg-black/30 px-4 py-5 text-cds-text-helper">
            Pick a food from the list to set a portion and add it to {selectedMeal}.
          </p>
        )}
      </div>
    </Tile>
  );
}
