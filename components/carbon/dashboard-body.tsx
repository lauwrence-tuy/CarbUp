"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Button,
  Column,
  Grid,
  ProgressBar,
  StructuredListBody,
  StructuredListCell,
  StructuredListHead,
  StructuredListRow,
  StructuredListWrapper,
  Tag,
  Tile
} from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { Plus } from "lucide-react";
import type { CalendarDay, MealsByDate, Workout } from "@/lib/dashboard-types";
import { meals as mealOrder } from "@/components/nutrition/meals";
import type { NutritionTotals } from "@/components/nutrition/nutrition-diary-storage";
import { getMacroTargets, resolveBaseCalories } from "@/lib/nutrition-targets";
import { getEffortBadge } from "@/lib/workout-metrics";
import { CarbonSyncButton } from "./sync-button";
import { effortTagType } from "./page-shell";

export type DashboardBodyProps = {
  baseCalories: number;
  goalAdjustment: number;
  workoutsByDate: Record<string, Workout[]>;
  nutritionTotalsByDate: Record<string, NutritionTotals>;
  /** Logged foods per day, grouped by meal. */
  mealsByDate?: MealsByDate;
  calendarDays: CalendarDay[];
  isConnected: boolean;
  /** Sample mode: workouts are not links and sync is hidden. */
  isSample?: boolean;
};

const emptyTotals: NutritionTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };


