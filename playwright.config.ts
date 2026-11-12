import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL } from "./tests/e2e/env";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: E2E_BASE_URL,
    // The app's day boundaries are Pacific; match them in the browser.
    timezoneId: "America/Los_Angeles",
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      // Locally, use the installed Google Chrome; CI installs Playwright's Chromium.
      use: { ...devices["Desktop Chrome"], channel: process.env.CI ? undefined : "chrome" }
    }
  ],
  webServer: {
    command: "pnpm exec tsx tests/e2e/server.ts",
    url: E2E_BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "ignore"
  }
});
