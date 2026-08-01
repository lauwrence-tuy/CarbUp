"use client";

import Link from "next/link";
import { Flame, Plus, Utensils } from "lucide-react";

type NutritionQuickWidgetsProps = {
  remainingCalories: number;
  targetCalories: number;
  eatenCalories: number;
};

export function NutritionQuickWidgets({
  remainingCalories,
  targetCalories,
  eatenCalories
}: NutritionQuickWidgetsProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <article className="flex min-h-44 flex-col justify-between rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-app-hover">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-app-blue text-black">
              <Utensils className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
                Log Food
              </h2>
              <p className="mt-1 text-sm text-app-muted">
                Add meals and snacks
              </p>
            </div>
          </div>
          <Link
            href="/nutrition"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-app-green text-black shadow-glow transition hover:-translate-y-0.5"
            aria-label="Add food"
          >
            <Plus className="size-6" aria-hidden="true" />
          </Link>
        </div>

        <div>
          <p className="text-3xl font-bold tracking-[-0.04em] text-white">
            {eatenCalories.toLocaleString()}
            <span className="ml-1 text-base font-semibold text-app-muted">
              kcal
            </span>
          </p>
          <p className="mt-1 text-sm font-semibold text-app-secondary">
            logged today
          </p>
        </div>
      </article>

      <article className="flex min-h-44 flex-col justify-between rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-app-hover">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-app-green text-black">
            <Flame className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
              Calories Remaining
            </h2>
            <p className="mt-1 text-sm text-app-muted">Today&apos;s balance</p>
          </div>
        </div>
        <div>
          <p className="text-4xl font-bold tracking-[-0.04em] text-white">
            {remainingCalories.toLocaleString()}
            <span className="ml-1 text-base font-semibold text-app-muted">
              kcal
            </span>
          </p>
          <p className="mt-1 text-sm font-semibold text-app-secondary">
            {targetCalories.toLocaleString()} target -{" "}
            {eatenCalories.toLocaleString()} eaten
          </p>
        </div>
      </article>
    </div>
  );
}
