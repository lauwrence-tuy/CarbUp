"use client";

import { useState } from "react";
import { Pencil, Plus, X } from "lucide-react";
import type { CatalogFood } from "./nutrition-diary-storage";

type CustomFoodFormProps = {
  onSaved: (food: CatalogFood) => void;
  /** When set, the form edits this food instead of creating a new one. */
  editing?: CatalogFood | null;
  onCancelEdit?: () => void;
};

type Fields = {
  name: string;
  brand: string;
  servingLabel: string;
  servingGrams: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
};

const EMPTY: Fields = {
  name: "",
  brand: "",
  servingLabel: "1 serving",
  servingGrams: "100",
  calories: "",
  protein: "",
  carbs: "",
  fat: ""
};

function fieldsFromFood(food: CatalogFood): Fields {
  const grams = food.baseGrams > 0 ? food.baseGrams : 100;
  const factor = grams / 100;

  return {
    name: food.name,
    brand: food.brand === "Custom food" ? "" : food.brand,
    servingLabel: food.serving || "1 serving",
    servingGrams: String(grams),
    calories: String(Math.round(food.per100g.calories * factor)),
    protein: String(Math.round(food.per100g.protein * factor)),
    carbs: String(Math.round(food.per100g.carbs * factor)),
    fat: String(Math.round(food.per100g.fat * factor))
  };
}

/**
 * The parent gives this a `key` of the editing food's id (or "new"), so the
 * component remounts when the edit target changes and state initialises cleanly.
 */
export function CustomFoodForm({
  onSaved,
  editing,
  onCancelEdit
}: CustomFoodFormProps) {
  const isEditing = Boolean(editing);
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<Fields>(
    editing ? fieldsFromFood(editing) : EMPTY
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expanded = open || isEditing;

  function set<K extends keyof Fields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
  }

  function close() {
    setOpen(false);
    setFields(EMPTY);
    setError(null);
    onCancelEdit?.();
  }

  async function submit() {
    const grams = Number(fields.servingGrams);
    const num = (value: string) => Number(value);
    const values = [
      num(fields.calories),
      num(fields.protein),
      num(fields.carbs),
      num(fields.fat)
    ];

    if (
      !fields.name.trim() ||
      !Number.isFinite(grams) ||
      grams <= 0 ||
      values.some((value) => !Number.isFinite(value) || value < 0)
    ) {
      setError("Fill in a name, a serving size in grams, and non-negative macros.");
      return;
    }

    const per100 = (value: number) => (value / grams) * 100;
    const payload = {
      id: editing?.id,
      name: fields.name.trim(),
      brand: fields.brand.trim() || undefined,
      defaultServingGrams: grams,
      defaultServingLabel: fields.servingLabel.trim() || `${grams} g`,
      caloriesPer100g: per100(num(fields.calories)),
      proteinPer100g: per100(num(fields.protein)),
      carbsPer100g: per100(num(fields.carbs)),
      fatPer100g: per100(num(fields.fat))
    };

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/nutrition/foods", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(String(response.status));
      }

      const data = (await response.json()) as { food: CatalogFood | null };

      if (data.food) {
        onSaved(data.food);
      }

      close();
    } catch {
      setError("Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-black/28 px-4 text-xs font-bold text-app-secondary transition hover:bg-app-green/10 hover:text-app-green"
      >
        <Plus className="size-4" aria-hidden="true" />
        Create a food
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-[20px] bg-black/24 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-app-secondary">
          {isEditing ? (
            <Pencil className="size-4" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          {isEditing ? "Edit food" : "New food"}
        </p>
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          className="flex size-8 items-center justify-center rounded-full bg-white/[0.06] text-app-muted transition hover:text-white"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <form
        className="mt-3 space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <Field label="Name">
          <input
            className={inputClass}
            value={fields.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder="e.g. Homemade granola"
          />
        </Field>
        <Field label="Brand (optional)">
          <input
            className={inputClass}
            value={fields.brand}
            onChange={(event) => set("brand", event.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Serving label">
            <input
              className={inputClass}
              value={fields.servingLabel}
              onChange={(event) => set("servingLabel", event.target.value)}
            />
          </Field>
          <Field label="Serving grams">
            <input
              className={inputClass}
              inputMode="numeric"
              value={fields.servingGrams}
              onChange={(event) => set("servingGrams", event.target.value)}
            />
          </Field>
        </div>

        <p className="pt-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-app-muted">
          Per serving
        </p>
        <div className="grid grid-cols-4 gap-2">
          <Field label="Kcal">
            <input
              className={inputClass}
              inputMode="numeric"
              value={fields.calories}
              onChange={(event) => set("calories", event.target.value)}
            />
          </Field>
          <Field label="Protein">
            <input
              className={inputClass}
              inputMode="numeric"
              value={fields.protein}
              onChange={(event) => set("protein", event.target.value)}
            />
          </Field>
          <Field label="Carbs">
            <input
              className={inputClass}
              inputMode="numeric"
              value={fields.carbs}
              onChange={(event) => set("carbs", event.target.value)}
            />
          </Field>
          <Field label="Fat">
            <input
              className={inputClass}
              inputMode="numeric"
              value={fields.fat}
              onChange={(event) => set("fat", event.target.value)}
            />
          </Field>
        </div>

        {error ? (
          <p className="text-xs font-semibold text-app-red">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-app-green px-4 text-sm font-bold text-black transition hover:-translate-y-0.5 disabled:opacity-50"
        >
          {isEditing ? "Save changes" : "Create food"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "min-h-10 w-full rounded-2xl border border-white/[0.06] bg-black/28 px-3 text-sm font-semibold text-white outline-none placeholder:text-app-muted focus:border-app-green/60";

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-[0.12em] text-app-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
