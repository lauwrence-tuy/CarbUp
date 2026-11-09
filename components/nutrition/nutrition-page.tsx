"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { BarcodeScanner } from "@/components/dashboard/barcode-scanner";
import { CustomFoodForm } from "@/components/dashboard/custom-food-form";
import {
  createLocalNoonDate,
  DaySpreadWidget,
  formatDateKey
} from "@/components/dashboard/day-spread-widget";
import {
  type CatalogFood,
  createNutritionTotals,
  type MealName,
  type SavedMeal
} from "@/components/dashboard/nutrition-diary-storage";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  createFoodLogEntry,
  createMealLogEntry,
  getDefaultServingGrams
} from "@/lib/nutrition-portions";
import { resolveBaseCalories } from "@/lib/nutrition-targets";
import { DailySummary } from "./daily-summary";
import { FoodDiary } from "./food-diary";
import { type BrowseTab, FoodPicker } from "./food-picker";
import { MealBuilder } from "./meal-builder";
import { meals } from "./meals";
import { deleteCustomFood } from "./nutrition-api";
import { NutritionHeader } from "./nutrition-header";
import { SavedMealPicker } from "./saved-meal-picker";
import { type LogsByDate, useFoodLog } from "./use-food-log";
import { useFoodSearch } from "./use-food-search";
import { useLegacyStorageMigration } from "./use-legacy-storage-migration";
import { useMealBuilder } from "./use-meal-builder";
import { useSavedMeals } from "./use-saved-meals";

type NutritionPageProps = {
  baseCalories: number;
  activityCaloriesByDate: Record<string, number>;
  initialLogsByDate: LogsByDate;
  initialSavedMeals: SavedMeal[];
  initialRecentFoods: CatalogFood[];
  initialFrequentFoods: CatalogFood[];
  initialCustomFoods: CatalogFood[];
  goalAdjustment: number;
  isConnected: boolean;
};

type AddMode = "food" | "meal";

const addModes: Array<{ value: AddMode; label: string }> = [
  { value: "food", label: "Food" },
  { value: "meal", label: "Meal" }
];

const BROWSE_TAB_LABELS: Record<BrowseTab, string> = {
  recent: "Recent foods",
  frequent: "Frequent foods",
  mine: "My foods"
};

