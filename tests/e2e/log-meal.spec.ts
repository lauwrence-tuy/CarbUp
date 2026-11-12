import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { getLocalDateKey } from "../../lib/date";
import { createSessionToken, SESSION_COOKIE_NAME } from "../../lib/session";
import { encryptToken } from "../../lib/token-crypto";
import { E2E_BASE_URL, E2E_DATABASE_URL, E2E_ENV } from "./env";

// Sign the cookie and tokens with the same secrets the e2e server uses (both
// helpers read them when called, not on import).
process.env.SESSION_SECRET = E2E_ENV.SESSION_SECRET;
process.env.TOKEN_ENCRYPTION_KEY = E2E_ENV.TOKEN_ENCRYPTION_KEY;

const prisma = new PrismaClient({ datasourceUrl: E2E_DATABASE_URL });
const FOOD = "E2E Overnight Oats";

test.beforeEach(async ({ context }) => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "User", "Activity", "FoodLog", "Food", "FoodServing", "SavedMeal" CASCADE'
  );

  const user = await prisma.user.create({
    data: {
      stravaId: "e2e-athlete",
      accessToken: encryptToken("unused"),
      refreshToken: encryptToken("unused"),
      tokenExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      maintenanceCalories: 2000,
      goalAdjustment: 0
    }
  });

  // Logged yesterday, so it shows up under Recent foods today.
  await prisma.foodLog.create({
    data: {
      userId: user.id,
      dateKey: getLocalDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      meal: "Breakfast",
      name: FOOD,
      serving: "1 jar (250 g)",
      baseGrams: 250,
      grams: 250,
      calories: 350,
      protein: 14,
      carbs: 52,
      fat: 9
    }
  });

  // "Mocked login": the same signed session cookie the Strava callback sets.
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: createSessionToken(user.id),
      url: E2E_BASE_URL,
      httpOnly: true,
      sameSite: "Lax"
    }
  ]);
});

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("logging a meal on Nutrition updates the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("0 of 2,000 kcal")).toBeVisible();

  await page.goto("/nutrition");
  const saved = page.waitForResponse(
    (response) => response.url().endsWith("/api/nutrition/logs") && response.request().method() === "POST"
  );
  await page.getByRole("button", { name: `Add ${FOOD} to Breakfast` }).click();
  expect((await saved).status()).toBe(200);

  await page.goto("/dashboard");
  await expect(page.getByText("350 of 2,000 kcal")).toBeVisible();
  await expect(page.getByText("1,650", { exact: true })).toBeVisible();
  await expect(page.getByText(FOOD)).toBeVisible();
});

test("a visitor without a session is asked to connect Strava", async ({ page, context }) => {
  await context.clearCookies();

  await page.goto("/dashboard");

  await expect(page.getByRole("link", { name: /connect strava/i }).first()).toBeVisible();
});
