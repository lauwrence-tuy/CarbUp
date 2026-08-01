"use client";

import { useMemo } from "react";

const weekdayLetters = ["S", "M", "T", "W", "T", "F", "S"];
const dayOffsets = [-3, -2, -1, 0, 1, 2, 3];

type DaySpreadWidgetProps = {
  selectedDate?: Date;
  onSelectDate?: (date: Date) => void;
};

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

function isSameDate(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function formatDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function DaySpreadWidget({
  selectedDate,
  onSelectDate
}: DaySpreadWidgetProps) {
  const today = useMemo(() => createLocalNoonDate(), []);
  const centerDate = selectedDate ?? today;
  const days = dayOffsets.map((offset) => {
    const date = addDays(centerDate, offset);

    return {
      key: formatDateKey(date),
      letter: weekdayLetters[date.getDay()],
      date: date.getDate(),
      fullDate: date,
      isCenter: offset === 0,
      isToday: isSameDate(date, today)
    };
  });

  return (
    <section
      aria-label="Seven day date spread"
      className="mt-6 rounded-[28px] border border-white/[0.04] bg-app-card p-3 shadow-card sm:p-4"
    >
      <div className="grid min-w-0 grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((day) => (
          <button
            key={day.key}
            type="button"
            className={`flex h-[74px] min-w-0 flex-col items-center justify-center rounded-[20px] border ${
              day.isCenter
                ? "border-app-green bg-app-green text-black shadow-glow"
                : day.isToday
                  ? "border-app-green/45 bg-app-green/10 text-app-green"
                  : "border-white/[0.04] bg-black/24 text-white hover:bg-app-hover"
            } transition duration-200 ease-out hover:-translate-y-0.5`}
            aria-label={`${day.letter}, ${day.date}`}
            aria-current={day.isToday ? "date" : undefined}
            onClick={() => onSelectDate?.(day.fullDate)}
          >
            <span
              className={`text-[0.78rem] font-bold leading-none ${
                day.isCenter ? "text-black/70" : "text-app-secondary"
              }`}
            >
              {day.letter}
            </span>
            <span className="mt-2 text-2xl font-bold leading-none tracking-normal">
              {day.date}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
