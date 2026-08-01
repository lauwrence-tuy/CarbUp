"use client";

export type CalendarDay = {
  key: string;
  day: string;
  date: number;
  calories: number;
  load: number;
  activityCount: number;
  isToday: boolean;
};

type WeeklyCalendarProps = {
  days: CalendarDay[];
  onSelectDate?: (dateKey: string) => void;
  selectedDateKey?: string;
};

function getDotColor(load: number, activityCount: number) {
  if (activityCount === 0) {
    return "bg-white/25";
  }

  if (load >= 100) {
    return "bg-app-red";
  }

  if (load >= 65) {
    return "bg-app-orange";
  }

  return "bg-app-green";
}

function formatCalories(calories: number) {
  if (calories >= 1000) {
    return `${(calories / 1000).toFixed(1)}k`;
  }

  return String(calories);
}

export function WeeklyCalendar({
  days,
  onSelectDate,
  selectedDateKey
}: WeeklyCalendarProps) {
  return (
    <section
      aria-label="Weekly calendar"
      className="-mx-4 overflow-x-auto px-4 py-4"
    >
      <div className="grid min-w-max grid-cols-7 gap-3 lg:min-w-0">
        {days.map((item) => {
          const isSelected = selectedDateKey
            ? item.key === selectedDateKey
            : item.isToday;

          return (
            <button
              key={item.key}
              className={`flex h-[92px] w-[68px] flex-col items-center justify-center rounded-[22px] transition duration-200 ease-out hover:-translate-y-0.5 lg:w-full ${
                isSelected
                  ? "bg-app-green text-black shadow-glow"
                  : "bg-app-card text-white hover:bg-app-hover"
              }`}
              onClick={() => onSelectDate?.(item.key)}
              type="button"
              aria-pressed={isSelected}
            >
              <span
                className={`text-xs font-bold uppercase tracking-[0.14em] ${
                  isSelected ? "text-white" : "text-app-secondary"
                }`}
              >
                {item.day}
              </span>
              <span className="mt-1 text-2xl font-semibold leading-none">
                {item.date}
              </span>
              <span
                className={`mt-3 size-2.5 rounded-full ${getDotColor(
                  item.load,
                  item.activityCount
                )}`}
              />
              <span
                className={`mt-1 text-[0.68rem] font-semibold ${
                  isSelected ? "text-white/80" : "text-app-muted"
                }`}
              >
                {item.calories > 0 ? formatCalories(item.calories) : "0"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
