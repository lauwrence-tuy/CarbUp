export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/Los_Angeles";

// Building an Intl.DateTimeFormat is far slower than using one, and these
// helpers run inside per-day and per-activity loops, so each formatter is
// created once and reused.
const datePartsFormatters = new Map<string, Intl.DateTimeFormat>();

function getDatePartsFormatter(timeZone: string) {
  let formatter = datePartsFormatters.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    datePartsFormatters.set(timeZone, formatter);
  }

  return formatter;
}

const activityTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  hour: "numeric",
  minute: "2-digit"
});

const shortWeekdayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  weekday: "short"
});

const workoutDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIMEZONE,
  month: "short",
  day: "numeric",
  year: "numeric"
});

export function getDateParts(date: Date, timeZone = APP_TIMEZONE) {
  const parts = getDatePartsFormatter(timeZone).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value)
  };
}

export function getLocalDateKey(date: Date) {
  const { year, month, day } = getDateParts(date);

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isSameLocalDay(date: Date, comparisonDate = new Date()) {
  const first = getDateParts(date);
  const second = getDateParts(comparisonDate);

  return (
    first.year === second.year &&
    first.month === second.month &&
    first.day === second.day
  );
}

export function formatActivityTime(date: Date) {
  return activityTimeFormatter.format(date);
}

export function formatShortWeekday(date: Date) {
  return shortWeekdayFormatter.format(date);
}

export function getTrailingSevenLocalDays(referenceDate = new Date()) {
  const days = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(referenceDate);
    date.setUTCDate(referenceDate.getUTCDate() - offset);

    const parts = getDateParts(date);
    days.push({
      key: getLocalDateKey(date),
      day: formatShortWeekday(date),
      date: parts.day,
      isToday: offset === 0
    });
  }

  return days;
}

export function formatWorkoutDate(date: Date) {
  return workoutDateFormatter.format(date);
}
