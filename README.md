# CarbUp

CarbUp connects to a user's Strava account and adds today's activity calories on top of their maintenance calories to produce a daily nutrition target.

Live app: [https://carbup.dev](https://carbup.dev)

Core features:

- Landing page at `/` (signed-in visitors go to `/dashboard`)
- Sample dashboard with made-up data at `/sample`
- Dashboard page at `/dashboard`
- Nutrition logging page at `/nutrition`
- Workout history and trends pages at `/workouts` and `/trends`
- User settings page at `/settings`
- Strava OAuth and six-month activity sync
- Encrypted Strava token storage
- Signed app session cookie
- Prisma schema for users, activities, food logs, and saved meals

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment example:

   ```bash
   cp .env.example .env
   ```

3. Create a Postgres database, for example with [Neon](https://neon.com/).

4. Create a Strava API app at [https://www.strava.com/settings/api](https://www.strava.com/settings/api).

5. Set these values in `.env`:

   ```bash
   STRAVA_CLIENT_ID="your_numeric_strava_client_id"
   STRAVA_CLIENT_SECRET="your_strava_client_secret"
   STRAVA_REDIRECT_URI="http://localhost:3000/api/strava/callback"
   APP_URL="http://localhost:3000"
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
   TOKEN_ENCRYPTION_KEY="generate_a_long_random_secret"
   SESSION_SECRET="generate_a_different_long_random_secret"
   USDA_FDC_API_KEY="your_usda_fdc_api_key"   # optional, falls back to DEMO_KEY
   # ANTHROPIC_API_KEY="sk-ant-..."           # optional, turns on "Describe a meal"
   # APP_TIMEZONE="America/Los_Angeles"       # optional, decides day boundaries
   ```

   Strava `STRAVA_CLIENT_ID` must be the numeric Client ID shown in your
   Strava API app. If the placeholder text is left in place, Strava will return
   `client_id invalid`.

   `STRAVA_CLIENT_SECRET` must be the real Client Secret from the same Strava
   app. If it is still a placeholder or copied from a different app, Strava will
   reject the token exchange after login.

   For the deployed app, set the Strava app's Authorization Callback Domain
   to `carbup.dev` (the callback URL is
   `https://carbup.dev/api/strava/callback`).

6. Prepare Prisma for local development:

   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate:dev
   ```

7. Start the app:

   ```bash
   pnpm dev
   ```

8. Open [http://localhost:3000](http://localhost:3000).

## Development

```bash
pnpm test              # unit + integration tests (Vitest)
pnpm test:unit         # lib/ unit tests only, no database
pnpm test:integration  # API routes against a real Postgres
pnpm test:coverage     # both, with a coverage report in coverage/
pnpm test:e2e          # Playwright: sign in, log a meal, dashboard updates
pnpm lint              # ESLint
pnpm exec tsc --noEmit
pnpm build
```

### How the tests run

- **Unit tests** (`lib/**/*.test.ts`) cover the pure nutrition, training-load,
  date and auth helpers. Their `DATABASE_URL` points nowhere, so they can
  never touch a real database.
- **Integration tests** (`tests/integration/`) call every API route handler
  with a real signed session cookie against a real Postgres 17 with the app's
  migrations applied. With no `TEST_DATABASE_URL` set, they start an embedded
  Postgres (the `embedded-postgres` package, no Docker needed) and delete it
  afterwards. They refuse to run against anything but a local or `*test*`
  database, because every test wipes the tables.
- **Outside APIs are mocked with MSW** (`tests/msw/`): Strava, USDA, Open
  Food Facts and the Claude API. A request without a mock fails the test, so tests never reach
  the real network.
- **End-to-end tests** (`tests/e2e/`) start the app on port 3100 with its own
  build folder (`.next-e2e`) and its own embedded Postgres, so they can run
  next to `pnpm dev`. They sign in by setting a session cookie directly
  instead of going through Strava. Locally they use your installed Google
  Chrome; in CI, run `pnpm exec playwright install chromium` first.
- Day boundaries use the app's time zone, so run `TZ=UTC pnpm test` too
  before pushing date logic: CI runs in UTC.

### Continuous integration

Every pull request (and every push to `main`) runs four GitHub Actions jobs
in `.github/workflows/ci.yml`, in parallel:

- **Lint and type check**: ESLint, then `tsc --noEmit` (the only check that
  type-checks test files, since `next build` skips them).
- **Unit and integration tests**: all Vitest tests with coverage, against a
  `postgres:17` service container (`TEST_DATABASE_URL`). The coverage table
  goes in the job summary and the HTML report is uploaded as an artifact.
- **End-to-end tests**: builds the app and runs Playwright against
  `next start` and its own `postgres:17` container. The Playwright report is
  uploaded when a test fails.
- **Production build**: `next build`.

The tests job also scores the meal-parsing eval from recorded outputs
(`pnpm eval:meals`, free). `.github/workflows/ai-eval.yml` runs the same eval
against the real Claude API on pushes to `main` that touch `lib/ai/` or
`evals/`, and on demand; it needs an `ANTHROPIC_API_KEY` repository secret.

Dependabot (`.github/dependabot.yml`) opens weekly grouped updates for npm
packages and GitHub Actions. Major versions are skipped and upgraded by hand on
their own branch, since they usually need code or config changes.

The nutrition and training math lives in pure functions in `lib/` with no
database or React code, so it can be unit tested on its own:

- `lib/nutrition-targets.ts`: daily calorie target, remaining/over, macro split
- `lib/calorie-settings.ts`: maintenance calories and goal adjustments
- `lib/activity-calories.ts`: activity calories (Strava value or MET estimate) and per-day totals
- `lib/workout-metrics.ts`: activity load and effort badges
- `lib/training-load.ts`: fitness, fatigue and form (42-day and 7-day weighted averages)
- `lib/trends.ts`: weekly, monthly and per-sport trend buckets
- `lib/nutrition-portions.ts`: scaling foods to a portion

Pages in `app/` load data with Prisma and pass it through these functions;
components only format the results.

## Describe a meal (AI meal logging)

On `/nutrition`, **Describe a meal** turns one sentence ("2 eggs, toast with
butter and a latte") into foods with amounts. Nothing is saved until the user
reviews the list, fixes any amounts and confirms.

How it works (`app/api/ai/parse-meal/route.ts`, `lib/ai/`):

1. **Parse**: Claude returns the foods as JSON through structured outputs,
   validated with Zod (`lib/ai/meal-parser.ts`), then range-checked: no zero
   or 3 kg portions, at most 20 items. The user's text is treated as data, so
   it can't redirect the prompt.
2. **Match**: each food is looked up in the food catalog (USDA), and the
   catalog's per-100 g numbers are used when they roughly agree with the
   model's estimate (within 2x). Otherwise the estimate is kept and labeled
   (`lib/ai/meal-resolver.ts`).
3. **Guardrails** (`lib/ai/guardrails.ts`, `AiRequest` table): identical
   descriptions are answered from a 30-day cache; each user gets 20 live
   calls an hour and 60 a day; and live calls stop for the month once the
   app-wide spend reaches `AI_MONTHLY_BUDGET_USD` (default $5), priced from
   the token counts the API reports (`lib/ai/pricing.ts`). Every result says
   it's an estimate and not medical or dietary advice.

### The eval

`evals/meals.json` holds 30 cases: 28 meals with reference macros worked out
from USDA and label values, a sentence where a ride must be ignored, and a
prompt-injection attempt that must return no food. A case passes when the
estimated totals are within ±25% on calories and ±35% (or ±5 g) on protein,
carbs and fat; the run fails below an 80% pass rate.

```bash
pnpm eval:meals                   # score the recorded outputs (no API key)
pnpm eval:meals --live            # call the API
pnpm eval:meals --live --record   # call the API and save outputs for CI
```

Changing the prompt or schema means bumping `MEAL_PARSER_VERSION` and
re-recording, or the recorded eval in CI fails.

## Fueling coach

The dashboard's **Fueling coach** card shows the selected day's carb and
protein targets for the training done, and **Explain my day** asks Claude to
put them into words.

- **The math stays in code** (`lib/fueling.ts`). Carbs follow the
  sports-nutrition g/kg bands by training time: rest or under 1 h 3–5,
  1–1.5 h 5–7, 1.5–4 h 6–10, 4 h+ 8–12, one band higher on a very hard short
  day. Protein is 1.6 g/kg. A long or hard ride adds a recovery snack (1 g/kg
  carbs, 0.3 g/kg protein), and rides over an hour get carbs per hour (30–60 g,
  or 60–90 g past 2.5 h). Without a weight in Settings it assumes 70 kg and
  says so.
- **Claude only explains** (`lib/ai/fueling-coach.ts`,
  `app/api/ai/fueling-coach/route.ts`). The server rebuilds the plan from the
  stored rides, food and weight, and sends only those numbers (no ride or food
  names). An answer that quotes any figure the plan doesn't contain is thrown
  away.
- **It always answers.** With no API key, past the rate limit or spend cap, or
  when an answer is rejected, the same numbers come back as plain sentences
  from `templateCoach`. The meal guardrails apply under their own `kind`:
  same-plan cache, 20 live calls an hour and 60 a day, and the shared monthly
  budget.

## Settings

The `/settings` page lets a connected user save:

- Maintenance calories
- Everyday activity level
- Weight
- Units
- Goal type:
  - Maintain saves `0`
  - Lose slow saves `-250`
  - Lose steady saves `-500`
  - Lose fast saves `-750`

Settings are saved in Postgres on the authenticated `User` record.

## Dashboard

The `/dashboard` page shows:

- A 7-day week bar (the page heading) for picking a day, with each day's
  Strava calories and an intensity tag on the same scale as workouts
- Fuel card: calories remaining from
  `maintenanceCalories + activityCalories + goalAdjustment`, plus macros
- Today's meals card: foods logged per meal for the selected day
- Workouts card synced from Strava

Use the Sync Strava button on the dashboard's or the workouts page's workout
list to fetch recent activities. If Strava does not provide calories for an
activity, the list shows a dash (—) and does not invent a calorie number.

## Security notes

- Never commit `.env`.
- The Strava client secret must only be read from server-side routes.
- Strava access and refresh tokens are encrypted before being saved.
- The app session cookie is signed, HTTP-only, and not readable by frontend code.

## GitHub and launch checklist

Before publishing the repository:

- Rotate any Strava client secret that was ever stored in a tracked or shared file.
- Keep `.env` local and commit only `.env.example`.
- Run `pnpm lint` and `pnpm build`.
- Production deploys on Vercel apply migrations automatically (see below).
- Commit `pnpm-lock.yaml` and all Prisma migrations.
- Do not commit local build or data artifacts such as `.next`, `node_modules`, `tmp`, `output`, or `prisma/dev.db`.

For a live deployment, configure these production environment variables:

```bash
DATABASE_URL="..."   # Neon pooled connection string (host ends in -pooler)
DIRECT_URL="..."     # Neon direct connection string, used only for migrations
STRAVA_CLIENT_ID="..."
STRAVA_CLIENT_SECRET="..."
STRAVA_REDIRECT_URI="https://carbup.dev/api/strava/callback"
APP_URL="https://carbup.dev"
TOKEN_ENCRYPTION_KEY="long_random_secret"
SESSION_SECRET="different_long_random_secret"
```

The Prisma datasource is Postgres for production-friendly deployment on hosts such as Vercel. Use a hosted Postgres database such as Neon for the live app.

### Migrations on deploy

Vercel runs `pnpm vercel-build` (`scripts/vercel-build.sh`) instead of
`pnpm build`. On production deploys (`VERCEL_ENV=production`) it runs
`prisma migrate deploy` against `DIRECT_URL` before `next build`, so new code
never goes live against an old schema, and a failed migration fails the
deploy while the current one keeps serving. Preview builds never migrate.
`DIRECT_URL` must be the non-pooled Neon URL: Prisma Migrate's advisory lock
doesn't work through the pooler. Leave Vercel's Build Command setting on its
default, or Vercel won't use `vercel-build`.
