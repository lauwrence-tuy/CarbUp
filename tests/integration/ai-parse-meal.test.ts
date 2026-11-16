import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { POST as parseMeal } from "@/app/api/ai/parse-meal/route";
import { RATE_LIMITS } from "@/lib/ai/guardrails";
import { mealCacheKey } from "@/lib/ai/meal-parser";
import { prisma } from "@/lib/prisma";
import { server } from "@/tests/msw/server";
import {
  ANTHROPIC_MESSAGES,
  OFF_SEARCH,
  USDA_SEARCH,
  anthropicMessage
} from "@/tests/msw/fixtures";
import { createCatalogFood, createUser, request, signInAs } from "./helpers/factories";

const breakfast = {
  title: "Oats and coffee",
  mealHint: "Breakfast",
  items: [
    {
      name: "a bowl of oats",
      searchTerm: "rolled oats",
      quantity: "80 g dry",
      grams: 80,
      calories: 300,
      protein: 11,
      carbs: 53,
      fat: 5
    },
    {
      name: "black coffee",
      searchTerm: "zzcoffee brewed",
      quantity: "1 cup",
      grams: 240,
      calories: 2,
      protein: 0.3,
      carbs: 0,
      fat: 0
    }
  ],
  notFood: []
};

type SentBody = Record<string, unknown> & { output_config: { effort: string; format: { type: string } } };

/** Answers every Messages call with `output` and records what was sent. */
function mockClaude(output: unknown, overrides: Parameters<typeof anthropicMessage>[1] = {}) {
  const calls: { body: SentBody; headers: Headers }[] = [];

  server.use(
    http.post(ANTHROPIC_MESSAGES, async ({ request: sent }) => {
      calls.push({ body: (await sent.json()) as SentBody, headers: sent.headers });
      return HttpResponse.json(anthropicMessage(output, overrides));
    }),
    http.get(USDA_SEARCH, () => HttpResponse.json({ foods: [] })),
    http.get(OFF_SEARCH, () => HttpResponse.json({ products: [] }))
  );

  return calls;
}

const describeMeal = (text: unknown) =>
  parseMeal(request("/api/ai/parse-meal", { method: "POST", body: { text } }));

async function signIn() {
  const user = await createUser();
  signInAs(user.id);
  return user;
}

const savedKey = process.env.ANTHROPIC_API_KEY;
const savedBudget = process.env.AI_MONTHLY_BUDGET_USD;

afterEach(() => {
  process.env.ANTHROPIC_API_KEY = savedKey;
  process.env.AI_MONTHLY_BUDGET_USD = savedBudget;
});

describe("POST /api/ai/parse-meal", () => {
  it("requires a session", async () => {
    expect((await describeMeal("oats")).status).toBe(401);
  });

  it("is off when no API key is configured", async () => {
    await signIn();
    process.env.ANTHROPIC_API_KEY = "";

    expect((await describeMeal("oats")).status).toBe(503);
  });

  it.each([[""], ["x"], ["a".repeat(501)], [42]])("rejects text %#", async (text) => {
    await signIn();

    expect((await describeMeal(text)).status).toBe(400);
  });

  it("parses a sentence, matches the catalog and records the cost", async () => {
    const user = await signIn();
    await createCatalogFood({ name: "Rolled oats" });
    const calls = mockClaude(breakfast, { input_tokens: 1000, output_tokens: 500 });

    const response = await describeMeal("A bowl of oats and a black coffee for breakfast");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      title: "Oats and coffee",
      mealHint: "Breakfast",
      cached: false,
      totals: { calories: 313, protein: 14, carbs: 53, fat: 6 }
    });
    expect(body.disclaimer).toMatch(/Not medical/);
    expect(body.items[0]).toMatchObject({ source: "catalog", match: { name: "Rolled oats" }, calories: 311 });
    expect(body.items[1]).toMatchObject({ source: "estimate", match: null, calories: 2 });

    // What went to the API: structured output, low effort, refusal fallbacks.
    expect(calls).toHaveLength(1);
    expect(calls[0].body.model).toBe("claude-opus-5-5");
    expect(calls[0].body.output_config.effort).toBe("low");
    expect(calls[0].body.output_config.format.type).toBe("json_schema");
    expect(calls[0].body.fallbacks).toBe("default");
    expect(calls[0].headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");

    const [row] = await prisma.aiRequest.findMany({ where: { userId: user.id } });
    expect(row).toMatchObject({ kind: "meal-parse", cached: false, inputTokens: 1000, outputTokens: 500, costMicroUsd: 14_000 });
  });

  it("answers a repeated description from the cache, for free", async () => {
    await signIn();
    const calls = mockClaude(breakfast);

    await describeMeal("oats and coffee");
    const second = await (await describeMeal("  Oats AND coffee ")).json();

    expect(calls).toHaveLength(1);
    expect(second.cached).toBe(true);
    expect(await prisma.aiRequest.count({ where: { cached: true, costMicroUsd: 0 } })).toBe(1);
  });

  it("limits live calls per user per hour, but still serves cache hits", async () => {
    const user = await signIn();
    const calls = mockClaude(breakfast);
    const hourly = RATE_LIMITS[0].max;

    await prisma.aiRequest.create({
      data: { userId: user.id, kind: "meal-parse", inputHash: mealCacheKey("claude-opus-5-5", "cached meal"), model: "claude-opus-5-5", outputJson: JSON.stringify(breakfast) }
    });
    await prisma.aiRequest.createMany({
      data: Array.from({ length: hourly - 1 }, (_, i) => ({
        userId: user.id,
        kind: "meal-parse",
        inputHash: `h${i}`,
        model: "claude-opus-5-5",
        outputJson: "{}"
      }))
    });

    const limited = await describeMeal("something new");
    expect(limited.status).toBe(429);
    expect((await limited.json()).error).toMatch(/per hour/);
    expect((await describeMeal("cached meal")).status).toBe(200);
    expect(calls).toHaveLength(0);
  });

  it("pauses live calls once the monthly budget is spent", async () => {
    const user = await signIn();
    const calls = mockClaude(breakfast);
    process.env.AI_MONTHLY_BUDGET_USD = "0.01";
    await prisma.aiRequest.create({
      data: { userId: user.id, kind: "meal-parse", inputHash: "x", model: "m", outputJson: "{}", costMicroUsd: 10_000 }
    });

    const response = await describeMeal("oats");

    expect(response.status).toBe(503);
    expect((await response.json()).error).toMatch(/paused until next month/);
    expect(calls).toHaveLength(0);
  });

  it("explains when the text has no food", async () => {
    await signIn();
    mockClaude({ title: "", mealHint: null, items: [], notFood: ["rode 40 km"] });

    const response = await describeMeal("rode 40 km today");

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ reason: "no-food" });
    expect(await prisma.aiRequest.count()).toBe(0);
  });

  it("handles a refusal", async () => {
    await signIn();
    mockClaude(breakfast, { stop_reason: "refusal" });

    const response = await describeMeal("oats");

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ reason: "refused" });
  });

  it("returns 502 when the API rejects the call", async () => {
    await signIn();
    server.use(
      http.post(ANTHROPIC_MESSAGES, () =>
        HttpResponse.json(
          { type: "error", error: { type: "invalid_request_error", message: "bad" } },
          { status: 400 }
        )
      )
    );

    expect((await describeMeal("oats")).status).toBe(502);
  });
});
