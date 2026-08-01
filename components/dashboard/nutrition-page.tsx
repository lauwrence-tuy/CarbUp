"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Apple,
  ArrowRight,
  Coffee,
  Cookie,
  Flame,
  Plus,
  Search,
  Settings,
  Soup,
  Trash2,
  Utensils
} from "lucide-react";
import { CountUp } from "./count-up";
import {
  createLocalNoonDate,
  DaySpreadWidget,
  formatDateKey
} from "./day-spread-widget";
import { usdaCommonFoods } from "./food-calorie-library";
import {
  createNutritionTotals,
  dailyLogsStorageKey,
  type Food,
  type FoodLogEntry,
  legacyLogStorageKey,
  type MealName
} from "./nutrition-diary-storage";
import { ProgressBar } from "./progress-bar";
import { StatusBadge } from "./status-badge";

type NutritionPageProps = {
  baseCalories: number;
  activityCaloriesByDate: Record<string, number>;
  initialLogsByDate: Record<string, FoodLogEntry[]>;
  initialSavedMeals: SavedMeal[];
  goalAdjustment: number;
  isConnected: boolean;
};

const meals: Array<{
  name: MealName;
  icon: LucideIcon;
  accent: string;
}> = [
  { name: "Breakfast", icon: Coffee, accent: "bg-app-blue text-black" },
  { name: "Lunch", icon: Soup, accent: "bg-app-green text-black" },
  { name: "Dinner", icon: Utensils, accent: "bg-app-orange text-white" },
  { name: "Snacks", icon: Cookie, accent: "bg-app-purple text-white" }
];

const foodLibrary: Food[] = [
  {
    id: "banana",
    name: "Banana",
    brand: "Fresh fruit",
    serving: "1 medium",
    baseGrams: 118,
    calories: 105,
    protein: 1,
    carbs: 27,
    fat: 0
  },
  {
    id: "oats",
    name: "Oatmeal with berries",
    brand: "Homemade",
    serving: "1 bowl",
    baseGrams: 320,
    calories: 318,
    protein: 11,
    carbs: 57,
    fat: 6
  },
  {
    id: "eggs-toast",
    name: "Eggs and sourdough toast",
    brand: "Homemade",
    serving: "2 eggs, 1 slice",
    baseGrams: 150,
    calories: 325,
    protein: 20,
    carbs: 28,
    fat: 15
  },
  {
    id: "chicken-rice",
    name: "Chicken rice bowl",
    brand: "Meal prep",
    serving: "1 bowl",
    baseGrams: 450,
    calories: 612,
    protein: 48,
    carbs: 72,
    fat: 14
  },
  {
    id: "burrito",
    name: "Steak burrito",
    brand: "Fast casual",
    serving: "1 burrito",
    baseGrams: 450,
    calories: 785,
    protein: 42,
    carbs: 92,
    fat: 29
  },
  {
    id: "yogurt",
    name: "Greek yogurt and granola",
    brand: "Recovery snack",
    serving: "1 cup",
    baseGrams: 245,
    calories: 285,
    protein: 24,
    carbs: 34,
    fat: 7
  },
  {
    id: "shake",
    name: "Protein shake",
    brand: "Whey blend",
    serving: "1 bottle",
    baseGrams: 330,
    calories: 210,
    protein: 32,
    carbs: 12,
    fat: 4
  },
  {
    id: "salmon",
    name: "Salmon, potatoes, greens",
    brand: "Homemade",
    serving: "1 plate",
    baseGrams: 430,
    calories: 690,
    protein: 46,
    carbs: 64,
    fat: 27
  },
  {
    id: "rice",
    name: "White rice",
    brand: "Cooked",
    serving: "1 cup",
    baseGrams: 158,
    calories: 205,
    protein: 4,
    carbs: 45,
    fat: 0
  },
  {
    id: "bar",
    name: "Carb bar",
    brand: "Ride fuel",
    serving: "1 bar",
    baseGrams: 60,
    calories: 240,
    protein: 6,
    carbs: 43,
    fat: 5
  },
  ...usdaCommonFoods
];

type AddMode = "food" | "meal";

export type SavedMealIngredient = {
  food: Food;
  grams: number;
};

export type SavedMeal = {
  id: string;
  name: string;
  ingredients: SavedMealIngredient[];
};

const localStorageMigrationKey = "carbup-local-food-logs-migrated-to-db";
const legacySavedMealsStorageKey = "carbup-saved-meals";
const savedMealsMigrationKey = "carbup-local-saved-meals-migrated-to-db";

