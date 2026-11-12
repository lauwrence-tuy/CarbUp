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
pnpm test        # Vitest unit tests in lib/
pnpm lint        # ESLint
pnpm exec tsc --noEmit
pnpm build
```

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
- Run `pnpm prisma:migrate` against the production database during deployment.
- Commit `pnpm-lock.yaml` and all Prisma migrations.
- Do not commit local build or data artifacts such as `.next`, `node_modules`, `tmp`, `output`, or `prisma/dev.db`.

For a live deployment, configure these production environment variables:

```bash
DATABASE_URL="..."
STRAVA_CLIENT_ID="..."
STRAVA_CLIENT_SECRET="..."
STRAVA_REDIRECT_URI="https://carbup.dev/api/strava/callback"
APP_URL="https://carbup.dev"
TOKEN_ENCRYPTION_KEY="long_random_secret"
SESSION_SECRET="different_long_random_secret"
```

The Prisma datasource is Postgres for production-friendly deployment on hosts such as Vercel. Use a hosted Postgres database such as Neon for the live app.
