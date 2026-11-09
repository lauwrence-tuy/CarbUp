"use client";

import { useState } from "react";
import type {
  SavedMeal,
  SavedMealIngredient
} from "./nutrition-diary-storage";
import { getMealGramsInput } from "@/lib/nutrition-portions";
import { deleteSavedMeal, saveMeal } from "./nutrition-api";

/** Saved meals plus which one is selected and how many grams to log. */
export function useSavedMeals(initialSavedMeals: SavedMeal[]) {
  const [savedMeals, setSavedMeals] = useState(initialSavedMeals);
  const [selectedId, setSelectedId] = useState(initialSavedMeals[0]?.id ?? "");
  const [gramsInput, setGramsInput] = useState(getMealGramsInput(initialSavedMeals[0]));

  const selectedMeal = savedMeals.find((meal) => meal.id === selectedId);

  function select(meal: SavedMeal | undefined) {
    setSelectedId(meal?.id ?? "");
    setGramsInput(getMealGramsInput(meal));
  }

  function selectById(mealId: string) {
    select(savedMeals.find((meal) => meal.id === mealId));
  }

  /** Replace the whole list (used by the localStorage migration). */
  function replaceAll(meals: SavedMeal[]) {
    setSavedMeals(meals);
    select(meals[0]);
  }

  async function create(name: string, ingredients: SavedMealIngredient[]) {
    const temporaryId = `meal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const previousFirstId = savedMeals[0]?.id ?? "";

    setSavedMeals((current) => [{ id: temporaryId, name, ingredients }, ...current]);
    select({ id: temporaryId, name, ingredients });

    try {
      const persisted = await saveMeal(name, ingredients);

      setSavedMeals((current) =>
        current.map((meal) =>
          meal.id === temporaryId ? { ...meal, id: persisted.id } : meal
        )
      );
      setSelectedId(persisted.id);
    } catch {
      setSavedMeals((current) => current.filter((meal) => meal.id !== temporaryId));
      setSelectedId(previousFirstId);
    }
  }

  function remove(mealId: string) {
    const remaining = savedMeals.filter((meal) => meal.id !== mealId);

    setSavedMeals(remaining);

    if (selectedId === mealId) {
      select(remaining[0]);
    }

    deleteSavedMeal(mealId);
  }

  return {
    savedMeals,
    selectedMeal,
    gramsInput,
    setGramsInput,
    selectById,
    replaceAll,
    create,
    remove
  };
}
