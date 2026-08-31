# Changelog

All notable changes to CarbUp are recorded here. Versioning is
[semver](https://semver.org/); the app is pre-1.0, so minor versions carry
feature work.

## [0.2.1] — Strava calorie sync fix

### Fixed
- Activity sync fired an unthrottled detail request for every activity in the
  183-day window, exhausting Strava's shared 100-request/15-minute read limit.
  The resulting 429s fell back to the activity summary (which carries no
  `calories`), and the upsert then overwrote previously-synced calorie values
  with `null`. Sync now skips the detail call when calories are already stored,
  spaces the remaining detail batches out, stops calling the detail endpoint on
  a 429 or as usage nears the limit, and never overwrites a stored
  `calories` / `sufferScore` with `null`.

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

## [0.1.1] — Dashboard target fix

### Fixed
- The dashboard showed `Target: 0` and empty `0g / 0g` macro bars for anyone
  without a saved maintenance-calorie value; it now falls back to 2,400 kcal
  until weight/goal are set, matching the nutrition page.

### Changed
- Target fallback and the macro split (18/52/30 P/C/F) moved to
  `lib/nutrition-targets.ts` so the dashboard and nutrition page share one
  implementation.

## [0.1.0] — Initial release

- Strava OAuth connection and ride-calorie import.
- Daily calorie and macro targets from base TDEE, weight, units, and goal mode.
- Food diary with meals and saved meals.
