import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import {
  COACH_DISCLAIMER,
  coachCacheKey,
  CoachRejectedError,
  coachSchema,
  explainFuelingPlan,
  templateCoach,
  type CoachMessage
} from "@/lib/ai/fueling-coach";
import {
  checkLiveCallAllowed,
  findCachedOutput,
  recordAiRequest
} from "@/lib/ai/guardrails";
import { getAiModel, isAiConfigured } from "@/lib/ai/meal-parser";
import { buildFuelingPlan, type FuelingPlan } from "@/lib/fueling";
import { loadFuelingDay } from "@/lib/fueling-day";
import { getCurrentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const KIND = "fueling-coach";

const bodySchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date")
});

type CoachResponse = {
  plan: FuelingPlan;
  coach: CoachMessage;
  /** "ai" when Claude wrote the explanation, "template" when the app did. */
  source: "ai" | "template";
  cached: boolean;
  /** Why the template was used instead of the AI, when that's worth saying. */
  notice?: string;
  disclaimer: string;
};

function respond(body: Omit<CoachResponse, "disclaimer">) {
  return NextResponse.json({ ...body, disclaimer: COACH_DISCLAIMER } satisfies CoachResponse);
}

/**
 * Explain one day's fueling targets. The targets are computed here from the
 * user's stored rides, food and weight; Claude only puts them into words, and
 * its answer is rejected if it quotes a number the plan doesn't contain. When
 * AI is off, limited or fails, the same numbers come back as plain text.
 */
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, bodySchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const day = await loadFuelingDay(userId, parsed.data.dateKey);

  if (!day) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = buildFuelingPlan(day);
  const template = (notice?: string) =>
    respond({ plan, coach: templateCoach(plan), source: "template", cached: false, notice });

  if (!isAiConfigured()) {
    return template();
  }

  const model = getAiModel();
  const inputHash = coachCacheKey(model, plan);
  const hit = await findCachedOutput(KIND, inputHash);

  if (hit) {
    const reused = coachSchema.safeParse(JSON.parse(hit.outputJson));

    if (reused.success) {
      await recordAiRequest({ userId, kind: KIND, inputHash, model: hit.model, output: reused.data, usage: null });
      return respond({ plan, coach: reused.data, source: "ai", cached: true });
    }
  }

  const blocked = await checkLiveCallAllowed(userId, KIND, new Date(), {
    noun: "coach explanations",
    instead: "Your targets are shown on their own for now"
  });

  if (blocked) {
    return template(blocked.error);
  }

  try {
    // explainFuelingPlan validates the answer, number check included.
    const { coach, usage } = await explainFuelingPlan(plan, { model });

    await recordAiRequest({ userId, kind: KIND, inputHash, model, output: coach, usage });

    return respond({ plan, coach, source: "ai", cached: false });
  } catch (error) {
    if (error instanceof CoachRejectedError) {
      // A rejected answer was still paid for, so it counts toward the limits.
      // A different hash keeps it out of the cache.
      if (error.usage) {
        await recordAiRequest({
          userId,
          kind: KIND,
          inputHash: `${inputHash}:rejected`,
          model,
          output: { rejected: error.reason },
          usage: error.usage
        });
      }

      console.warn("Fueling coach answer rejected", error.reason, error.message);
      return template();
    }

    if (error instanceof Anthropic.APIError) {
      console.error("Fueling coach API error", error.status, error.message);
      return template("The coach is unavailable right now, so here are your targets on their own.");
    }

    throw error;
  }
}