function formatNumber(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function formatDayLabel(dateKey: string, style: "short" | "long") {
  return new Intl.DateTimeFormat("en-US", {
    weekday: style === "long" ? "long" : undefined,
    month: "short",
    day: "numeric"
  }).format(new Date(`${dateKey}T12:00:00`));
}

/**
 * Day intensity on the same scale and colours as the workout tags (Strava
 * intensity), using the day's total load. Days without a workout are "Rest".
 */
function DayIntensityTag({ day }: { day: CalendarDay | undefined }) {
  if (!day || day.activityCount === 0) {
    return (
      <Tag type="cool-gray" size="md" className="shrink-0">
        Rest
      </Tag>
    );
  }

  const badge = getEffortBadge(day.load);

  return (
    <Tag type={effortTagType[badge]} size="md" className="shrink-0">
      {badge}
    </Tag>
  );
}

export function DashboardBody({
  baseCalories,
  goalAdjustment,
  workoutsByDate,
  nutritionTotalsByDate,
  mealsByDate = {},
  calendarDays,
  isConnected,
  isSample = false
}: DashboardBodyProps) {
  const todayKey =
    calendarDays.find((day) => day.isToday)?.key ??
    calendarDays[calendarDays.length - 1]?.key ??
    "";
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const selectedDay =
    calendarDays.find((day) => day.key === selectedKey) ??
    calendarDays[calendarDays.length - 1];
  const isToday = selectedDay?.isToday ?? true;

  // One source of truth: the selected day's calendar entry is summed from
  // the same workouts listed below.
  const workouts = workoutsByDate[selectedKey] ?? [];
  const exerciseCalories = selectedDay?.calories ?? 0;
  const totals = nutritionTotalsByDate[selectedKey] ?? emptyTotals;

  const base = resolveBaseCalories(baseCalories);
  const target = base + exerciseCalories + goalAdjustment;
  const remaining = Math.max(target - totals.calories, 0);
  const over = Math.max(totals.calories - target, 0);
  const macroTargets = getMacroTargets(target);
  const macros = [
    { label: "Carbs", eaten: totals.carbs, target: macroTargets.carbs, bar: "cu-bar-carbs" },
    { label: "Protein", eaten: totals.protein, target: macroTargets.protein, bar: "cu-bar-protein" },
    { label: "Fat", eaten: totals.fat, target: macroTargets.fat, bar: "cu-bar-fat" }
  ];
  const maxLoad = Math.max(...calendarDays.map((day) => day.load), 1);

  const meals = mealsByDate[selectedKey] ?? {};
  const loggedCount = mealOrder.reduce((total, meal) => total + (meals[meal.name]?.length ?? 0), 0);
  const goalText =
    goalAdjustment === 0
      ? null
      : `${goalAdjustment > 0 ? "+" : "−"} ${formatNumber(Math.abs(goalAdjustment))} goal`;

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <p className="cu-label">{isToday ? "Today" : "Selected day"}</p>
        <h1 className="cu-heading-05 mt-2">
          {selectedDay ? formatDayLabel(selectedDay.key, "long") : "Today"}
        </h1>
      </Column>

      <Column sm={4} md={8} lg={16} className="mt-8">
        {/* Week bar: pick a day; everything below follows it. */}
        <Tile className="!p-4 sm:!p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="cu-heading-02">Last 7 days</h2>
              <p className="cu-helper mt-1">Select a day to see its fuel, meals and workouts</p>
            </div>
            <DayIntensityTag day={selectedDay} />
          </div>
          <div className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-3" role="group" aria-label="Choose a day">
            {calendarDays.map((day) => {
              const isSelected = day.key === selectedKey;

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedKey(day.key)}
                  aria-pressed={isSelected}
                  aria-label={`${formatDayLabel(day.key, "long")}, ${formatNumber(day.calories)} kcal burned`}
                  className={`flex flex-col items-center rounded-[18px] px-1 pb-2 pt-3 outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus ${
                    isSelected
                      ? "bg-cds-interactive text-black shadow-[var(--cu-shadow-glow)]"
                      : "bg-black/30 hover:-translate-y-0.5 hover:bg-cds-layer-hover"
                  }`}
                >
                  <span className={`text-[0.68rem] font-bold uppercase tracking-[0.12em] ${isSelected ? "text-black/70" : "text-cds-text-helper"}`}>
                    {day.day}
                  </span>
                  <span className="cu-mono mt-1 text-lg font-bold">{day.date}</span>
                  <span className="mt-2 flex h-9 w-full items-end justify-center" aria-hidden="true">
                    <span
                      className={`w-2 rounded-full ${
                        isSelected ? "bg-black/80" : day.load > 0 ? "bg-cds-interactive" : "bg-white/15"
                      }`}
                      style={{ height: `${Math.max(4, (day.load / maxLoad) * 36)}px` }}
                    />
                  </span>
                  <span className={`cu-mono mt-2 text-[0.7rem] ${isSelected ? "text-black/70" : "text-cds-text-helper"}`}>
                    {day.calories > 0 ? formatNumber(day.calories) : "–"}
                  </span>
                </button>
              );
            })}
          </div>
        </Tile>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* Fuel: what's left */}
          <Tile className="!p-6">
            <h2 className="cu-heading-02">Fuel</h2>
            <p className="cu-figure cu-accent mt-4">{formatNumber(remaining)}</p>
            <p className="cu-body-01 text-cds-text-secondary">kcal remaining</p>
            <div className="mt-5">
              <ProgressBar
                label={over > 0 ? `${formatNumber(over)} kcal over target` : "Eaten"}
                helperText={`${formatNumber(totals.calories)} of ${formatNumber(target)} kcal`}
                value={Math.min((totals.calories / Math.max(target, 1)) * 100, 100)}
                status={over > 0 ? "error" : "active"}
                size="big"
              />
            </div>
            <p className="cu-mono mt-5 border-y border-[color:var(--cds-border-subtle-00)] py-4 text-sm text-cds-text-secondary">
              <span className="text-white">{formatNumber(base)}</span> base{" "}
              + <span className="text-cds-interactive">{formatNumber(exerciseCalories)}</span>{" "}
              {workouts.length === 1 ? "ride" : "rides"}
              {goalText ? ` ${goalText}` : ""} ={" "}
              <span className="text-white">{formatNumber(target)}</span> target
            </p>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              {macros.map((macro) => (
                <ProgressBar
                  key={`${selectedKey}-${macro.label}`}
                  className={macro.bar}
                  label={macro.label}
                  helperText={`${formatNumber(macro.eaten)} of ${formatNumber(macro.target)} g`}
                  value={Math.min((macro.eaten / Math.max(macro.target, 1)) * 100, 100)}
                />
              ))}
            </div>
          </Tile>

          {/* Meals: what's eaten */}
          <Tile className="flex flex-col !p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="cu-heading-02">{isToday ? "Today's meals" : "Meals"}</h2>
                <p className="cu-helper mt-1">
                  {loggedCount === 0
                    ? "Nothing logged yet"
                    : `${loggedCount} ${loggedCount === 1 ? "item" : "items"} · ${formatNumber(totals.calories)} kcal`}
                </p>
              </div>
            </div>
            <ul className="mt-4 flex-1 divide-y divide-[color:var(--cds-border-subtle-00)]">
              {mealOrder.map((meal) => {
                const entries = meals[meal.name] ?? [];
                const mealCalories = entries.reduce((total, entry) => total + entry.calories, 0);
                const Icon = meal.icon;

                return (
                  <li key={meal.name} className="flex items-start gap-3 py-3">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-black/30 text-cds-interactive">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-bold text-white">{meal.name}</p>
                        <p className="cu-mono text-sm text-cds-text-secondary">
                          {entries.length > 0 ? `${formatNumber(mealCalories)} kcal` : "—"}
                        </p>
                      </div>
                      {entries.length > 0 ? (
                        <p className="cu-helper mt-0.5 truncate">
                          {entries.map((entry) => entry.name).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    {!isSample ? (
                      <Link
                        href="/nutrition"
                        aria-label={`Add food to ${meal.name}`}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-cds-interactive focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {!isSample ? (
              <div className="mt-4">
                <Button as={Link} href="/nutrition" kind="tertiary" size="md" renderIcon={ArrowRight}>
                  Log food
                </Button>
              </div>
            ) : null}
          </Tile>
        </div>

        {/* Workouts */}
        <Tile className="mt-4 !p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="cu-heading-02">Workouts</h2>
            {isConnected && !isSample ? <CarbonSyncButton /> : null}
          </div>
          {workouts.length > 0 ? (
            <StructuredListWrapper aria-label="Workouts" className="!mb-0 mt-4">
              <StructuredListHead>
                <StructuredListRow head>
                  <StructuredListCell head>Workout</StructuredListCell>
                  <StructuredListCell head>Intensity</StructuredListCell>
                  <StructuredListCell head className="hidden md:table-cell">Time</StructuredListCell>
                  <StructuredListCell head className="hidden md:table-cell">Distance</StructuredListCell>
                  <StructuredListCell head className="text-right">kcal</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {workouts.map((workout) => (
                  <StructuredListRow key={workout.id}>
                    <StructuredListCell>
                      {isSample || !workout.slug ? (
                        <span className="font-semibold text-white">{workout.name}</span>
                      ) : (
                        <Link
                          href={`/workout/${workout.slug}`}
                          className="font-semibold text-white hover:text-cds-interactive hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cds-focus"
                        >
                          {workout.name}
                        </Link>
                      )}
                      <span className="cu-helper mt-1 block">
                        {workout.startTime}
                        <span className="md:hidden"> · {workout.duration} · {workout.distance}</span>
                      </span>
                    </StructuredListCell>
                    <StructuredListCell>
                      <Tag type={effortTagType[workout.badge]} size="sm">
                        {workout.badge}
                      </Tag>
                    </StructuredListCell>
                    <StructuredListCell className="cu-mono hidden md:table-cell">{workout.duration}</StructuredListCell>
                    <StructuredListCell className="cu-mono hidden md:table-cell">{workout.distance}</StructuredListCell>
                    <StructuredListCell className="cu-mono text-right">
                      {workout.calories == null ? "—" : `+${formatNumber(workout.calories)}`}
                    </StructuredListCell>
                  </StructuredListRow>
                ))}
              </StructuredListBody>
            </StructuredListWrapper>
          ) : (
            <p className="cu-body-01 mt-4 text-cds-text-secondary">
              {isConnected
                ? "No workouts on this day. Use Sync Strava to import recent activities."
                : "Connect Strava to see workouts here."}
            </p>
          )}
        </Tile>
      </Column>
    </Grid>
  );
}
