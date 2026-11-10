"use client";

import type { ReactNode } from "react";
import { Tile } from "@carbon/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type WeekBarDay = {
  key: string;
  /** Short weekday, e.g. "Mon". */
  weekday: string;
  /** Day of month. */
  date: number;
  /** Bar height relative to the week's largest value. */
  value: number;
  /** Small number under the bar ("–" when empty). */
  valueLabel: string;
  /** Screen-reader label for the button. */
  ariaLabel: string;
};

/**
 * Seven-day picker shared by the dashboard and Nutrition: rounded day pills
 * with a small bar and number, the selected day in yellow, today on the right.
 */
/** Small "Today" pill for the week bar's corner. */
export function TodayTag() {
  return (
    <span className="inline-flex min-h-6 items-center rounded-full bg-cds-interactive px-2.5 text-xs font-bold text-black">
      Today
    </span>
  );
}

export function WeekBar({
  title,
  titleAs = "h2",
  helper,
  aside,
  days,
  selectedKey,
  onSelect,
  onPrevious,
  onNext,
  previousLabel = "Previous week",
  nextLabel = "Next week"
}: {
  title: ReactNode;
  /** "h1" when the week bar is the page's heading (Dashboard, Nutrition). */
  titleAs?: "h1" | "h2";
  helper?: ReactNode;
  aside?: ReactNode;
  days: WeekBarDay[];
  selectedKey: string;
  onSelect: (key: string) => void;
  /** Show the ‹ arrow when set. */
  onPrevious?: () => void;
  /** Show the › arrow when set (omit at the current week). */
  onNext?: () => void;
  previousLabel?: string;
  nextLabel?: string;
}) {
  const maxValue = Math.max(...days.map((day) => day.value), 1);
  const hasArrows = Boolean(onPrevious) || Boolean(onNext);
  const Heading = titleAs;

  return (
    <Tile className="!p-4 sm:!p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Heading className={titleAs === "h1" ? "cu-heading-03" : "cu-heading-02"}>
            {title}
          </Heading>
          {helper ? <p className="cu-helper mt-1">{helper}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {aside}
          {hasArrows ? (
            <>
              <ArrowButton label={previousLabel} onClick={onPrevious}>
                <ChevronLeft className="size-4" aria-hidden="true" />
              </ArrowButton>
              <ArrowButton label={nextLabel} onClick={onNext}>
                <ChevronRight className="size-4" aria-hidden="true" />
              </ArrowButton>
            </>
          ) : null}
        </div>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-3" role="group" aria-label="Choose a day">
        {days.map((day) => {
          const isSelected = day.key === selectedKey;

          return (
            <button
              key={day.key}
              type="button"
              onClick={() => onSelect(day.key)}
              aria-pressed={isSelected}
              aria-label={day.ariaLabel}
              className={`flex flex-col items-center rounded-[18px] px-1 pb-2 pt-3 outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus ${
                isSelected
                  ? "bg-cds-interactive text-black shadow-[var(--cu-shadow-glow)]"
                  : "bg-black/30 hover:-translate-y-0.5 hover:bg-cds-layer-hover"
              }`}
            >
              <span
                className={`text-[0.68rem] font-bold uppercase tracking-[0.12em] ${
                  isSelected ? "text-black/70" : "text-cds-text-helper"
                }`}
              >
                {day.weekday}
              </span>
              <span className="cu-mono mt-1 text-lg font-bold">{day.date}</span>
              <span className="mt-2 flex h-9 w-full items-end justify-center" aria-hidden="true">
                <span
                  className={`w-2 rounded-full ${
                    isSelected ? "bg-black/80" : day.value > 0 ? "bg-cds-interactive" : "bg-white/15"
                  }`}
                  style={{ height: `${Math.max(4, (day.value / maxValue) * 36)}px` }}
                />
              </span>
              <span
                className={`cu-mono mt-2 text-[0.7rem] ${
                  isSelected ? "text-black/70" : "text-cds-text-helper"
                }`}
              >
                {day.valueLabel}
              </span>
            </button>
          );
        })}
      </div>
    </Tile>
  );
}

function ArrowButton({
  label,
  onClick,
  children
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={!onClick}
      className="flex size-9 items-center justify-center rounded-full bg-black/30 text-white transition hover:bg-cds-layer-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-black/30"
    >
      {children}
    </button>
  );
}
