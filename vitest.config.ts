import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url))
    }
  },
  test: {
    environment: "node",
    // Fixed test secrets. DATABASE_URL points nowhere so a unit test can never
    // reach a real database (Prisma would otherwise fall back to .env); the
    // integration project replaces it with its own test database.
    env: {
      DATABASE_URL: "postgresql://unit-tests-have-no-database@127.0.0.1:1/none",
      SESSION_SECRET: "test-session-secret",
      TOKEN_ENCRYPTION_KEY: "test-token-encryption-key",
      STRAVA_CLIENT_ID: "123456",
      STRAVA_CLIENT_SECRET: "test-strava-client-secret",
      STRAVA_REDIRECT_URI: "http://localhost:3000/api/strava/callback",
      APP_URL: "http://localhost:3000",
      USDA_FDC_API_KEY: "test-usda-key"
    },
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/**/*.test.ts", "lib/dashboard-types.ts", "lib/food-sources/types.ts"],
      reporter: ["text", "text-summary", "html", "json-summary"],
      reportsDirectory: "coverage"
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["lib/**/*.test.ts"]
        }
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/integration/global-setup.ts"],
          setupFiles: ["tests/integration/setup-env.ts", "tests/integration/setup.ts"],
          // One shared database, reset before each test: run files one at a
          // time, in a single process (project-level fileParallelism is ignored).
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 20_000,
          hookTimeout: 120_000
        }
      }
    ]
  }
});
