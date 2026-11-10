# Changelog

All notable changes to CarbUp are recorded here. Versioning is
[semver](https://semver.org/); the app is pre-1.0, so minor versions carry
feature work.

## [0.3.0] — The redesign

### Changed
- Every page rebuilt on IBM Carbon React components (`@carbon/react`,
  `@carbon/styles`, `@carbon/icons-react`), re-skinned to the CarbUp look in
  `app/carbon.scss`: black background, rounded `#17181c` cards, bold type,
  yellow pill buttons. Tailwind stays for layout, mapped to the theme's CSS
  custom properties (`cds-*` colours).
- Shared page frame (`components/carbon/page-shell.tsx`: `PageShell`,
  `PageTitle`, `StatTile`, `PillGroup`) and header
  (`components/carbon/carbon-header.tsx`) with a phone menu.
- Landing page (`/`) is a marketing page: hero with a "today" panel, features,
  dashboard preview, how it works, FAQ. Signed-in visitors are redirected to
  `/dashboard`.
- Dashboard: full-width `WeekBar` (`components/carbon/week-bar.tsx`) is the
  page heading; Fuel card (remaining, eaten, base + rides = target, macros);
  new Today's meals card (foods per meal, from `mealsByDate`); Workouts with
  time and distance. Day intensity tag uses `getEffortBadge` on the day's
  total load (was a separate weekly scale).
- Nutrition: the same `WeekBar` with kcal eaten per day and week paging
  (stops at the current week; replaces `DaySpreadWidget`, which re-centred on
  every click and showed future days). Portion panel moved into a Selected
  food card above the diary; Create a food and Scan a barcode on one row.
- Macro bars: carbs yellow, protein blue, fat purple.
- Workouts: Carbon Search, pill date-range and type filters, structured list
  with intensity tags. Workout detail, Trends, Settings, the five Settings info
  pages, 404 and error pages moved to the shared frame.
- Trends cards in equal-height paired rows; "Monthly load" renamed "Load by
  period" (its buckets are about two weeks).
- Settings: one-column flow with an "Account & integrations" card replacing
  the sidebar and the separate Integrations card.
- The app's address is now `carbup.dev` (`metadataBase` in `app/layout.tsx`,
  README, `.env.example`); `carb-up-lilac.vercel.app` redirects there.
- Faster pages: each page loads only the rows and columns it shows
  (Dashboard: the week's activities and food logs; Nutrition: the last 12
  weeks, which is now how far week paging goes; Trends/Workouts: only the
  columns they use, no tokens). Date formatters in `lib/date.ts` are created
  once instead of on every call.
- Strava sync is incremental: after the first 183-day import it fetches from
  7 days before the newest stored activity, and writes only new activities
  (one `createMany`) and changed ones, instead of re-upserting every row.
- Workout detail renders its stats immediately and streams the route map and
  charts (`Suspense` + `use`). Route and streams are thinned and rounded on
  the server (the page was ~5 MB of HTML, now ~330 KB) and cached per
  activity for 30 days (`lib/activity-visual-cache.ts`, `unstable_cache`).

### Added
- Loading screens (`loading.tsx`) for Dashboard, Nutrition, Workouts, Trends,
  workout detail and Settings, built from `components/carbon/skeleton.tsx`
  and `components/carbon/page-skeletons.tsx`.
- `/sample`: full dashboard with sample data anchored on the current date
  (`lib/sample-day.ts`); sample meals sum to the sample's eaten calories.
- `lib/dashboard-types.ts` (`Workout`, `CalendarDay`, `MealEntry`,
  `MealsByDate`).

### Fixed
- Nutrition: weeks more than about 30 activities back lost their ride
  calories (the page only loaded the 30 most recent activities).
- Settings: React 19 resets the form after a server action, snapping the goal
  radios back to the page-load value, so a second Save stored the old goal.
  The goal is now submitted through a hidden input.
- Header and Settings "Connect Strava" used `next/link` to `/api/strava/auth`;
  the client fetch plus fallback navigation hit the route twice and could
  mismatch the OAuth state ("login session expired"). Now plain links.
- Trends hydration error: the chart dot `<title>` had several text children.
- Fitness & Freshness hover tooltip and activity dots were distorted by the
  stretched SVG (`preserveAspectRatio="none"`); both are now HTML overlays.
- Nutrition: duplicate React keys when a food lists the same serving twice;
  the portion dropdown now shows each serving once.
- Old landing page: hardcoded "Friday 19" date, exercise calories that
  disagreed with the workouts total, and a stretched empty card.
- Carbon's reset set `border-style: none`, hiding every Tailwind border
  utility; `app/globals.css` restores the solid style.
- Accessibility: names for the Settings dropdown buttons, keyboard-focusable
  chart activity dots, visible focus outlines on custom controls.

### Removed
- Unused components: old app header, old dashboard and its cards, metric card,
  status badge, floating action button, old Sync button, `DaySpreadWidget`.
- Unused Tailwind palettes (ember, pine, ink, old greys, shadows) and old CSS
  variables. Carbon packages' install scripts (IBM telemetry) are blocked in
  `pnpm-workspace.yaml`.

## [0.2.2] — Consistency and cleanup

### Changed
- Training load uses Strava's suffer score (Relative Effort) when present on
  every page, not just Trends; effort numbers and badges on the Dashboard,
  Workouts, and workout detail pages can change for those workouts.
- Shared navigation header (`components/app-header.tsx`) on every page; the
  nav is labelled "Main navigation" and marks the current page with
  `aria-current`.
- The saved-meal delete button is labelled "Delete saved meal …".
- Nutrition API routes validate request bodies with zod and return 400 with
  the failing fields instead of a 500 or storing coerced zeros.
- Internal: shared helpers in `lib/`, nutrition and trends pages split into
  components and hooks, components grouped by feature, theme colors instead
  of hardcoded hex values, unused components and images removed.

### Fixed
- `formatDuration` showed 59m59s as "60 min" and 1h59m59s as "1h 60m".

### Added
- Vitest unit tests (`pnpm test`), run in CI.

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
