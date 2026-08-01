# CarbUp

CarbUp connects to a user's Strava account and adds today's activity calories on top of their maintenance calories to produce a daily nutrition target.

Current slices:

- Landing page at `/`
- Strava OAuth start route at `/api/strava/auth`
- Strava OAuth callback route at `/api/strava/callback`
- Strava activity sync route at `/api/strava/sync`
- Dashboard page at `/dashboard`
- User settings page at `/settings`
- Encrypted Strava token storage
- Signed app session cookie
- Prisma schema for `User` and `Activity`
- Local development setup files

## Local setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment example:

   ```bash
   cp .env.example .env
   ```

3. Create a Strava API app at [https://www.strava.com/settings/api](https://www.strava.com/settings/api).

4. Set these values in `.env`:

   ```bash
   STRAVA_CLIENT_ID="your_numeric_strava_client_id"
   STRAVA_CLIENT_SECRET="your_strava_client_secret"
   STRAVA_REDIRECT_URI="http://localhost:3000/api/strava/callback"
   APP_URL="http://localhost:3000"
   DATABASE_URL="file:./dev.db"
   TOKEN_ENCRYPTION_KEY="generate_a_long_random_secret"
   SESSION_SECRET="generate_a_different_long_random_secret"
   ```

   Strava `STRAVA_CLIENT_ID` must be the numeric Client ID shown in your
   Strava API app. If the placeholder text is left in place, Strava will return
   `client_id invalid`.

   `STRAVA_CLIENT_SECRET` must be the real Client Secret from the same Strava
   app. If it is still a placeholder or copied from a different app, Strava will
   reject the token exchange after login.

5. Prepare Prisma:

   ```bash
   pnpm prisma:generate
   pnpm prisma:migrate --name init
   ```

6. Start the app:

   ```bash
   pnpm dev
   ```

7. Open [http://localhost:3000](http://localhost:3000).

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

Settings are saved locally in SQLite on the authenticated `User` record.

## Dashboard

The `/dashboard` page shows:

- Calories card using `maintenanceCalories + activityCalories + goalAdjustment`
- Calendar card
- Workouts card synced from Strava
- Training load indicator card

Use the Sync Strava button on the workouts card to fetch recent activities. If
Strava does not provide calories for an activity, the dashboard shows
`Calories unavailable` and does not invent a calorie number.

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
- Commit `pnpm-lock.yaml` and all Prisma migrations.
- Do not commit local build or data artifacts such as `.next`, `node_modules`, `tmp`, `output`, or `prisma/dev.db`.

For a live deployment, configure these production environment variables:

```bash
DATABASE_URL="..."
STRAVA_CLIENT_ID="..."
STRAVA_CLIENT_SECRET="..."
STRAVA_REDIRECT_URI="https://your-domain.example/api/strava/callback"
APP_URL="https://your-domain.example"
TOKEN_ENCRYPTION_KEY="long_random_secret"
SESSION_SECRET="different_long_random_secret"
```

The current Prisma datasource is SQLite, which is good for local development. For production, either deploy on infrastructure with a persistent disk for SQLite or migrate the Prisma datasource to a hosted database such as Postgres before deploying to a serverless host.