export function NutritionPage({
  baseCalories,
  activityCaloriesByDate,
  initialLogsByDate,
  initialSavedMeals,
  initialRecentFoods,
  initialFrequentFoods,
  initialCustomFoods,
  goalAdjustment,
  isConnected
}: NutritionPageProps) {
  // --- Selected day -----------------------------------------------------------
  const initialToday = useMemo(() => createLocalNoonDate(), []);
  const todayKey = useMemo(() => formatDateKey(initialToday), [initialToday]);
  const [selectedDate, setSelectedDate] = useState(initialToday);
  const selectedDateKey = formatDateKey(selectedDate);
  const isFuture = selectedDate.getTime() > initialToday.getTime();
  const dateLabel = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  });

  // --- Data ---------------------------------------------------------------------
  const foodLog = useFoodLog(initialLogsByDate, selectedDateKey);
  const savedMeals = useSavedMeals(initialSavedMeals);
  const mealBuilder = useMealBuilder();
  const search = useFoodSearch();
  const [customFoods, setCustomFoods] = useState(initialCustomFoods);

  useLegacyStorageMigration({
    todayKey,
    initialLogsByDate,
    initialSavedMeals,
    onLogsMigrated: foodLog.mergeMissingDays,
    onSavedMealsMigrated: savedMeals.replaceAll
  });

  // --- Add-food panel state -----------------------------------------------------
  const [selectedMeal, setSelectedMeal] = useState<MealName>("Breakfast");
  const [addMode, setAddMode] = useState<AddMode>("food");
  const [browseTab, setBrowseTab] = useState<BrowseTab>(
    initialRecentFoods.length === 0 && initialFrequentFoods.length > 0
      ? "frequent"
      : "recent"
  );
  const [editingCustomFood, setEditingCustomFood] = useState<CatalogFood | null>(null);
  const [selectedFood, setSelectedFood] = useState<CatalogFood | null>(
    initialRecentFoods[0] ?? null
  );
  const [foodGramsInput, setFoodGramsInput] = useState(
    initialRecentFoods[0] ? String(initialRecentFoods[0].baseGrams) : "100"
  );

  // --- Daily totals ---------------------------------------------------------------
  const totals = useMemo(() => createNutritionTotals(foodLog.log), [foodLog.log]);
  const activityCalories = isFuture ? 0 : (activityCaloriesByDate[selectedDateKey] ?? 0);
  const dayGoalAdjustment = isFuture ? 0 : goalAdjustment;
  const resolvedBaseCalories = resolveBaseCalories(baseCalories);
  const targetCalories = resolvedBaseCalories + activityCalories + dayGoalAdjustment;
  const diaryStatus =
    totals.calories >= targetCalories
      ? "Complete"
      : totals.calories > 0
        ? "Active"
        : "Ready";

  // --- What the food list shows ---------------------------------------------------
  const browseTabs: BrowseTab[] = [
    "recent",
    "frequent",
    ...(customFoods.length > 0 ? (["mine"] as const) : [])
  ];
  const activeBrowseTab = browseTabs.includes(browseTab) ? browseTab : "recent";
  const browseFoods = {
    recent: initialRecentFoods,
    frequent: initialFrequentFoods,
    mine: customFoods
  }[activeBrowseTab];
  const hasBrowseHistory =
    initialRecentFoods.length > 0 ||
    initialFrequentFoods.length > 0 ||
    customFoods.length > 0;
  const listFoods = search.isActive ? search.results : browseFoods;
  const listHeading = search.isActive
    ? "Search results"
    : BROWSE_TAB_LABELS[activeBrowseTab];

  // --- Actions ----------------------------------------------------------------------
  function selectFood(food: CatalogFood, grams = getDefaultServingGrams(food)) {
    setSelectedFood(food);
    setFoodGramsInput(String(grams));
  }

  function logFood(food: CatalogFood, grams: number) {
    if (!Number.isFinite(grams) || grams <= 0) {
      return;
    }

    void foodLog.addEntry(createFoodLogEntry(food, grams, selectedMeal));
  }

  function addFoodFromList(food: CatalogFood) {
    const grams =
      selectedFood?.id === food.id
        ? Number(foodGramsInput)
        : getDefaultServingGrams(food);

    selectFood(food, grams);
    logFood(food, grams);
  }

  function logSavedMeal(meal: SavedMeal, grams: number) {
    if (!Number.isFinite(grams) || grams <= 0) {
      return;
    }

    void foodLog.addEntry(createMealLogEntry(meal, grams, selectedMeal));
  }

  function handleScannedFood(food: CatalogFood) {
    setAddMode("food");
    selectFood(food);
  }

  function handleSavedCustomFood(food: CatalogFood) {
    setCustomFoods((current) => [food, ...current.filter((item) => item.id !== food.id)]);
    setEditingCustomFood(null);
    setBrowseTab("mine");
    selectFood(food);
  }

  function editCustomFood(food: CatalogFood) {
    setBrowseTab("mine");
    setEditingCustomFood(food);
  }

  function removeCustomFood(food: CatalogFood) {
    setCustomFoods((current) => current.filter((item) => item.id !== food.id));

    if (selectedFood?.id === food.id) {
      setSelectedFood(null);
    }

    if (editingCustomFood?.id === food.id) {
      setEditingCustomFood(null);
    }

    deleteCustomFood(food.id);
  }

  function saveBuiltMeal() {
    const draft = mealBuilder.takeDraft();

    if (draft) {
      void savedMeals.create(draft.name, draft.ingredients);
    }
  }

  return (
    <main className="min-h-screen bg-app-bg text-white">
      <div className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-24 pt-6 sm:px-8 lg:px-10">
        <NutritionHeader isConnected={isConnected} />

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold leading-none text-white sm:text-5xl">
                {selectedDateKey === todayKey ? "Today" : dateLabel}
              </h1>
              <p className="mt-3 text-base text-app-secondary">{dateLabel}</p>
            </div>
            <StatusBadge label={diaryStatus} />
          </div>
        </section>

        <DaySpreadWidget selectedDate={selectedDate} onSelectDate={setSelectedDate} />

        <DailySummary
          totals={totals}
          baseCalories={resolvedBaseCalories}
          activityCalories={activityCalories}
          goalAdjustment={dayGoalAdjustment}
        />

        <section className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
          <FoodDiary
            log={foodLog.log}
            dateLabel={dateLabel}
            status={diaryStatus}
            onSelectMeal={setSelectedMeal}
            onRemove={foodLog.removeEntry}
          />

          <aside className="rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card lg:sticky lg:top-6">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-app-blue text-black">
                <Search className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
                  Add food
                </h2>
                <p className="mt-1 text-sm text-app-muted">{selectedMeal}</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="grid grid-cols-2 gap-2 rounded-full bg-black/28 p-1">
                {addModes.map(({ value: mode, label }) => (
                  <button
                    key={mode}
                    className={`min-h-10 rounded-full text-sm font-bold transition ${
                      addMode === mode
                        ? "bg-app-green text-black"
                        : "text-app-secondary hover:bg-app-green/10 hover:text-app-green"
                    }`}
                    type="button"
                    onClick={() => setAddMode(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-5 sm:grid-cols-4 lg:grid-cols-2">
              {meals.map((meal) => {
                const Icon = meal.icon;
                const isSelected = selectedMeal === meal.name;

                return (
                  <button
                    key={meal.name}
                    aria-pressed={isSelected}
                    className={`flex min-h-12 items-center gap-2 rounded-full px-3 text-left text-xs font-bold transition ${
                      isSelected
                        ? "bg-app-green text-black"
                        : "bg-black/28 text-app-secondary hover:bg-app-green/10 hover:text-app-green"
                    }`}
                    type="button"
                    onClick={() => setSelectedMeal(meal.name)}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{meal.name}</span>
                  </button>
                );
              })}
            </div>

            <label className="mt-5 block border-t border-white/[0.06] pt-5">
              <span className="sr-only">Search foods</span>
              <input
                className="min-h-12 w-full rounded-full border border-white/[0.06] bg-black/28 px-5 text-sm font-semibold text-white outline-none transition placeholder:text-app-muted focus:border-app-green/60"
                onChange={(event) => search.setQuery(event.target.value)}
                placeholder="Search foods"
                type="search"
                value={search.query}
              />
            </label>

            {addMode === "food" ? (
              <>
                <BarcodeScanner onFoodFound={handleScannedFood} />
                <CustomFoodForm
                  key={editingCustomFood?.id ?? "new"}
                  editing={editingCustomFood}
                  onSaved={handleSavedCustomFood}
                  onCancelEdit={() => setEditingCustomFood(null)}
                />
                <FoodPicker
                  heading={listHeading}
                  isSearching={search.isSearching}
                  browseTabs={!search.isActive && hasBrowseHistory ? browseTabs : []}
                  activeBrowseTab={activeBrowseTab}
                  onBrowseTabChange={setBrowseTab}
                  foods={listFoods}
                  emptyMessage={
                    search.noMatches
                      ? `No foods found for “${search.trimmedQuery}”.`
                      : !search.isActive && listFoods.length === 0
                        ? "Search for a food to add. Foods you log will show up here."
                        : null
                  }
                  errorMessage={search.error}
                  selectedFood={selectedFood}
                  gramsInput={foodGramsInput}
                  onGramsInputChange={setFoodGramsInput}
                  selectedMeal={selectedMeal}
                  onSelect={(food) => selectFood(food)}
                  onAdd={addFoodFromList}
                  onAddSelected={() => {
                    if (selectedFood) {
                      logFood(selectedFood, Number(foodGramsInput));
                    }
                  }}
                  onEditCustom={editCustomFood}
                  onDeleteCustom={removeCustomFood}
                />
              </>
            ) : (
              <>
                <SavedMealPicker
                  savedMeals={savedMeals.savedMeals}
                  selectedMeal={savedMeals.selectedMeal}
                  gramsInput={savedMeals.gramsInput}
                  onGramsInputChange={savedMeals.setGramsInput}
                  onSelect={savedMeals.selectById}
                  onAdd={logSavedMeal}
                  onRemove={savedMeals.remove}
                />
                <MealBuilder
                  name={mealBuilder.name}
                  onNameChange={mealBuilder.setName}
                  ingredients={mealBuilder.ingredients}
                  onAddIngredient={mealBuilder.addIngredient}
                  onIngredientGramsChange={mealBuilder.setIngredientGrams}
                  onRemoveIngredient={mealBuilder.removeIngredient}
                  onSave={saveBuiltMeal}
                  heading={`${listHeading}${search.isSearching ? " - searching..." : ""}`}
                  foods={listFoods}
                  emptyMessage={
                    !search.isActive
                      ? "Search above to find foods for this meal."
                      : search.error ?? `No foods found for "${search.trimmedQuery}".`
                  }
                />
              </>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
