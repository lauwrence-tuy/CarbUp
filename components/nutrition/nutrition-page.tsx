"use client";

import { useMemo, useState } from "react";
import { Column, Grid, Search, Tile } from "@carbon/react";
import { PageShell, PageTitle } from "@/components/carbon/page-shell";
import { WeekBar } from "@/components/carbon/week-bar";
import { BarcodeScanner } from "./barcode-scanner";
import { CustomFoodForm } from "./custom-food-form";
import {
  addDays,
  createLocalNoonDate,
  formatDateKey
} from "./day-spread-widget";
import {
  type CatalogFood,
  createNutritionTotals,
  type MealName,
  type SavedMeal
} from "./nutrition-diary-storage";
import {
  createFoodLogEntry,
  createMealLogEntry,
  getDefaultServingGrams
} from "@/lib/nutrition-portions";
import { resolveBaseCalories } from "@/lib/nutrition-targets";
import { DailySummary } from "./daily-summary";
import { FoodDiary } from "./food-diary";
import { type BrowseTab, FoodPicker, SelectedFoodCard } from "./food-picker";
import { MealBuilder } from "./meal-builder";
import { meals } from "./meals";
import { deleteCustomFood } from "./nutrition-api";
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

  // --- Week bar (same as the dashboard): 7 days ending at weekEnd -----------
  const [weekEnd, setWeekEnd] = useState(initialToday);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekEnd, index - 6);
    const key = formatDateKey(date);
    const eaten = Math.round(
      (foodLog.logsByDate[key] ?? []).reduce((total, entry) => total + entry.calories, 0)
    );

    return {
      key,
      date,
      weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
      dayOfMonth: date.getDate(),
      eaten
    };
  });
  const isCurrentWeek = formatDateKey(weekEnd) === todayKey;

  function showWeek(offsetDays: number) {
    const nextEnd = addDays(weekEnd, offsetDays);
    // Never page past today.
    const clampedEnd = nextEnd.getTime() > initialToday.getTime() ? initialToday : nextEnd;

    setWeekEnd(clampedEnd);
    setSelectedDate(clampedEnd);
  }
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
    <PageShell isConnected={isConnected}>
      <PageTitle
        label="Nutrition"
        title={selectedDateKey === todayKey ? "Today" : dateLabel}
        description={dateLabel}
      />

      <Grid className="mt-6">
        <Column sm={4} md={8} lg={16}>
          <WeekBar
            title={isCurrentWeek ? "Last 7 days" : `${weekDays[0].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            helper="Select a day to see and log its food"
            selectedKey={selectedDateKey}
            onSelect={(key) => {
              const day = weekDays.find((item) => item.key === key);

              if (day) {
                setSelectedDate(day.date);
              }
            }}
            onPrevious={() => showWeek(-7)}
            onNext={isCurrentWeek ? undefined : () => showWeek(7)}
            days={weekDays.map((day) => ({
              key: day.key,
              weekday: day.weekday,
              date: day.dayOfMonth,
              value: day.eaten,
              valueLabel: day.eaten > 0 ? day.eaten.toLocaleString("en-US") : "–",
              ariaLabel: `${day.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}, ${day.eaten.toLocaleString("en-US")} kcal eaten`
            }))}
          />

          <DailySummary
            totals={totals}
            baseCalories={resolvedBaseCalories}
            activityCalories={activityCalories}
            goalAdjustment={dayGoalAdjustment}
          />

          {/* Phones: diary, Add food, then Selected food under the list.
              Desktop: Add food on the left; Selected food above the diary on the right. */}
          <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:grid-rows-[auto_1fr]">
            <Tile className="order-2 !p-6 lg:order-none lg:col-start-1 lg:row-span-2 lg:row-start-1">
              <div>
                <h2 className="cu-heading-02">Add food</h2>
                <p className="cu-helper mt-1">to {selectedMeal}</p>
              </div>
              <div className="mt-5">
                <div className="grid grid-cols-2 gap-2 rounded-full bg-black/30 p-1">
                  {addModes.map(({ value: mode, label }) => (
                    <button
                      key={mode}
                      className={`min-h-10 rounded-full text-sm font-bold transition ${
                        addMode === mode
                          ? "bg-cds-interactive text-black"
                          : "text-cds-text-secondary hover:bg-white/[0.08] hover:text-white"
                      }`}
                      type="button"
                      onClick={() => setAddMode(mode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[color:var(--cds-border-subtle-00)] pt-5 sm:grid-cols-4 lg:grid-cols-2">
                {meals.map((meal) => {
                  const Icon = meal.icon;
                  const isSelected = selectedMeal === meal.name;

                  return (
                    <button
                      key={meal.name}
                      aria-pressed={isSelected}
                      className={`flex min-h-12 items-center gap-2 rounded-full px-3 text-left text-xs font-bold transition ${
                        isSelected
                          ? "bg-cds-interactive text-black"
                          : "bg-black/30 text-cds-text-secondary hover:bg-white/[0.08] hover:text-white"
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

              <div className="mt-5 border-t border-[color:var(--cds-border-subtle-00)] pt-5">
                <Search
                  id="food-search"
                  labelText="Search foods"
                  placeholder="Search foods"
                  size="lg"
                  value={search.query}
                  onChange={(event) =>
                    search.setQuery((event.target as HTMLInputElement).value)
                  }
                  closeButtonLabelText="Clear search"
                />
              </div>

              {addMode === "food" ? (
                <>
                  {/* One row of buttons; an opened panel drops onto its own line below. */}
                  <div className="mt-3 flex flex-wrap items-start gap-2">
                    <CustomFoodForm
                      key={editingCustomFood?.id ?? "new"}
                      editing={editingCustomFood}
                      onSaved={handleSavedCustomFood}
                      onCancelEdit={() => setEditingCustomFood(null)}
                    />
                    <BarcodeScanner onFoodFound={handleScannedFood} />
                  </div>
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
                    selectedMeal={selectedMeal}
                    onSelect={(food) => selectFood(food)}
                    onAdd={addFoodFromList}
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
            </Tile>

            {addMode === "food" ? (
              <div className="order-3 lg:order-none lg:col-start-2 lg:row-start-1">
                <SelectedFoodCard
                  food={selectedFood}
                  gramsInput={foodGramsInput}
                  onGramsInputChange={setFoodGramsInput}
                  selectedMeal={selectedMeal}
                  onAdd={() => {
                    if (selectedFood) {
                      logFood(selectedFood, Number(foodGramsInput));
                    }
                  }}
                />
              </div>
            ) : null}

            <div
              className={`order-1 lg:order-none lg:col-start-2 ${
                addMode === "food" ? "lg:row-start-2" : "lg:row-start-1"
              }`}
            >
              <FoodDiary
                log={foodLog.log}
                dateLabel={dateLabel}
                status={diaryStatus}
                onSelectMeal={setSelectedMeal}
                onRemove={foodLog.removeEntry}
              />
            </div>
          </div>
        </Column>
      </Grid>
    </PageShell>
  );
}
