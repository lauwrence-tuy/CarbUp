"use client";

import { useState } from "react";
import type {
  CatalogFood,
  SavedMealIngredient
} from "./nutrition-diary-storage";

/** Draft state for the "Build meal" form. */
export function useMealBuilder() {
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState<SavedMealIngredient[]>([]);

  function addIngredient(food: CatalogFood) {
    setIngredients((current) => [...current, { food, grams: food.baseGrams }]);
  }

  function setIngredientGrams(index: number, grams: number) {
    setIngredients((current) =>
      current.map((ingredient, i) =>
        i === index ? { ...ingredient, grams: Math.max(0, grams) } : ingredient
      )
    );
  }

  function removeIngredient(index: number) {
    setIngredients((current) => current.filter((_, i) => i !== index));
  }

  /**
   * Returns the meal to save (trimmed name, ingredients with grams > 0) and
   * clears the form, or null if the draft isn't complete.
   */
  function takeDraft() {
    const trimmedName = name.trim();
    const kept = ingredients.filter((ingredient) => ingredient.grams > 0);

    if (!trimmedName || kept.length === 0) {
      return null;
    }

    setName("");
    setIngredients([]);

    return { name: trimmedName, ingredients: kept };
  }

  return {
    name,
    setName,
    ingredients,
    addIngredient,
    setIngredientGrams,
    removeIngredient,
    takeDraft
  };
}
