import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";
import { encryptToken } from "@/lib/token-crypto";
import { cookieJar } from "./next-headers";

let stravaIdCounter = 1000;

/** A connected user with encrypted Strava tokens that are still fresh. */
export function createUser(overrides: Partial<Prisma.UserCreateInput> = {}) {
  stravaIdCounter += 1;

  return prisma.user.create({
    data: {
      stravaId: String(stravaIdCounter),
      accessToken: encryptToken("stored-access-token"),
      refreshToken: encryptToken("stored-refresh-token"),
      tokenExpiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
      ...overrides
    }
  });
}

/** Puts a valid session cookie for this user in the request cookie jar. */
export function signInAs(userId: string) {
  cookieJar.set(SESSION_COOKIE_NAME, createSessionToken(userId));
}

export function request(path: string, init: { method?: string; body?: unknown } = {}) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: init.method ?? "GET",
    headers: init.body === undefined ? undefined : { "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body)
  });
}

export function createCatalogFood(overrides: Partial<Prisma.FoodCreateInput> = {}) {
  return prisma.food.create({
    data: {
      source: "seed",
      name: "Rolled oats",
      caloriesPer100g: 389,
      proteinPer100g: 16.9,
      carbsPer100g: 66.3,
      fatPer100g: 6.9,
      verified: true,
      servings: { create: [{ label: "100 g", grams: 100, isDefault: true }] },
      ...overrides
    }
  });
}
