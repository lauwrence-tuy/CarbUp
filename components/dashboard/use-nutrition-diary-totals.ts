"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createNutritionTotals,
  dailyLogsStorageKey,
  emptyNutritionTotals,
  type FoodLogEntry,
  getTodayDateKey,
  legacyLogStorageKey,
  pruneStoredLogs,
  type NutritionTotals
} from "./nutrition-diary-storage";

function readTotalsForDate(dateKey: string): NutritionTotals {
  const savedLogs = window.localStorage.getItem(dailyLogsStorageKey);

  if (savedLogs) {
    try {
      const parsedLogs = JSON.parse(savedLogs) as Record<string, FoodLogEntry[]>;
      const retainedLogs = pruneStoredLogs(parsedLogs);

      return createNutritionTotals(retainedLogs[dateKey] ?? []);
    } catch {
      window.localStorage.removeItem(dailyLogsStorageKey);
      return emptyNutritionTotals;
    }
  }

  const legacyLog = window.localStorage.getItem(legacyLogStorageKey);

  if (!legacyLog || dateKey !== getTodayDateKey()) {
    return emptyNutritionTotals;
  }

  try {
    return createNutritionTotals(JSON.parse(legacyLog) as FoodLogEntry[]);
  } catch {
    window.localStorage.removeItem(legacyLogStorageKey);
    return emptyNutritionTotals;
  }
}

export function useNutritionDiaryTotals(dateKey = getTodayDateKey()) {
  const [totals, setTotals] = useState<NutritionTotals>(emptyNutritionTotals);

  const refreshTotals = useCallback(() => {
    setTotals(readTotalsForDate(dateKey));
  }, [dateKey]);

  useEffect(() => {
    refreshTotals();

    window.addEventListener("storage", refreshTotals);
    window.addEventListener("focus", refreshTotals);
    document.addEventListener("visibilitychange", refreshTotals);

    return () => {
      window.removeEventListener("storage", refreshTotals);
      window.removeEventListener("focus", refreshTotals);
      document.removeEventListener("visibilitychange", refreshTotals);
    };
  }, [refreshTotals]);

  return totals;
}

