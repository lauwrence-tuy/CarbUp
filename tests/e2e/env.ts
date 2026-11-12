/** Settings shared by the e2e server and the Playwright tests. */
export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_DB_PORT = Number(process.env.E2E_DB_PORT ?? 54329);
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? `postgresql://postgres:postgres@127.0.0.1:${E2E_DB_PORT}/carbup_e2e`;

export const E2E_ENV = {
  DATABASE_URL: E2E_DATABASE_URL,
  SESSION_SECRET: "e2e-session-secret",
  TOKEN_ENCRYPTION_KEY: "e2e-token-encryption-key",
  STRAVA_CLIENT_ID: "123456",
  STRAVA_CLIENT_SECRET: "e2e-strava-client-secret",
  STRAVA_REDIRECT_URI: `${E2E_BASE_URL}/api/strava/callback`,
  APP_URL: E2E_BASE_URL,
  APP_TIMEZONE: "America/Los_Angeles"
};
