import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { listenForRequests, server } from "@/tests/msw/server";
import { assertDisposable } from "./helpers/disposable-db";
import { cookieJar } from "./helpers/next-headers";

// Route handlers run outside Next.js here: cookies come from a test jar and
// cache revalidation is recorded instead of performed.
vi.mock("next/headers", () => import("./helpers/next-headers"));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn
}));

beforeAll(async () => {
  // Every test wipes the tables: prove Prisma is really on the test database.
  const [{ db }] = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
  assertDisposable(process.env.DATABASE_URL!);
  if (db !== new URL(process.env.DATABASE_URL!).pathname.slice(1)) {
    throw new Error(`Prisma is connected to "${db}", not the test database.`);
  }
  listenForRequests();
});

beforeEach(async () => {
  cookieJar.clear();
  await prisma.$executeRawUnsafe(
    'TRUNCATE "User", "Activity", "FoodLog", "Food", "FoodServing", "SavedMeal" CASCADE'
  );
});

afterEach(() => {
  server.resetHandlers();
  vi.useRealTimers();
});

afterAll(async () => {
  server.close();
  await prisma.$disconnect();
});
