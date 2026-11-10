// Local-date helpers for the Nutrition page.
import { getLocalDateKey } from "@/lib/date";

export function createLocalNoonDate(date = new Date()) {
  const localDate = new Date(date);
  localDate.setHours(12, 0, 0, 0);
  return localDate;
}

export function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

export function formatDateKey(date: Date) {
  return getLocalDateKey(date);
}
