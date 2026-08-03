"use client";

import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { CountUp } from "./count-up";
import type { NutritionTotals } from "./nutrition-diary-storage";
import { ProgressBar } from "./progress-bar";

type SyncedDashboardNutritionProps = {
  baseCalories: number;
  activityCalories: number;
  dateKey: string;
  dateLabel: string;
  goalAdjustment: number;
  totals: NutritionTotals;
};

function getMacroTargets(targetCalories: number) {
  return {
    protein: Math.round((Math.max(targetCalories, 0) * 0.18) / 4),
    carbs: Math.round((Math.max(targetCalories, 0) * 0.52) / 4),
    fat: Math.round((Math.max(targetCalories, 0) * 0.3) / 9)
  };
}

export function SyncedDashboardSummary({
  baseCalories,
  activityCalories,
  dateKey,
  dateLabel,
  goalAdjustment,
  totals
}: SyncedDashboardNutritionProps) {
  const targetCalories = baseCalories + activityCalories + goalAdjustment;
  const remainingCalories = Math.max(targetCalories - totals.calories, 0);
  const overTargetCalories = Math.max(totals.calories - targetCalories, 0);
  const calorieProgress =
    targetCalories > 0 ? (totals.calories / targetCalories) * 100 : 0;
  const macroTargets = getMacroTargets(targetCalories);
  const macros = [
    {
      label: "Carbs",
      eaten: totals.carbs,
      target: macroTargets.carbs,
      color: "yellow" as const
    },
    {
      label: "Protein",
      eaten: totals.protein,
      target: macroTargets.protein,
      color: "blue" as const
    },
    {
      label: "Fat",
      eaten: totals.fat,
      target: macroTargets.fat,
      color: "purple" as const
    }
  ];

  return (
    <section className="rounded-[28px] border border-white/[0.04] bg-app-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-app-green text-black">
            <Flame className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
              {dateLabel}
            </h2>
            <p className="mt-1 text-sm text-app-muted">
              Nutrition balance
            </p>
          </div>
        </div>
        <Link
          href="/nutrition"
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-app-green px-4 text-sm font-bold text-black shadow-glow transition hover:-translate-y-0.5"
        >
          Log food
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(250px,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-[24px] bg-black/24 p-5">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-app-secondary">
            Remaining
          </p>
          <div className="mt-3 flex items-end gap-2">
            <CountUp
              value={remainingCalories}
              className="text-5xl font-bold leading-none text-white"
            />
            <span className="pb-1 text-base font-semibold text-app-muted">
              kcal
            </span>
          </div>
          {overTargetCalories > 0 ? (
            <p className="mt-2 text-sm font-bold text-app-red">
              {overTargetCalories.toLocaleString()} kcal over target
            </p>
          ) : (
            <p className="mt-2 text-sm font-semibold text-app-muted">
              {totals.calories.toLocaleString()} kcal logged
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryStat
            label="Eaten"
            value={totals.calories}
            detail="kcal"
          />
          <SummaryStat
            label="Target"
            value={targetCalories}
            detail={`${baseCalories.toLocaleString()} base ${
              goalAdjustment === 0
                ? ""
                : `${goalAdjustment > 0 ? "+" : "-"} ${Math.abs(
                    goalAdjustment
                  ).toLocaleString()} goal `
            }+ ${activityCalories.toLocaleString()} activity`}
          />
          <SummaryStat
            label="Activity"
            prefix="+"
            value={activityCalories}
            detail="kcal"
          />
        </div>
      </div>

      <ProgressBar
        key={`${dateKey}-calories`}
        value={calorieProgress}
        color={overTargetCalories > 0 ? "red" : "green"}
        height="base"
        trackClassName="mt-5"
      />

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {macros.map((macro) => (
          <div key={macro.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-white">
                {macro.label}
              </span>
              <span className="text-sm font-semibold text-app-muted">
                {macro.eaten}g / {macro.target}g
              </span>
            </div>
            <ProgressBar
              key={`${dateKey}-${macro.label}`}
              value={(macro.eaten / Math.max(macro.target, 1)) * 100}
              color={macro.color}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function SummaryStat({
  label,
  prefix = "",
  value,
  detail
}: {
  label: string;
  prefix?: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] bg-black/24 p-4">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-app-secondary">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold leading-none text-white">
        {prefix}
        <CountUp value={value} />
      </p>
      <p className="mt-2 text-xs font-semibold leading-5 text-app-muted">
        {detail.trim()}
      </p>
    </div>
  );
}
