import { Plus, Trash2, Utensils } from "lucide-react";
import type {
  FoodLogEntry,
  MealName
} from "@/components/dashboard/nutrition-diary-storage";
import { StatusBadge, type StatusBadgeProps } from "@/components/dashboard/status-badge";
import { meals } from "./meals";

/** The day's log, grouped by meal. */
export function FoodDiary({
  log,
  dateLabel,
  status,
  onSelectMeal,
  onRemove
}: {
  log: FoodLogEntry[];
  dateLabel: string;
  status: StatusBadgeProps["label"];
  onSelectMeal: (meal: MealName) => void;
  onRemove: (logId: string) => void;
}) {
  return (
    <section className="animate-rise-in rounded-[28px] border border-white/[0.04] bg-app-card p-6 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-app-green text-black">
            <Utensils className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[0.8rem] font-bold uppercase tracking-[0.16em] text-white">
              Food diary
            </p>
            <p className="mt-1 text-sm text-app-muted">{dateLabel}</p>
          </div>
        </div>
        <StatusBadge label={status} />
      </div>

      <div className="mt-6 divide-y divide-white/[0.06]">
        {meals.map((meal) => {
          const foods = log.filter((food) => food.meal === meal.name);
          const mealCalories = foods.reduce((total, food) => total + food.calories, 0);
          const Icon = meal.icon;

          return (
            <section key={meal.name} className="py-5 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${meal.accent}`}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-white">{meal.name}</h2>
                    <p className="mt-1 text-xs font-semibold text-app-muted">
                      {mealCalories.toLocaleString()} kcal
                    </p>
                  </div>
                </div>
                <button
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-app-green"
                  type="button"
                  aria-label={`Add food to ${meal.name}`}
                  onClick={() => onSelectMeal(meal.name)}
                >
                  <Plus className="size-5" aria-hidden="true" />
                </button>
              </div>

              {foods.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {foods.map((food) => (
                    <DiaryEntry key={food.logId} food={food} onRemove={onRemove} />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function DiaryEntry({
  food,
  onRemove
}: {
  food: FoodLogEntry;
  onRemove: (logId: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] bg-black/24 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-white">{food.name}</p>
        <p className="mt-1 text-xs font-semibold text-app-muted">
          {food.grams ? `${Math.round(food.grams)} g` : food.serving} - P{" "}
          {food.protein}g / C {food.carbs}g / F {food.fat}g
        </p>
        {food.source === "meal" && food.items?.length ? (
          <p className="mt-1 text-xs font-semibold text-app-secondary">
            {food.items
              .map(
                (item) =>
                  `${item.name} ${item.grams ? `${Math.round(item.grams)}g` : ""}`
              )
              .join(" + ")}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-bold text-app-green">{food.calories} kcal</span>
        <button
          className="flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-app-muted transition hover:bg-app-red/20 hover:text-app-red"
          type="button"
          aria-label={`Remove ${food.name}`}
          onClick={() => onRemove(food.logId)}
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
