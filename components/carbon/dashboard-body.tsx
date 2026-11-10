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
import type { CalendarDay, Workout } from "@/lib/dashboard-types";
import type { NutritionTotals } from "@/components/nutrition/nutrition-diary-storage";
import { getMacroTargets, resolveBaseCalories } from "@/lib/nutrition-targets";
import { CarbonSyncButton } from "./sync-button";
import { effortTagType, StatTile } from "./page-shell";

export type DashboardBodyProps = {
  baseCalories: number;
  goalAdjustment: number;
  workoutsByDate: Record<string, Workout[]>;
  nutritionTotalsByDate: Record<string, NutritionTotals>;
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

function loadStatus(load: number) {
  if (load >= 600) return "High";
  if (load >= 300) return "Moderate";
  if (load > 0) return "Easy";
  return "Rest";
}

export function DashboardBody({
  baseCalories,
  goalAdjustment,
  workoutsByDate,
  nutritionTotalsByDate,
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

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <p className="cu-label">{isToday ? "Today" : "Selected day"}</p>
        <h1 className="cu-heading-05 mt-2">
          {selectedDay ? formatDayLabel(selectedDay.key, "long") : "Today"}
        </h1>
      </Column>

      {/* Fuel */}
      <Column sm={4} md={8} lg={10} className="mt-8">
        <Tile className="!p-6">
          <p className="cu-body-01 text-cds-text-secondary">kcal remaining</p>
          <p className="cu-figure cu-accent mt-2">{formatNumber(remaining)}</p>
          <div className="mt-6">
            <ProgressBar
              label={over > 0 ? `${formatNumber(over)} kcal over target` : "Eaten"}
              helperText={`${formatNumber(totals.calories)} of ${formatNumber(target)} kcal`}
              value={Math.min((totals.calories / Math.max(target, 1)) * 100, 100)}
              status={over > 0 ? "error" : "active"}
              size="big"
            />
          </div>
        </Tile>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatTile label="Base" value={formatNumber(base)} helper="maintenance kcal" />
          <StatTile
            label="Exercise"
            value={`+${formatNumber(exerciseCalories)}`}
            helper={`${workouts.length} ${workouts.length === 1 ? "workout" : "workouts"} from Strava`}
          />
          <StatTile
            label="Target"
            value={formatNumber(target)}
            helper={
              goalAdjustment === 0
                ? "kcal, maintain"
                : `kcal, includes ${goalAdjustment > 0 ? "+" : "−"}${formatNumber(Math.abs(goalAdjustment))} goal`
            }
          />
        </div>

        <Tile className="mt-4 !p-6">
          <h2 className="cu-heading-02">Macros</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
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
      </Column>

      {/* Training */}
      <Column sm={4} md={8} lg={6} className="mt-8">
        <Tile className="!p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="cu-heading-02">Last 7 days</h2>
              <p className="cu-helper mt-1">Select a day to see its fuel and workouts</p>
            </div>
            <Tag type="cool-gray" size="md" className="shrink-0">
              {loadStatus(selectedDay?.load ?? 0)}
            </Tag>
          </div>
          <div className="mt-6 grid grid-cols-7 gap-1.5 sm:gap-2" role="group" aria-label="Choose a day">
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
                  <span className="mt-3 flex h-12 w-full items-end justify-center" aria-hidden="true">
                    <span
                      className={`w-2 rounded-full ${
                        isSelected
                          ? "bg-black/80"
                          : day.load > 0
                            ? "bg-cds-interactive"
                            : "bg-white/15"
                      }`}
                      style={{ height: `${Math.max(4, (day.load / maxLoad) * 48)}px` }}
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
                  <StructuredListCell head className="text-right">kcal</StructuredListCell>
                </StructuredListRow>
              </StructuredListHead>
              <StructuredListBody>
                {workouts.map((workout) => (
                  <StructuredListRow key={workout.id}>
                    <StructuredListCell>
                      {isSample || !workout.slug ? (
                        <span>{workout.name}</span>
                      ) : (
                        <Link href={`/workout/${workout.slug}`} className="cds--link">
                          {workout.name}
                        </Link>
                      )}
                      <span className="cu-helper mt-1 block">
                        {workout.startTime} · {workout.duration} · {workout.distance}
                      </span>
                    </StructuredListCell>
                    <StructuredListCell>
                      <Tag type={effortTagType[workout.badge]} size="sm">
                        {workout.badge}
                      </Tag>
                    </StructuredListCell>
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

        {!isSample ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button as={Link} href="/nutrition" kind="tertiary" renderIcon={ArrowRight}>
              Log food
            </Button>
            <Button as={Link} href="/trends" kind="ghost" renderIcon={ArrowRight}>
              Trends
            </Button>
          </div>
        ) : null}
      </Column>
    </Grid>
  );
}

