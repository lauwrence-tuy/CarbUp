import { Plus, Trash2 } from "lucide-react";
import { Tag } from "@carbon/react";
import type {
  FoodLogEntry,
  MealName
} from "./nutrition-diary-storage";
import type { StatusBadgeProps } from "@/components/ui/status-badge";
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
    <section className="animate-rise-in rounded-[28px] border border-white/[0.04] bg-cds-layer p-6 shadow-[var(--cu-shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="cu-heading-02">Food diary</h2>
          <p className="cu-helper mt-1">{dateLabel}</p>
        </div>
        <Tag type={status === "Complete" ? "green" : "cool-gray"} size="sm" className="shrink-0">
          {status}
        </Tag>
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
                    <p className="mt-1 text-xs font-semibold text-cds-text-helper">
                      {mealCalories.toLocaleString()} kcal
                    </p>
                  </div>
                </div>
                <button
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-cds-interactive"
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
    <div className="flex items-center justify-between gap-4 rounded-[18px] bg-black/30 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-white">{food.name}</p>
        <p className="mt-1 text-xs font-semibold text-cds-text-helper">
          {food.grams ? `${Math.round(food.grams)} g` : food.serving} - P{" "}
          {food.protein}g / C {food.carbs}g / F {food.fat}g
        </p>
        {food.source === "meal" && food.items?.length ? (
          <p className="mt-1 text-xs font-semibold text-cds-text-secondary">
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
        <span className="text-sm font-bold text-cds-interactive">{food.calories} kcal</span>
        <button
          className="flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-cds-text-helper transition hover:bg-app-red/20 hover:text-app-red"
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
