"use client";

import { useState } from "react";
import type { FoodLogEntry } from "./nutrition-diary-storage";
import { deleteFoodLog, saveFoodLog } from "./nutrition-api";

export type LogsByDate = Record<string, FoodLogEntry[]>;

/**
 * Food log entries for every loaded day. Adds and removes update the UI
 * immediately; a failed save rolls the entry back.
 */
export function useFoodLog(initialLogsByDate: LogsByDate, dateKey: string) {
  const [logsByDate, setLogsByDate] = useState<LogsByDate>(initialLogsByDate);
  const log = logsByDate[dateKey] ?? [];

  function updateDay(updater: (entries: FoodLogEntry[]) => FoodLogEntry[]) {
    setLogsByDate((current) => ({
      ...current,
      [dateKey]: updater(current[dateKey] ?? [])
    }));
  }

  async function addEntry(entry: FoodLogEntry) {
    const temporaryLogId = entry.logId;

    updateDay((entries) => [...entries, entry]);

    try {
      const saved = await saveFoodLog(entry, dateKey);

      updateDay((entries) =>
        entries.map((item) =>
          item.logId === temporaryLogId ? { ...item, logId: saved.id } : item
        )
      );
    } catch {
      updateDay((entries) => entries.filter((item) => item.logId !== temporaryLogId));
    }
  }

  function removeEntry(logId: string) {
    updateDay((entries) => entries.filter((item) => item.logId !== logId));
    deleteFoodLog(logId);
  }

  /** Fill in days that are still empty (used by the localStorage migration). */
  function mergeMissingDays(migrated: LogsByDate) {
    setLogsByDate((current) => {
      const next = { ...current };

      for (const [key, entries] of Object.entries(migrated)) {
        if ((next[key] ?? []).length === 0) {
          next[key] = [...entries];
        }
      }

      return next;
    });
  }

  return { log, addEntry, removeEntry, mergeMissingDays };
}
