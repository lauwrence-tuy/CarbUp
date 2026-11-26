import { prisma } from "@/lib/prisma";
import { costMicroUsd, type TokenUsage } from "./pricing";

/** Live (uncached) model calls one user may make. */
export const RATE_LIMITS = [
  { windowMs: 60 * 60 * 1000, max: 20, label: "hour" },
  { windowMs: 24 * 60 * 60 * 1000, max: 60, label: "day" }
] as const;

/** Cached answers are reused for this long. */
export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const DEFAULT_MONTHLY_BUDGET_USD = 5;

export function monthlyBudgetMicroUsd() {
  const configured = Number(process.env.AI_MONTHLY_BUDGET_USD);
  const dollars =
    Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_MONTHLY_BUDGET_USD;

  return Math.round(dollars * 1_000_000);
}

/** First instant of the current calendar month, in UTC. */
export function startOfMonthUtc(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export type GuardrailBlock = { status: 429 | 503; error: string };

/**
 * Whether this user may make another live call: the per-user rate limits,
 * then the app-wide monthly spend cap. Returns null when the call may go ahead.
 */
export async function checkLiveCallAllowed(
  userId: string,
  kind: string,
  now = new Date()
): Promise<GuardrailBlock | null> {
  for (const limit of RATE_LIMITS) {
    const count = await prisma.aiRequest.count({
      where: {
        userId,
        kind,
        cached: false,
        createdAt: { gte: new Date(now.getTime() - limit.windowMs) }
      }
    });

    if (count >= limit.max) {
      return {
        status: 429,
        error: `You've reached the limit of ${limit.max} meal descriptions per ${limit.label}. Search for foods instead, or try again later.`
      };
    }
  }

  const spent = await prisma.aiRequest.aggregate({
    _sum: { costMicroUsd: true },
    where: { createdAt: { gte: startOfMonthUtc(now) } }
  });

  if ((spent._sum.costMicroUsd ?? 0) >= monthlyBudgetMicroUsd()) {
    return {
      status: 503,
      error: "Meal descriptions are paused until next month. Search for foods instead."
    };
  }

  return null;
}

/** The latest stored answer for this input, if it's recent enough to reuse. */
export async function findCachedOutput(kind: string, inputHash: string, now = new Date()) {
  const row = await prisma.aiRequest.findFirst({
    where: {
      kind,
      inputHash,
      createdAt: { gte: new Date(now.getTime() - CACHE_TTL_MS) }
    },
    orderBy: { createdAt: "desc" },
    select: { outputJson: true, model: true }
  });

  return row;
}

export async function recordAiRequest(input: {
  userId: string;
  kind: string;
  inputHash: string;
  model: string;
  output: unknown;
  usage: TokenUsage | null;
}) {
  await prisma.aiRequest.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      inputHash: input.inputHash,
      model: input.model,
      outputJson: JSON.stringify(input.output),
      cached: input.usage === null,
      inputTokens: input.usage?.inputTokens ?? 0,
      outputTokens: input.usage?.outputTokens ?? 0,
      costMicroUsd: input.usage ? costMicroUsd(input.model, input.usage) : 0
    }
  });
}
