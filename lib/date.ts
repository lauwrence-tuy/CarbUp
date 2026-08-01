export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "America/Los_Angeles";

export function getDateParts(date: Date, timeZone = APP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

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
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function formatShortWeekday(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "short"
  }).format(date);
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
