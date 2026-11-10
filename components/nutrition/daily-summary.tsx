import { CountUp } from "@/components/ui/count-up";
import type { NutritionTotals } from "./nutrition-diary-storage";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getMacroTargets } from "@/lib/nutrition-targets";

/** Remaining calories, the target breakdown, and macro progress for one day. */
export function DailySummary({
  totals,
  baseCalories,
  activityCalories,
  goalAdjustment
}: {
  totals: NutritionTotals;
  baseCalories: number;
  activityCalories: number;
  goalAdjustment: number;
}) {
  const targetCalories = baseCalories + activityCalories + goalAdjustment;
  const macroTargets = getMacroTargets(targetCalories);
  const remainingCalories = Math.max(targetCalories - totals.calories, 0);
  const overTargetCalories = Math.max(totals.calories - targetCalories, 0);
  const calorieProgress =
    targetCalories > 0 ? (totals.calories / targetCalories) * 100 : 0;
  const goalText =
    goalAdjustment === 0
      ? ""
      : `${goalAdjustment > 0 ? "+" : "-"} ${Math.abs(goalAdjustment).toLocaleString()} goal `;

  return (
    <section className="mt-5 rounded-[28px] border border-white/[0.04] bg-cds-layer p-5 shadow-[var(--cu-shadow-card)]">
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex items-end justify-between gap-4 rounded-[24px] bg-black/30 p-5">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-cds-text-secondary">
              Remaining
            </p>
            <div className="mt-3 flex items-end gap-2">
              <CountUp
                value={remainingCalories}
                className="text-5xl font-bold leading-none text-white"
              />
              <span className="pb-1 text-base font-semibold text-cds-text-helper">
                kcal
              </span>
            </div>
          </div>
          {overTargetCalories > 0 ? (
            <span className="rounded-full bg-app-red/15 px-3 py-1 text-xs font-bold text-app-red">
              {overTargetCalories.toLocaleString()} over
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryStat label="Eaten" value={totals.calories} detail="kcal" />
          <SummaryStat
            label="Target"
            value={targetCalories}
            detail={`${baseCalories.toLocaleString()} base ${goalText}+ ${activityCalories.toLocaleString()} activity`}
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
        value={calorieProgress}
        color={overTargetCalories > 0 ? "red" : "green"}
        height="base"
        trackClassName="mt-5"
      />

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <MacroProgress
          label="Carbs"
          eaten={totals.carbs}
          target={macroTargets.carbs}
          color="yellow"
        />
        <MacroProgress
          label="Protein"
          eaten={totals.protein}
          target={macroTargets.protein}
          color="blue"
        />
        <MacroProgress
          label="Fat"
          eaten={totals.fat}
          target={macroTargets.fat}
          color="purple"
        />
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
    <div className="rounded-[24px] bg-black/30 p-5">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-cds-text-secondary">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold leading-none text-white">
        {prefix}
        <CountUp value={value} />
      </p>
      <p className="mt-2 text-xs font-semibold leading-5 text-cds-text-helper">
        {detail.trim()}
      </p>
    </div>
  );
}

function MacroProgress({
  label,
  eaten,
  target,
  color
}: {
  label: string;
  eaten: number;
  target: number;
  color: "blue" | "yellow" | "purple";
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-white">{label}</span>
        <span className="text-sm font-semibold text-cds-text-helper">
          {eaten}g / {target}g
        </span>
      </div>
      <ProgressBar value={(eaten / Math.max(target, 1)) * 100} color={color} />
    </div>
  );
}