function createLogId() {
  return `food-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getFoodPortion(food: Food, grams: number) {
  const safeGrams = Math.max(0, Math.round(grams));
  const ratio = food.baseGrams > 0 ? safeGrams / food.baseGrams : 0;

  return {
    grams: safeGrams,
    serving: `${safeGrams} g`,
    calories: Math.round(food.calories * ratio),
    protein: Math.round(food.protein * ratio),
    carbs: Math.round(food.carbs * ratio),
    fat: Math.round(food.fat * ratio)
  };
}

function createFoodLogEntry(food: Food, grams: number, meal: MealName): FoodLogEntry {
  const portion = getFoodPortion(food, grams);

  return {
    ...food,
    ...portion,
    logId: createLogId(),
    meal,
    source: "food"
  };
}

function getMealTotals(ingredients: SavedMealIngredient[]) {
  return ingredients.reduce(
    (totals, ingredient) => {
      const portion = getFoodPortion(ingredient.food, ingredient.grams);

      return {
        grams: totals.grams + portion.grams,
        calories: totals.calories + portion.calories,
        protein: totals.protein + portion.protein,
        carbs: totals.carbs + portion.carbs,
        fat: totals.fat + portion.fat
      };
    },
    { grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

function getScaledMealTotals(savedMeal: SavedMeal, grams: number) {
  const defaultTotals = getMealTotals(savedMeal.ingredients);
  const safeGrams = Math.max(0, Math.round(grams));
  const ratio = defaultTotals.grams > 0 ? safeGrams / defaultTotals.grams : 0;

  return {
    grams: safeGrams,
    calories: Math.round(defaultTotals.calories * ratio),
    protein: Math.round(defaultTotals.protein * ratio),
    carbs: Math.round(defaultTotals.carbs * ratio),
    fat: Math.round(defaultTotals.fat * ratio)
  };
}

function createMealLogEntry(
  savedMeal: SavedMeal,
  grams: number,
  meal: MealName
): FoodLogEntry {
  const defaultTotals = getMealTotals(savedMeal.ingredients);
  const safeGrams = Math.max(0, Math.round(grams));
  const ratio = defaultTotals.grams > 0 ? safeGrams / defaultTotals.grams : 0;
  const items = savedMeal.ingredients.map((ingredient) =>
    createFoodLogEntry(ingredient.food, ingredient.grams * ratio, meal)
  );
  const totals = createNutritionTotals(items);

  return {
    id: savedMeal.id,
    name: savedMeal.name,
    brand: "Saved meal",
    serving: `${safeGrams} g`,
    baseGrams: defaultTotals.grams,
    grams: safeGrams,
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
    items,
    logId: createLogId(),
    meal,
    source: "meal"
  };
}

function getMacroTargets(targetCalories: number) {
  return {
    protein: Math.round((Math.max(targetCalories, 0) * 0.18) / 4),
    carbs: Math.round((Math.max(targetCalories, 0) * 0.52) / 4),
    fat: Math.round((Math.max(targetCalories, 0) * 0.3) / 9)
  };
}

function readLocalStorageLogsForMigration(todayKey: string) {
  const savedLogs = window.localStorage.getItem(dailyLogsStorageKey);

  if (savedLogs) {
    try {
      return JSON.parse(savedLogs) as Record<string, FoodLogEntry[]>;
    } catch {
      window.localStorage.removeItem(dailyLogsStorageKey);
    }
  }

  const legacyLog = window.localStorage.getItem(legacyLogStorageKey);

  if (!legacyLog) {
    return {};
  }

  try {
    return {
      [todayKey]: JSON.parse(legacyLog) as FoodLogEntry[]
    };
  } catch {
    window.localStorage.removeItem(legacyLogStorageKey);
    return {};
  }
}

function normalizeMigratedLogEntry(entry: FoodLogEntry): FoodLogEntry {
  const grams = Number(entry.grams ?? entry.baseGrams) || 100;

  return {
    ...entry,
    id: entry.id ?? entry.logId,
    brand: entry.brand ?? "Migrated food",
    serving: entry.serving ?? `${Math.round(grams)} g`,
    baseGrams: Number(entry.baseGrams) || grams,
    grams,
    calories: Math.round(Number(entry.calories) || 0),
    protein: Math.round(Number(entry.protein) || 0),
    carbs: Math.round(Number(entry.carbs) || 0),
    fat: Math.round(Number(entry.fat) || 0),
    logId: createLogId(),
    source: entry.source ?? "food"
  };
}

export function NutritionPage({
  baseCalories,
  activityCaloriesByDate,
  initialLogsByDate,
  initialSavedMeals,
  goalAdjustment,
  isConnected
}: NutritionPageProps) {
  const fallbackBaseCalories = baseCalories > 0 ? baseCalories : 2400;
  const initialToday = useMemo(() => createLocalNoonDate(), []);
  const todayKey = useMemo(() => formatDateKey(initialToday), [initialToday]);
  const [selectedDate, setSelectedDate] = useState(initialToday);
  const [selectedMeal, setSelectedMeal] = useState<MealName>("Breakfast");
  const [addMode, setAddMode] = useState<AddMode>("food");
  const [query, setQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<Food>(foodLibrary[0]);
  const [selectedFoodGrams, setSelectedFoodGrams] = useState(
    String(foodLibrary[0].baseGrams)
  );
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>(initialSavedMeals);
  const [selectedSavedMealId, setSelectedSavedMealId] = useState(
    initialSavedMeals[0]?.id ?? ""
  );
  const [selectedMealGrams, setSelectedMealGrams] = useState(
    initialSavedMeals[0]
      ? String(getMealTotals(initialSavedMeals[0].ingredients).grams)
      : ""
  );
  const [mealBuilderName, setMealBuilderName] = useState("");
  const [mealBuilderIngredients, setMealBuilderIngredients] = useState<
    SavedMealIngredient[]
  >([]);
  const [allLogs, setAllLogs] = useState<Record<string, FoodLogEntry[]>>(
    initialLogsByDate
  );

  useEffect(() => {
    if (window.localStorage.getItem(localStorageMigrationKey) === "true") {
      return;
    }

    const logsByDate = readLocalStorageLogsForMigration(todayKey);
    const entriesToMigrate = Object.entries(logsByDate).flatMap(
      ([dateKey, entries]) =>
        (initialLogsByDate[dateKey]?.length ?? 0) > 0
          ? []
          : entries.map((entry) => ({ dateKey, entry }))
    );

    if (entriesToMigrate.length === 0) {
      window.localStorage.setItem(localStorageMigrationKey, "true");
      return;
    }

    let cancelled = false;

    async function migrateLogs() {
      const migratedByDate: Record<string, FoodLogEntry[]> = {};

      for (const { dateKey, entry } of entriesToMigrate) {
        const migratedEntry = normalizeMigratedLogEntry(entry);

        try {
          const saved = await persistFoodLog(migratedEntry, dateKey);
          migratedByDate[dateKey] = [
            ...(migratedByDate[dateKey] ?? []),
            { ...migratedEntry, logId: saved.id }
          ];
        } catch {
          return;
        }
      }

      if (cancelled) {
        return;
      }

      setAllLogs((current) => {
        const next = { ...current };

        Object.entries(migratedByDate).forEach(([dateKey, entries]) => {
          const existing = next[dateKey] ?? [];
          next[dateKey] =
            existing.length > 0 ? existing : [...entries];
        });

        return next;
      });
      window.localStorage.setItem(localStorageMigrationKey, "true");
    }

    void migrateLogs();

    return () => {
      cancelled = true;
    };
  }, [initialLogsByDate, todayKey]);

  useEffect(() => {
    if (
      initialSavedMeals.length > 0 ||
      window.localStorage.getItem(savedMealsMigrationKey) === "true"
    ) {
      return;
    }

    const savedMealData = window.localStorage.getItem(legacySavedMealsStorageKey);

    if (!savedMealData) {
      window.localStorage.setItem(savedMealsMigrationKey, "true");
      return;
    }

    const savedMealJson = savedMealData;
    let cancelled = false;

    async function migrateSavedMeals() {
      try {
        const parsedMeals = JSON.parse(savedMealJson) as SavedMeal[];
        const migratedMeals: SavedMeal[] = [];

        for (const meal of parsedMeals) {
          const response = await fetch("/api/nutrition/saved-meals", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              name: meal.name,
              ingredients: meal.ingredients
            })
          });

          if (!response.ok) {
            throw new Error("Saved meal migration failed");
          }

          const persisted = (await response.json()) as { id: string };
          migratedMeals.push({ ...meal, id: persisted.id });
        }

        if (cancelled) {
          return;
        }

        setSavedMeals(migratedMeals);
        setSelectedSavedMealId(migratedMeals[0]?.id ?? "");
        setSelectedMealGrams(
          migratedMeals[0]
            ? String(getMealTotals(migratedMeals[0].ingredients).grams)
            : ""
        );
        window.localStorage.setItem(savedMealsMigrationKey, "true");
      } catch {
        window.localStorage.removeItem(legacySavedMealsStorageKey);
      }
    }

    void migrateSavedMeals();

    return () => {
      cancelled = true;
    };
  }, [initialSavedMeals]);

  const selectedDateKey = formatDateKey(selectedDate);
  const isSelectedToday = selectedDateKey === todayKey;
  const isSelectedFuture = selectedDate.getTime() > initialToday.getTime();
  const selectedActivityCalories = isSelectedFuture
    ? 0
    : (activityCaloriesByDate[selectedDateKey] ?? 0);
  const selectedGoalAdjustment = isSelectedFuture ? 0 : goalAdjustment;
  const targetCalories =
    fallbackBaseCalories + selectedActivityCalories + selectedGoalAdjustment;
  const log = useMemo(
    () => allLogs[selectedDateKey] ?? [],
    [allLogs, selectedDateKey]
  );
  const selectedDateLabel = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric"
  });
  const totals = useMemo(() => createNutritionTotals(log), [log]);
  const macroTargets = getMacroTargets(targetCalories);
  const remainingCalories = Math.max(targetCalories - totals.calories, 0);
  const overTargetCalories = Math.max(totals.calories - targetCalories, 0);
  const calorieProgress =
    targetCalories > 0 ? (totals.calories / targetCalories) * 100 : 0;
  const diaryStatus =
    remainingCalories === 0 ? "Complete" : totals.calories > 0 ? "Active" : "Ready";
  const filteredFoods = foodLibrary.filter((food) => {
    const searchable = `${food.name} ${food.brand} ${food.serving}`.toLowerCase();

    return searchable.includes(query.trim().toLowerCase());
  });
  const selectedFoodPreview = getFoodPortion(
    selectedFood,
    Number(selectedFoodGrams) || 0
  );
  const selectedSavedMeal = savedMeals.find(
    (meal) => meal.id === selectedSavedMealId
  );
  const selectedSavedMealDefaultTotals = selectedSavedMeal
    ? getMealTotals(selectedSavedMeal.ingredients)
    : null;
  const selectedSavedMealPreview =
    selectedSavedMeal && selectedSavedMealDefaultTotals
      ? getScaledMealTotals(
          selectedSavedMeal,
          Number(selectedMealGrams) || selectedSavedMealDefaultTotals.grams
        )
      : null;
  const mealBuilderTotals = getMealTotals(mealBuilderIngredients);

  function updateSelectedLog(
    updater: (currentLog: FoodLogEntry[]) => FoodLogEntry[]
  ) {
    setAllLogs((current) => ({
      ...current,
      [selectedDateKey]: updater(current[selectedDateKey] ?? [])
    }));
  }

  async function persistFoodLog(entry: FoodLogEntry, dateKey: string) {
    const response = await fetch("/api/nutrition/logs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dateKey,
        entry
      })
    });

    if (!response.ok) {
      throw new Error("Food log save failed");
    }

    return (await response.json()) as { id: string };
  }

  async function addLogEntry(entry: FoodLogEntry) {
    const temporaryLogId = entry.logId;

    updateSelectedLog((current) => [...current, entry]);

    try {
      const saved = await persistFoodLog(entry, selectedDateKey);

      updateSelectedLog((current) =>
        current.map((food) =>
          food.logId === temporaryLogId ? { ...food, logId: saved.id } : food
        )
      );
    } catch {
      updateSelectedLog((current) =>
        current.filter((food) => food.logId !== temporaryLogId)
      );
    }
  }

  function addFood(
    food: Food,
    meal = selectedMeal,
    grams = food.baseGrams
  ) {
    const safeGrams = Number(grams);

    if (!Number.isFinite(safeGrams) || safeGrams <= 0) {
      return;
    }

    void addLogEntry(createFoodLogEntry(food, safeGrams, meal));
  }

  function selectFood(food: Food) {
    setSelectedFood(food);
    setSelectedFoodGrams(String(food.baseGrams));
  }

  function addSelectedFood() {
    addFood(selectedFood, selectedMeal, Number(selectedFoodGrams));
  }

  function addFoodFromLibrary(food: Food) {
    const grams = selectedFood.id === food.id ? Number(selectedFoodGrams) : food.baseGrams;

    setSelectedFood(food);
    setSelectedFoodGrams(String(grams));
    addFood(food, selectedMeal, grams);
  }

  function addFoodToMealBuilder(food: Food) {
    setMealBuilderIngredients((current) => [
      ...current,
      {
        food,
        grams: food.baseGrams
      }
    ]);
    setAddMode("meal");
  }

  function updateMealBuilderIngredient(index: number, grams: number) {
    setMealBuilderIngredients((current) =>
      current.map((ingredient, ingredientIndex) =>
        ingredientIndex === index
          ? { ...ingredient, grams: Math.max(0, grams) }
          : ingredient
      )
    );
  }

  function removeMealBuilderIngredient(index: number) {
    setMealBuilderIngredients((current) =>
      current.filter((_, ingredientIndex) => ingredientIndex !== index)
    );
  }

  async function saveMealBuilder() {
    const name = mealBuilderName.trim();
    const ingredients = mealBuilderIngredients.filter(
      (ingredient) => ingredient.grams > 0
    );

    if (!name || ingredients.length === 0) {
      return;
    }

    const temporaryId = `meal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const savedMeal: SavedMeal = {
      id: temporaryId,
      name,
      ingredients
    };

    setSavedMeals((current) => [savedMeal, ...current]);
    setSelectedSavedMealId(savedMeal.id);
    setSelectedMealGrams(String(getMealTotals(ingredients).grams));
    setMealBuilderName("");
    setMealBuilderIngredients([]);

    try {
      const response = await fetch("/api/nutrition/saved-meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          ingredients
        })
      });

      if (!response.ok) {
        throw new Error("Meal save failed");
      }

      const persisted = (await response.json()) as { id: string };

      setSavedMeals((current) =>
        current.map((meal) =>
          meal.id === temporaryId ? { ...meal, id: persisted.id } : meal
        )
      );
      setSelectedSavedMealId(persisted.id);
    } catch {
      setSavedMeals((current) =>
        current.filter((meal) => meal.id !== temporaryId)
      );
      setSelectedSavedMealId(savedMeals[0]?.id ?? "");
    }
  }

  function addSavedMeal(savedMeal: SavedMeal, grams: number) {
    if (!Number.isFinite(grams) || grams <= 0) {
      return;
    }

    void addLogEntry(createMealLogEntry(savedMeal, grams, selectedMeal));
  }

  function removeSavedMeal(mealId: string) {
    setSavedMeals((current) => {
      const nextMeals = current.filter((meal) => meal.id !== mealId);
      const nextSelectedId =
        selectedSavedMealId === mealId
          ? nextMeals[0]?.id ?? ""
          : selectedSavedMealId;
      const nextSelectedMeal = nextMeals.find(
        (meal) => meal.id === nextSelectedId
      );

      setSelectedSavedMealId(nextSelectedId);
      setSelectedMealGrams(
        nextSelectedMeal
          ? String(getMealTotals(nextSelectedMeal.ingredients).grams)
          : ""
      );

      return nextMeals;
    });

    void fetch("/api/nutrition/saved-meals", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ mealId })
    });
  }

  function removeFood(logId: string) {
    updateSelectedLog((current) =>
      current.filter((food) => food.logId !== logId)
    );

    void fetch("/api/nutrition/logs", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ logId })
    });
  }

  return (
    <main className="min-h-screen bg-app-bg text-white">
      <div className="mx-auto min-h-screen w-full max-w-7xl px-5 pb-24 pt-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-6 rounded-[28px] border border-white/[0.04] bg-app-card/72 px-5 py-4 shadow-card backdrop-blur lg:px-6">
          <Link
            href={isConnected ? "/dashboard" : "/"}
            className="flex items-center gap-3"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-app-card text-app-green shadow-card">
              <Flame className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-bold tracking-[-0.04em] sm:text-xl">
                Carb
                <span className="text-app-green">Up</span>
              </p>
            </div>
          </Link>

          <nav
            className="hidden items-center gap-2 rounded-full bg-black/35 p-1 lg:flex"
            aria-label="Nutrition navigation"
          >
            {[
                {
                  label: "Dashboard",
                  href: isConnected ? "/dashboard" : "/",
                  active: false
                },
                {
                  label: "Nutrition",
                  href: isConnected ? "/nutrition" : "/",
                  active: true
                },
                {
                  label: "Workouts",
                  href: isConnected ? "/workouts" : "/",
                  active: false
                },
                {
                  label: "Trends",
                  href: isConnected ? "/trends" : "/",
                  active: false
                }
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  item.active
                    ? "bg-white text-black"
                    : "text-app-secondary hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {!isConnected ? (
              <Link
                href="/api/strava/auth"
                className="hidden min-h-11 items-center gap-2 rounded-full bg-app-green px-5 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5 sm:inline-flex"
              >
                Connect Strava
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
            <Link
              href="/settings"
              className="flex size-12 items-center justify-center rounded-full bg-app-card text-app-blue transition hover:bg-app-hover"
              aria-label="Settings"
            >
              <Settings className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold leading-none text-white sm:text-5xl">
                {isSelectedToday ? "Today" : selectedDateLabel}
              </h1>
              <p className="mt-3 text-base text-app-secondary">
                {selectedDateLabel}
              </p>
            </div>
            <StatusBadge label={diaryStatus} />
          </div>
        </section>

        <DaySpreadWidget
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        <section className="mt-5 rounded-[28px] border border-white/[0.04] bg-app-card p-5 shadow-card">
          <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.1fr)]">
            <div className="flex items-end justify-between gap-4 rounded-[24px] bg-black/24 p-5">
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-app-secondary">
                  Remaining
                </p>
                <div className="mt-3 flex items-end gap-2">
                  <CountUp
                    value={remainingCalories}
                    className="text-5xl font-bold leading-none text-white"
                  />
                  <span className="pb-1 text-base font-semibold text-app-muted">
                    kcal
                  </span>
                </div>
              </div>
              {overTargetCalories > 0 ? (
                <span className="rounded-full bg-app-red/15 px-3 py-1 text-xs font-bold text-app-red">
                  {overTargetCalories.toLocaleString()} over
                </span>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryStat
                label="Eaten"
                value={totals.calories}
                detail="kcal"
              />
              <SummaryStat
                label="Target"
                value={targetCalories}
                detail={`${fallbackBaseCalories.toLocaleString()} base ${
                  selectedGoalAdjustment === 0
                    ? ""
                    : `${selectedGoalAdjustment > 0 ? "+" : "-"} ${Math.abs(
                        selectedGoalAdjustment
                      ).toLocaleString()} goal `
                }+ ${selectedActivityCalories.toLocaleString()} activity`}
              />
              <SummaryStat
                label="Activity"
                prefix="+"
                value={selectedActivityCalories}
                detail="kcal"
              />
            </div>
          </div>

          <ProgressBar
            value={calorieProgress}
            color={overTargetCalories > 0 ? "red" : "green"}
            height="base"
            trackClassName="mt-5"
          />

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <MacroProgress
              label="Carbs"
              eaten={totals.carbs}
              target={macroTargets.carbs}
              color="yellow"
            />
            <MacroProgress
              label="Protein"
              eaten={totals.protein}
              target={macroTargets.protein}
              color="blue"
            />
            <MacroProgress
              label="Fat"
              eaten={totals.fat}
              target={macroTargets.fat}
              color="purple"
            />
          </div>
        </section>

        <section className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
          <section className="animate-rise-in rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-app-green text-black">
                  <Utensils className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
                    Food diary
                  </p>
                  <p className="mt-1 text-sm text-app-muted">
                    {selectedDateLabel}
                  </p>
                </div>
              </div>
              <StatusBadge label={diaryStatus} />
            </div>

            <div className="mt-6 divide-y divide-white/[0.06]">
              {meals.map((meal) => {
                const foods = log.filter((food) => food.meal === meal.name);
                const mealCalories = foods.reduce(
                  (total, food) => total + food.calories,
                  0
                );
                const Icon = meal.icon;

                return (
                  <section key={meal.name} className="py-5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${meal.accent}`}
                        >
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <h2 className="text-sm font-bold text-white">
                            {meal.name}
                          </h2>
                          <p className="mt-1 text-xs font-semibold text-app-muted">
                            {mealCalories.toLocaleString()} kcal
                          </p>
                        </div>
                      </div>
                      <button
                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-app-green"
                        type="button"
                        aria-label={`Add food to ${meal.name}`}
                        onClick={() => setSelectedMeal(meal.name)}
                      >
                        <Plus className="size-5" aria-hidden="true" />
                      </button>
                    </div>

                    {foods.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {foods.map((food) => (
                          <div
                            key={food.logId}
                            className="flex items-center justify-between gap-4 rounded-[18px] bg-black/24 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-white">
                                {food.name}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-app-muted">
                                {food.grams
                                  ? `${Math.round(food.grams)} g`
                                  : food.serving}{" "}
                                - P {food.protein}g / C{" "}
                                {food.carbs}g / F {food.fat}g
                              </p>
                              {food.source === "meal" && food.items?.length ? (
                                <p className="mt-1 text-xs font-semibold text-app-secondary">
                                  {food.items
                                    .map(
                                      (item) =>
                                        `${item.name} ${
                                          item.grams
                                            ? `${Math.round(item.grams)}g`
                                            : ""
                                        }`
                                    )
                                    .join(" + ")}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <span className="text-sm font-bold text-app-green">
                                {food.calories} kcal
                              </span>
                              <button
                                className="flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-app-muted transition hover:bg-app-red/20 hover:text-app-red"
                                type="button"
                                aria-label={`Remove ${food.name}`}
                                onClick={() => removeFood(food.logId)}
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </section>

          <aside className="rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card lg:sticky lg:top-6">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-app-blue text-black">
                <Search className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
                  Add food
                </h2>
                <p className="mt-1 text-sm text-app-muted">
                  {selectedMeal}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="grid grid-cols-2 gap-2 rounded-full bg-black/28 p-1">
                {[
                  { label: "Food", value: "food" as const },
                  { label: "Meal", value: "meal" as const }
                ].map((option) => (
                  <button
                    key={option.value}
                    className={`min-h-10 rounded-full text-sm font-bold transition ${
                      addMode === option.value
                        ? "bg-app-green text-black"
                        : "text-app-secondary hover:bg-app-green/10 hover:text-app-green"
                    }`}
                    type="button"
                    onClick={() => setAddMode(option.value)}
                  >
                    {option.label}
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
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search foods"
                type="search"
                value={query}
              />
            </label>

            {addMode === "food" ? (
              <>
                <div className="mt-4 max-h-[260px] space-y-2 overflow-y-auto pr-1">
                  {filteredFoods.map((food) => {
                    const selected = selectedFood.id === food.id;

                    return (
                      <div
                        key={food.id}
                        className={`flex items-center justify-between gap-4 rounded-[20px] p-4 transition ${
                          selected
                            ? "bg-app-green text-black"
                            : "bg-black/24 text-white"
                        }`}
                      >
                        <button
                          className="min-w-0 flex-1 text-left"
                          type="button"
                          onClick={() => selectFood(food)}
                        >
                          <p className="truncate text-sm font-bold">
                            {food.name}
                          </p>
                          <p
                            className={`mt-1 text-xs font-semibold ${
                              selected ? "text-black/65" : "text-app-muted"
                            }`}
                          >
                            {food.brand} - {food.serving}
                          </p>
                          <p
                            className={`mt-2 text-xs font-semibold ${
                              selected ? "text-black/70" : "text-app-secondary"
                            }`}
                          >
                            {food.calories} kcal - P {food.protein}g / C{" "}
                            {food.carbs}g / F {food.fat}g
                          </p>
                        </button>
                        <button
                          className={`flex size-10 shrink-0 items-center justify-center rounded-full transition hover:-translate-y-0.5 ${
                            selected
                              ? "bg-black text-white"
                              : "bg-white text-black"
                          }`}
                          type="button"
                          aria-label={`Add ${food.name} to ${selectedMeal}`}
                          onClick={() => addFoodFromLibrary(food)}
                        >
                          <Plus className="size-5" aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <section className="mt-5 border-t border-white/[0.06] pt-5">
                  <div className="rounded-[24px] bg-black/24 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {selectedFood.name}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-app-muted">
                          {selectedFood.calories} kcal per{" "}
                          {selectedFood.baseGrams}g
                        </p>
                      </div>
                      <MacroInput
                        label="Grams"
                        value={selectedFoodGrams}
                        onChange={setSelectedFoodGrams}
                      />
                    </div>

                    <NutritionPreview
                      calories={selectedFoodPreview.calories}
                      protein={selectedFoodPreview.protein}
                      carbs={selectedFoodPreview.carbs}
                      fat={selectedFoodPreview.fat}
                    />

                    <button
                      className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-app-green px-5 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5"
                      type="button"
                      onClick={addSelectedFood}
                    >
                      <Plus className="size-5" aria-hidden="true" />
                      Add to {selectedMeal}
                    </button>
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className="mt-5 border-t border-white/[0.06] pt-5">
                  <div className="rounded-[24px] bg-black/24 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 items-center justify-center rounded-2xl bg-app-green text-black">
                        <Apple className="size-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="text-sm font-bold text-white">
                          Saved meal
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-app-muted">
                          Add a full dish by grams
                        </p>
                      </div>
                    </div>

                    {savedMeals.length > 0 && selectedSavedMeal ? (
                      <div className="mt-4 space-y-3">
                        <label>
                          <span className="sr-only">Saved meal</span>
                          <select
                            className="min-h-11 w-full rounded-full border border-white/[0.06] bg-black/28 px-4 text-sm font-semibold text-white outline-none focus:border-app-green/60"
                            value={selectedSavedMealId}
                            onChange={(event) => {
                              const nextMeal = savedMeals.find(
                                (meal) => meal.id === event.target.value
                              );

                              setSelectedSavedMealId(event.target.value);
                              setSelectedMealGrams(
                                nextMeal
                                  ? String(getMealTotals(nextMeal.ingredients).grams)
                                  : ""
                              );
                            }}
                          >
                            {savedMeals.map((meal) => (
                              <option key={meal.id} value={meal.id}>
                                {meal.name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <MacroInput
                          label="Meal grams"
                          value={selectedMealGrams}
                          onChange={setSelectedMealGrams}
                        />

                        {selectedSavedMealPreview ? (
                          <NutritionPreview
                            calories={selectedSavedMealPreview.calories}
                            protein={selectedSavedMealPreview.protein}
                            carbs={selectedSavedMealPreview.carbs}
                            fat={selectedSavedMealPreview.fat}
                          />
                        ) : null}

                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <button
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-app-green px-4 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5"
                            type="button"
                            onClick={() =>
                              addSavedMeal(
                                selectedSavedMeal,
                                Number(selectedMealGrams) ||
                                  selectedSavedMealDefaultTotals?.grams ||
                                  0
                              )
                            }
                          >
                            <Plus className="size-4" aria-hidden="true" />
                            Add meal
                          </button>
                          <button
                            className="flex size-11 items-center justify-center rounded-full bg-white/[0.06] text-app-muted transition hover:bg-app-red/20 hover:text-app-red"
                            type="button"
                            aria-label={`Remove ${selectedSavedMeal.name}`}
                            onClick={() => removeSavedMeal(selectedSavedMeal.id)}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 rounded-[20px] bg-app-card px-4 py-4 text-sm text-app-muted">
                        No saved meals yet.
                      </p>
                    )}
                  </div>
                </section>

                <section className="mt-5 border-t border-white/[0.06] pt-5">
                  <h2 className="text-sm font-bold text-white">
                    Build meal
                  </h2>
                  <input
                    className="mt-3 min-h-11 w-full rounded-full border border-white/[0.06] bg-black/28 px-4 text-sm font-semibold text-white outline-none placeholder:text-app-muted focus:border-app-green/60"
                    onChange={(event) => setMealBuilderName(event.target.value)}
                    placeholder="Meal name"
                    type="text"
                    value={mealBuilderName}
                  />

                  <div className="mt-4 max-h-[190px] space-y-2 overflow-y-auto pr-1">
                    {filteredFoods.map((food) => (
                      <div
                        key={food.id}
                        className="flex items-center justify-between gap-3 rounded-[18px] bg-black/24 p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">
                            {food.name}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-app-muted">
                            {food.calories} kcal / {food.baseGrams}g
                          </p>
                        </div>
                        <button
                          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-app-green"
                          type="button"
                          aria-label={`Add ${food.name} to meal`}
                          onClick={() => addFoodToMealBuilder(food)}
                        >
                          <Plus className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {mealBuilderIngredients.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {mealBuilderIngredients.map((ingredient, index) => (
                        <div
                          key={`${ingredient.food.id}-${index}`}
                          className="grid grid-cols-[minmax(0,1fr)_96px_auto] items-center gap-2 rounded-[18px] bg-black/24 p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-white">
                              {ingredient.food.name}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-app-muted">
                              {getFoodPortion(
                                ingredient.food,
                                ingredient.grams
                              ).calories.toLocaleString()}{" "}
                              kcal
                            </p>
                          </div>
                          <MacroInput
                            label="g"
                            value={String(ingredient.grams)}
                            onChange={(value) =>
                              updateMealBuilderIngredient(index, Number(value))
                            }
                          />
                          <button
                            className="flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-app-muted transition hover:bg-app-red/20 hover:text-app-red"
                            type="button"
                            aria-label={`Remove ${ingredient.food.name}`}
                            onClick={() => removeMealBuilderIngredient(index)}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <NutritionPreview
                    calories={mealBuilderTotals.calories}
                    protein={mealBuilderTotals.protein}
                    carbs={mealBuilderTotals.carbs}
                    fat={mealBuilderTotals.fat}
                  />

                  <button
                    className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-app-green px-5 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5"
                    type="button"
                    onClick={saveMealBuilder}
                  >
                    <Plus className="size-5" aria-hidden="true" />
                    Save meal
                  </button>
                </section>
              </>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

function SummaryStat({
  label,
  prefix = "",
  value,
  detail
}: {
  label: string;
  prefix?: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] bg-black/24 p-5">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-app-secondary">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold leading-none text-white">
        {prefix}
        <CountUp value={value} />
      </p>
      <p className="mt-2 text-xs font-semibold leading-5 text-app-muted">
        {detail.trim()}
      </p>
    </div>
  );
}

function NutritionPreview({
  calories,
  protein,
  carbs,
  fat
}: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  return (
    <div className="mt-4 grid grid-cols-4 gap-2 rounded-[20px] bg-app-card p-3">
      <PreviewStat label="Kcal" value={calories.toLocaleString()} />
      <PreviewStat label="C" value={`${carbs}g`} />
      <PreviewStat label="P" value={`${protein}g`} />
      <PreviewStat label="F" value={`${fat}g`} />
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-app-secondary">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function MacroInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <input
        className="min-h-11 w-full rounded-full border border-white/[0.06] bg-black/28 px-4 text-sm font-semibold text-white outline-none placeholder:text-app-muted focus:border-app-green/60"
        inputMode="numeric"
        min={0}
        onChange={(event) => onChange(event.target.value)}
        placeholder={label}
        type="number"
        value={value}
      />
    </label>
  );
}

function MacroProgress({
  label,
  eaten,
  target,
  color
}: {
  label: string;
  eaten: number;
  target: number;
  color: "blue" | "yellow" | "purple";
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-white">{label}</span>
        <span className="text-sm font-semibold text-app-muted">
          {eaten}g / {target}g
        </span>
      </div>
      <ProgressBar
        value={(eaten / Math.max(target, 1)) * 100}
        color={color}
      />
    </div>
  );
}
