"use client";

import { useEffect, useState } from "react";
import type { CatalogFood } from "@/components/dashboard/nutrition-diary-storage";

const SEARCH_DEBOUNCE_MS = 300;
const MIN_SEARCH_LENGTH = 2;

/** Debounced food search against /api/nutrition/foods/search. */
export function useFoodSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogFood[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedQuery = query.trim();
  const isActive = trimmedQuery.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    if (trimmedQuery.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setIsSearching(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const timer = setTimeout(() => {
      fetch(`/api/nutrition/foods/search?q=${encodeURIComponent(trimmedQuery)}`, {
        signal: controller.signal
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
          }

          return response.json() as Promise<{ foods: CatalogFood[] }>;
        })
        .then((data) => {
          setResults(data.foods ?? []);
          setError(null);
          setIsSearching(false);
        })
        .catch(() => {
          if (controller.signal.aborted) {
            return;
          }

          setResults([]);
          setError("Couldn't load foods. Check your connection and retry.");
          setIsSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmedQuery]);

  return {
    query,
    setQuery,
    trimmedQuery,
    isActive,
    results,
    isSearching,
    error,
    noMatches: isActive && !isSearching && !error && results.length === 0
  };
}
