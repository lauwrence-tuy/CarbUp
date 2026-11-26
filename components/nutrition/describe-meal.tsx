"use client";

import { useState } from "react";
import { Sparkles, Trash2, X } from "lucide-react";
import {
  sumMacros,
  type ResolvedMeal,
  type ResolvedMealItem
} from "@/lib/ai/meal-resolver";
import { createLogId } from "@/lib/nutrition-portions";
import {
  createNutritionTotals,
  type FoodLogEntry,
  type MealName
} from "./nutrition-diary-storage";

type DescribeMealProps = {
  selectedMeal: MealName;
  onSelectMeal: (meal: MealName) => void;
  onLog: (entry: FoodLogEntry) => void;
};

type ParseResponse = ResolvedMeal & { cached: boolean; disclaimer: string };

const EXAMPLE = "2 scrambled eggs, a slice of whole wheat toast with butter and a latte";

function scaleItem(item: ResolvedMealItem, grams: number): ResolvedMealItem {
  const safeGrams = Math.max(0, Math.round(grams));
  const factor = safeGrams / 100;

  return {
    ...item,
    grams: safeGrams,
    calories: Math.round(item.per100g.calories * factor),
    protein: Math.round(item.per100g.protein * factor * 10) / 10,
    carbs: Math.round(item.per100g.carbs * factor * 10) / 10,
    fat: Math.round(item.per100g.fat * factor * 10) / 10
  };
}

function toLogEntry(title: string, items: ResolvedMealItem[], meal: MealName): FoodLogEntry {
  const children: FoodLogEntry[] = items.map((item) => ({
    id: item.match?.id ?? "",
    name: item.match?.name ?? item.name,
    brand: item.source === "catalog" ? item.match?.brand ?? "" : "Estimate",
    serving: `${item.grams} g`,
    baseGrams: 100,
    grams: item.grams,
    calories: Math.round(item.calories),
    protein: Math.round(item.protein),
    carbs: Math.round(item.carbs),
    fat: Math.round(item.fat),
    logId: createLogId(),
    meal,
    source: "food"
  }));
  const grams = children.reduce((sum, item) => sum + (item.grams ?? 0), 0);

  return {
    id: "",
    name: title,
    brand: "Described meal",
    serving: `${grams} g`,
    baseGrams: grams,
    grams,
    ...createNutritionTotals(children),
    items: children,
    logId: createLogId(),
    meal,
    source: "meal"
  };
}

export function DescribeMeal({ selectedMeal, onSelectMeal, onLog }: DescribeMealProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResponse | null>(null);
  const [items, setItems] = useState<ResolvedMealItem[]>([]);

  const totals = sumMacros(items);

  async function read() {
    setIsReading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/parse-meal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = (await response.json()) as ParseResponse & { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Couldn't read that meal.");
        return;
      }

      setResult(data);
      setItems(data.items);

      if (data.mealHint) {
        onSelectMeal(data.mealHint);
      }
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setIsReading(false);
    }
  }

  function reset() {
    setResult(null);
    setItems([]);
    setError(null);
  }

  function confirm() {
    if (!result || items.length === 0) {
      return;
    }

    onLog(toLogEntry(result.title, items, selectedMeal));
    setText("");
    reset();
    setOpen(false);
  }

  return (
    <div className="contents">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-10 items-center gap-2 rounded-full bg-black/30 px-3 text-xs font-bold text-cds-text-secondary transition hover:bg-white/[0.08] hover:text-white sm:px-4"
      >
        <Sparkles className="size-4" aria-hidden="true" />
        {open ? "Hide" : "Describe a meal"}
      </button>

      {open ? (
        <div className="order-last w-full basis-full rounded-[20px] bg-black/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cds-text-secondary">
              Describe a meal
            </p>
            <button
              type="button"
              aria-label="Close meal description"
              onClick={() => setOpen(false)}
              className="flex size-8 items-center justify-center rounded-full bg-white/[0.06] text-cds-text-helper transition hover:text-white"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          {result ? (
            <div className="mt-3">
              <p className="text-sm font-bold text-white">{result.title}</p>
              <ul className="mt-3 space-y-2" aria-label="Foods found">
                {items.map((item, index) => (
                  <li
                    key={`${item.name}-${index}`}
                    className="flex items-center gap-3 rounded-[14px] bg-white/[0.04] px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{item.name}</p>
                      <p className="truncate text-xs text-cds-text-helper">
                        {item.source === "catalog" && item.match
                          ? `Matched ${item.match.name}`
                          : "Estimated, no catalog match"}
                        {" · "}
                        {item.calories} kcal · {Math.round(item.protein)}P ·{" "}
                        {Math.round(item.carbs)}C · {Math.round(item.fat)}F
                      </p>
                    </div>
                    <label className="flex items-center gap-1 text-xs text-cds-text-helper">
                      <input
                        aria-label={`Grams of ${item.name}`}
                        className="w-16 rounded-full border border-white/[0.06] bg-black/30 px-2 py-1 text-right text-sm font-semibold text-white outline-none focus:border-cds-interactive"
                        inputMode="numeric"
                        value={item.grams}
                        onChange={(event) => {
                          const grams = Number(event.target.value.replace(/[^\d]/g, ""));
                          setItems((current) =>
                            current.map((entry, i) => (i === index ? scaleItem(entry, grams) : entry))
                          );
                        }}
                      />
                      g
                    </label>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() =>
                        setItems((current) => current.filter((_, i) => i !== index))
                      }
                      className="flex size-8 items-center justify-center rounded-full text-cds-text-helper transition hover:text-white"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>

              <p className="mt-3 text-sm font-bold text-white" data-testid="described-meal-totals">
                {Math.round(totals.calories)} kcal · {Math.round(totals.protein)} g protein ·{" "}
                {Math.round(totals.carbs)} g carbs · {Math.round(totals.fat)} g fat
              </p>
              {result.notFood.length > 0 ? (
                <p className="mt-1 text-xs text-cds-text-helper">
                  Skipped: {result.notFood.join(", ")}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-cds-text-helper">{result.disclaimer}</p>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={items.length === 0}
                  onClick={confirm}
                  className="min-h-11 flex-1 rounded-full bg-cds-interactive px-4 text-sm font-bold text-black transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  Log this meal to {selectedMeal}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="min-h-11 rounded-full bg-white/[0.06] px-4 text-sm font-bold text-white transition hover:bg-white/[0.1]"
                >
                  Start over
                </button>
              </div>
            </div>
          ) : (
            <form
              className="mt-3"
              onSubmit={(event) => {
                event.preventDefault();
                void read();
              }}
            >
              <textarea
                aria-label="What did you eat?"
                className="min-h-20 w-full resize-y rounded-[14px] border border-white/[0.06] bg-black/30 px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-cds-text-helper focus:border-cds-interactive"
                maxLength={500}
                placeholder={EXAMPLE}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <button
                type="submit"
                disabled={isReading || text.trim().length < 2}
                className="mt-2 min-h-11 w-full rounded-full bg-white px-4 text-sm font-bold text-black transition hover:bg-cds-interactive disabled:opacity-50"
              >
                {isReading ? "Reading..." : "Read meal"}
              </button>
            </form>
          )}

          {error ? (
            <p className="mt-3 text-xs font-semibold text-cds-text-secondary" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
