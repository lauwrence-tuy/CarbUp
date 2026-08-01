import { Flame, Info } from "lucide-react";
import { CountUp } from "./count-up";
import { ProgressBar } from "./progress-bar";
import { StatusBadge } from "./status-badge";

type DailyCalorieCardProps = {
  baseCalories: number;
  exerciseCalories: number;
  goalAdjustment: number;
  eatenCalories?: number;
  eatenMacros?: {
    protein: number;
    carbs: number;
    fat: number;
  };
};

export function DailyCalorieCard({
  baseCalories,
  exerciseCalories,
  goalAdjustment,
  eatenCalories = 0,
  eatenMacros = {
    protein: 0,
    carbs: 0,
    fat: 0
  }
}: DailyCalorieCardProps) {
  const targetCalories = baseCalories + exerciseCalories + goalAdjustment;
  const remainingCalories = Math.max(targetCalories - eatenCalories, 0);
  const eatenProgress =
    targetCalories > 0 ? (eatenCalories / targetCalories) * 100 : 0;
  const macros = [
    {
      name: "Protein",
      target: Math.round((Math.max(targetCalories, 0) * 0.18) / 4),
      eaten: eatenMacros.protein,
      color: "blue" as const
    },
    {
      name: "Carbs",
      target: Math.round((Math.max(targetCalories, 0) * 0.52) / 4),
      eaten: eatenMacros.carbs,
      color: "yellow" as const
    },
    {
      name: "Fat",
      target: Math.round((Math.max(targetCalories, 0) * 0.3) / 9),
      eaten: eatenMacros.fat,
      color: "purple" as const
    }
  ].map((macro) => ({
    ...macro,
    left: Math.max(macro.target - macro.eaten, 0)
  }));
  const effortLabel =
    exerciseCalories >= 1200
      ? "Very Hard"
      : exerciseCalories >= 600
        ? "Hard"
        : exerciseCalories > 0
          ? "Moderate"
          : "Easy";

  return (
    <article className="animate-rise-in rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-app-hover">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-app-green text-black">
            <Flame className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
              Calories
            </p>
            <p className="mt-1 text-sm text-app-muted">
              Base + ride calories
            </p>
          </div>
        </div>
        <StatusBadge label={effortLabel} />
      </div>

      <div className="mt-8">
        <div className="flex items-end gap-2">
          <CountUp
            value={remainingCalories}
            className="text-[4rem] font-bold leading-none tracking-[-0.04em] text-white"
          />
          <span className="pb-2 text-xl font-semibold text-app-muted">
            kcal
          </span>
        </div>
        <p className="mt-2 text-xl font-semibold text-white">
          remaining today
        </p>
      </div>

      <div className="mt-6 rounded-[24px] bg-black/24 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-app-secondary">Daily target</span>
          <span className="font-semibold text-white">
            {baseCalories.toLocaleString()}{" "}
            {goalAdjustment !== 0 ? (
              <>
                {goalAdjustment > 0 ? "+ " : "- "}
                {Math.abs(goalAdjustment).toLocaleString()}{" "}
              </>
            ) : null}
            +{" "}
            <span className="text-app-green">
              {exerciseCalories.toLocaleString()}
            </span>{" "}
            = {targetCalories.toLocaleString()} kcal
          </span>
        </div>
        <ProgressBar
          value={eatenProgress}
          color="green"
          height="base"
          trackClassName="mt-4"
        />
      </div>

      <div className="mt-6 grid grid-cols-3 divide-x divide-white/[0.08]">
        {macros.map((macro) => (
          <div key={macro.name} className="px-3 first:pl-0 last:pr-0">
            <p className="text-center text-[0.68rem] font-bold uppercase tracking-[0.14em] text-app-secondary">
              {macro.name} left
            </p>
            <p
              className={`mt-2 text-center text-3xl font-semibold tracking-[-0.04em] ${
                macro.color === "blue"
                  ? "text-app-blue"
                  : macro.color === "yellow"
                    ? "text-app-yellow"
                    : "text-app-purple"
              }`}
            >
              {macro.left}g
            </p>
            <p className="mt-1 text-center text-sm text-app-muted">
              {macro.eaten}g eaten
            </p>
          </div>
        ))}
      </div>

      <div className="mt-7 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-app-secondary">
            Macros
          </h2>
          <Info className="size-4 text-app-muted" aria-hidden="true" />
        </div>
        {macros.map((macro) => (
          <div key={macro.name}>
            <div className="mb-2 flex items-center justify-between">
              <span
                className={`text-lg font-medium ${
                  macro.color === "blue"
                    ? "text-app-blue"
                    : macro.color === "yellow"
                      ? "text-app-yellow"
                      : "text-app-purple"
                }`}
              >
                {macro.name}
              </span>
              <span className="text-sm font-semibold text-white">
                {macro.eaten}g{" "}
                <span className="font-medium text-app-muted">
                  / {macro.target}g ({macro.left}g left)
                </span>
              </span>
            </div>
            <ProgressBar
              value={macro.target > 0 ? (macro.eaten / macro.target) * 100 : 0}
              color={macro.color}
            />
          </div>
        ))}
      </div>
    </article>
  );
}
