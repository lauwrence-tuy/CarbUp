import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { POST as askCoach } from "@/app/api/ai/fueling-coach/route";
import { RATE_LIMITS } from "@/lib/ai/guardrails";
import { getLocalDateKey } from "@/lib/date";
import { prisma } from "@/lib/prisma";
import { server } from "@/tests/msw/server";
import { ANTHROPIC_MESSAGES, anthropicMessage } from "@/tests/msw/fixtures";
import { createUser, request, signInAs } from "./helpers/factories";

const today = getLocalDateKey(new Date());

/** Answers every Messages call with `output` and records what was sent. */
function mockClaude(output: unknown, overrides: Parameters<typeof anthropicMessage>[1] = {}) {
  const calls: { body: { messages: { content: string }[] } }[] = [];

  server.use(
    http.post(ANTHROPIC_MESSAGES, async ({ request: sent }) => {
      calls.push({ body: (await sent.json()) as (typeof calls)[number]["body"] });
      return HttpResponse.json(anthropicMessage(output, overrides));
    })
  );

  return calls;
}

const ask = (dateKey: unknown = today) =>
  askCoach(request("/api/ai/fueling-coach", { method: "POST", body: { dateKey } }));

/** A 70 kg rider with a 2 h 22 min ride today and 168 g of carbs logged. */
async function riderWithBigDay() {
  const user = await createUser({ weight: 70, units: "metric" });
  signInAs(user.id);

  await prisma.activity.create({
    data: {
      userId: user.id,
      stravaActivityId: `ride-${user.id}`,
      name: "Z2 Endurance Ride",
      type: "Ride",
      startDate: new Date(),
      movingTime: 142 * 60,
      calories: 1540,
      sufferScore: 98
    }
  });
  await prisma.foodLog.create({
    data: {
      userId: user.id,
      dateKey: today,
      meal: "Breakfast",
      name: "Oatmeal",
      serving: "1 bowl",
      baseGrams: 100,
      grams: 100,
      calories: 700,
      protein: 72,
      carbs: 168,
      fat: 10
    }
  });

  return user;
}

const goodAnswer = {
  headline: "About 392 g of carbs still to go today.",
  advice: "A big day like this calls for 6–10 g of carbs per kg, so aim for 560 g. You've logged 168 g so far.",
  actions: ["Within 1 hour, have about 70 g of carbs and 20 g of protein."]
};

const savedKey = process.env.ANTHROPIC_API_KEY;

afterEach(() => {
  process.env.ANTHROPIC_API_KEY = savedKey;
});

describe("POST /api/ai/fueling-coach", () => {
  it("requires a session", async () => {
    expect((await ask()).status).toBe(401);
  });

  it.each([[""], ["2026-1-5"], ["tomorrow"], [42]])("rejects date %#", async (dateKey) => {
    signInAs((await createUser()).id);

    expect((await ask(dateKey)).status).toBe(400);
  });

  it("builds the plan from the rider's stored rides, food and weight", async () => {
    const user = await riderWithBigDay();
    const calls = mockClaude(goodAnswer, { input_tokens: 800, output_tokens: 200 });

    const response = await ask();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ source: "ai", cached: false, coach: goodAnswer });
    expect(body.plan).toMatchObject({
      dayType: "high",
      trainingMinutes: 142,
      weightIsDefault: false,
      carbs: { targetG: 560, eatenG: 168, remainingG: 392 },
      recovery: { carbsG: 70, proteinG: 20 }
    });
    expect(body.disclaimer).toMatch(/Not medical/);

    // Only the plan's numbers go to the model; no ride names or food names.
    const sent = calls[0].body.messages[0].content;
    expect(sent).toContain('"targetG":560');
    expect(sent).not.toContain("Z2 Endurance Ride");
    expect(sent).not.toContain("Oatmeal");

    const [row] = await prisma.aiRequest.findMany({ where: { userId: user.id } });
    expect(row).toMatchObject({ kind: "fueling-coach", cached: false, inputTokens: 800, outputTokens: 200 });
  });

  it("answers the same day again from the cache, for free", async () => {
    await riderWithBigDay();
    const calls = mockClaude(goodAnswer);

    await ask();
    const second = await (await ask()).json();

    expect(calls).toHaveLength(1);
    expect(second).toMatchObject({ source: "ai", cached: true });
  });

  it("falls back to the template when the answer quotes a made-up number, and still counts its cost", async () => {
    const user = await riderWithBigDay();
    mockClaude({ ...goodAnswer, advice: "Eat about 3,200 kcal today." });

    const body = await (await ask()).json();

    expect(body.source).toBe("template");
    expect(body.coach.headline).toBe("About 392 g of carbs still to go today.");
    const rows = await prisma.aiRequest.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].inputHash).toMatch(/:rejected$/);
    expect(rows[0].costMicroUsd).toBeGreaterThan(0);
  });

  it("uses the template when AI is off", async () => {
    await riderWithBigDay();
    process.env.ANTHROPIC_API_KEY = "";

    const body = await (await ask()).json();

    expect(body).toMatchObject({ source: "template", plan: { carbs: { targetG: 560 } } });
  });

  it("uses the template with a notice once the hourly limit is reached", async () => {
    const user = await riderWithBigDay();
    const calls = mockClaude(goodAnswer);
    await prisma.aiRequest.createMany({
      data: Array.from({ length: RATE_LIMITS[0].max }, (_, i) => ({
        userId: user.id,
        kind: "fueling-coach",
        inputHash: `h${i}`,
        model: "claude-opus-5-5",
        outputJson: "{}"
      }))
    });

    const body = await (await ask()).json();

    expect(body.source).toBe("template");
    expect(body.notice).toMatch(/limit of 20 coach explanations per hour/);
    expect(calls).toHaveLength(0);
  });

  it("uses the template when the API fails", async () => {
    await riderWithBigDay();
    server.use(
      http.post(ANTHROPIC_MESSAGES, () =>
        HttpResponse.json({ type: "error", error: { type: "invalid_request_error", message: "bad" } }, { status: 400 })
      )
    );

    const body = await (await ask()).json();

    expect(body.source).toBe("template");
    expect(body.notice).toMatch(/unavailable/);
  });

  it("treats a day without rides as a rest day and asks for a weight when unset", async () => {
    signInAs((await createUser({ weight: null })).id);
    mockClaude(goodAnswer);
    process.env.ANTHROPIC_API_KEY = "";

    const body = await (await ask()).json();

    expect(body.plan).toMatchObject({ dayType: "rest", weightIsDefault: true, recovery: null, duringRide: null });
    expect(body.coach.actions.at(-1)).toMatch(/Set your weight/);
  });
});
