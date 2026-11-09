"use client";

// One-time move of food logs and saved meals from localStorage (where older
// versions of CarbUp kept them) into the database. Each part runs at most once
// per browser and is skipped when the database already has data for it.

import { useEffect } from "react";
import {
  dailyLogsStorageKey,
  type FoodLogEntry,
  legacyLogStorageKey,
  type SavedMeal
} from "./nutrition-diary-storage";
import { createLogId } from "@/lib/nutrition-portions";
import { saveFoodLog, saveMeal } from "./nutrition-api";
import type { LogsByDate } from "./use-food-log";

const LOGS_MIGRATED_KEY = "carbup-local-food-logs-migrated-to-db";
const LEGACY_SAVED_MEALS_KEY = "carbup-saved-meals";
const SAVED_MEALS_MIGRATED_KEY = "carbup-local-saved-meals-migrated-to-db";

function readLegacyLogs(todayKey: string): LogsByDate {
  const savedLogs = window.localStorage.getItem(dailyLogsStorageKey);

  if (savedLogs) {
    try {
      return JSON.parse(savedLogs) as LogsByDate;
    } catch {
      window.localStorage.removeItem(dailyLogsStorageKey);
    }
  }

  const legacyLog = window.localStorage.getItem(legacyLogStorageKey);

  if (!legacyLog) {
    return {};
  }

  try {
    return { [todayKey]: JSON.parse(legacyLog) as FoodLogEntry[] };
  } catch {
    window.localStorage.removeItem(legacyLogStorageKey);
    return {};
  }
}

/** Fill gaps in entries written by older app versions. */
function normalizeLegacyEntry(entry: FoodLogEntry): FoodLogEntry {
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

export function useLegacyStorageMigration({
  todayKey,
  initialLogsByDate,
  initialSavedMeals,
  onLogsMigrated,
  onSavedMealsMigrated
}: {
  todayKey: string;
  initialLogsByDate: LogsByDate;
  initialSavedMeals: SavedMeal[];
  onLogsMigrated: (logs: LogsByDate) => void;
  onSavedMealsMigrated: (meals: SavedMeal[]) => void;
}) {
  useEffect(() => {
    if (window.localStorage.getItem(LOGS_MIGRATED_KEY) === "true") {
      return;
    }

    // Skip days the database already has entries for.
    const toMigrate = Object.entries(readLegacyLogs(todayKey)).flatMap(
      ([dateKey, entries]) =>
        (initialLogsByDate[dateKey]?.length ?? 0) > 0
          ? []
          : entries.map((entry) => ({ dateKey, entry }))
    );

    if (toMigrate.length === 0) {
      window.localStorage.setItem(LOGS_MIGRATED_KEY, "true");
      return;
    }

    let cancelled = false;

    async function migrate() {
      const migrated: LogsByDate = {};

      for (const { dateKey, entry } of toMigrate) {
        const normalized = normalizeLegacyEntry(entry);

        try {
          const saved = await saveFoodLog(normalized, dateKey);
          migrated[dateKey] = [
            ...(migrated[dateKey] ?? []),
            { ...normalized, logId: saved.id }
          ];
        } catch {
          // Leave the flag unset so the next visit retries.
          return;
        }
      }

      if (cancelled) {
        return;
      }

      onLogsMigrated(migrated);
      window.localStorage.setItem(LOGS_MIGRATED_KEY, "true");
    }

    void migrate();

    return () => {
      cancelled = true;
    };
    // Runs once per page load; the callbacks are intentionally not deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLogsByDate, todayKey]);

  useEffect(() => {
    if (
      initialSavedMeals.length > 0 ||
      window.localStorage.getItem(SAVED_MEALS_MIGRATED_KEY) === "true"
    ) {
      return;
    }

    const legacyJson = window.localStorage.getItem(LEGACY_SAVED_MEALS_KEY);

    if (!legacyJson) {
      window.localStorage.setItem(SAVED_MEALS_MIGRATED_KEY, "true");
      return;
    }

    const savedMealJson = legacyJson;
    let cancelled = false;

    async function migrate() {
      try {
        const legacyMeals = JSON.parse(savedMealJson) as SavedMeal[];
        const migrated: SavedMeal[] = [];

        for (const meal of legacyMeals) {
          const persisted = await saveMeal(meal.name, meal.ingredients);
          migrated.push({ ...meal, id: persisted.id });
        }

        if (cancelled) {
          return;
        }

        onSavedMealsMigrated(migrated);
        window.localStorage.setItem(SAVED_MEALS_MIGRATED_KEY, "true");
      } catch {
        window.localStorage.removeItem(LEGACY_SAVED_MEALS_KEY);
      }
    }

    void migrate();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSavedMeals]);
}
