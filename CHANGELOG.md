# Changelog

All notable changes to CarbUp are recorded here. Versioning is
[semver](https://semver.org/); the app is pre-1.0, so minor versions carry
feature work.

## [0.2.0] — Food database

### Added
- **Food catalog + search.** The nutrition page searches a real catalog
  instead of a hardcoded list. A local `Food` / `FoodServing` store is seeded
  with ~7,800 USDA generic foods (`pnpm seed:foods`); branded items are fetched
  from USDA FoodData Central and Open Food Facts on a cache miss and written
  back locally (`GET /api/nutrition/foods/search`).
- **Serving picker.** Named servings ("1 cup (240 g)", "100 g", …) plus a
  manual gram amount when adding a food.
- **Recent / Frequent / Mine tabs.** Browse recently and most-often logged
  foods before searching; `Food.usageCount` feeds search ranking.
- **Barcode scanning.** `BarcodeScanner` component (native `BarcodeDetector`
  with a manual-entry fallback) → `GET /api/nutrition/foods/barcode` → Open
  Food Facts lookup with cache-through.
- **Custom foods.** Create / edit / delete your own foods with per-serving
  macros (`/api/nutrition/foods`, `source: "custom"`).
- **Trigram fuzzy search.** `pg_trgm` extension + GIN index on `Food.name`;
  typo-tolerant retrieval via `word_similarity`.

### Changed
- `FoodLog` macro columns widened from `Int` to `Float`.
- Static `food-calorie-library.ts` removed.

### Database
- Migrations `20260826000000_add_food_catalog` and
  `20260827000000_food_name_trgm`.

## [0.1.0] — Initial release

- Strava OAuth connection and ride-calorie import.
- Daily calorie and macro targets from base TDEE, weight, units, and goal mode.
- Food diary with meals and saved meals.
