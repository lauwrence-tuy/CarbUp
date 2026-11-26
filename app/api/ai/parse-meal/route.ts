import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api/parse-json-body";
import {
  checkLiveCallAllowed,
  findCachedOutput,
  recordAiRequest
} from "@/lib/ai/guardrails";
import {
  AI_DISCLAIMER,
  getAiModel,
  isAiConfigured,
  llmMealSchema,
  MAX_MEAL_TEXT_LENGTH,
  mealCacheKey,
  MealParseError,
  parseMealText,
  validateParsedMeal,
  type LlmMeal
} from "@/lib/ai/meal-parser";
import { resolveParsedMeal } from "@/lib/ai/meal-resolver";
import { searchFoodCatalog } from "@/lib/food-catalog";
import { getCurrentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

const KIND = "meal-parse";

const bodySchema = z.object({
  text: z.string().trim().min(2, "Describe what you ate").max(MAX_MEAL_TEXT_LENGTH)
});

/**
 * Turn one sentence ("2 eggs, toast with butter and a latte") into foods with
 * macros. Nothing is saved here: the client shows the result for the user to
 * confirm, then logs it through /api/nutrition/logs.
 */
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "Meal descriptions aren't set up on this server." },
      { status: 503 }
    );
  }

  const parsed = await parseJsonBody(request, bodySchema);

  if (!parsed.ok) {
    return parsed.response;
  }

  const { text } = parsed.data;
  const model = getAiModel();
  const inputHash = mealCacheKey(model, text);

  let meal: LlmMeal | null = null;
  let cached = false;

  const hit = await findCachedOutput(KIND, inputHash);

  if (hit) {
    const reused = llmMealSchema.safeParse(JSON.parse(hit.outputJson));

    if (reused.success) {
      meal = reused.data;
      cached = true;
      await recordAiRequest({ userId, kind: KIND, inputHash, model: hit.model, output: meal, usage: null });
    }
  }

  if (!meal) {
    const blocked = await checkLiveCallAllowed(userId, KIND);

    if (blocked) {
      return NextResponse.json({ error: blocked.error }, { status: blocked.status });
    }

    try {
      const result = await parseMealText(text, { model });
      meal = result.meal;
      await recordAiRequest({
        userId,
        kind: KIND,
        inputHash,
        model: result.model,
        output: meal,
        usage: result.usage
      });
    } catch (error) {
      if (error instanceof MealParseError) {
        return NextResponse.json({ error: error.message, reason: error.reason }, { status: 422 });
      }

      if (error instanceof Anthropic.RateLimitError) {
        return NextResponse.json(
          { error: "The meal reader is busy. Try again in a minute." },
          { status: 503 }
        );
      }

      if (error instanceof Anthropic.APIError) {
        console.error("Meal parse API error", error.status, error.message);

        return NextResponse.json({ error: "Couldn't read that meal right now." }, { status: 502 });
      }

      throw error;
    }
  }

  const resolved = await resolveParsedMeal(validateParsedMeal(meal), async (query) => {
    const { foods } = await searchFoodCatalog({ query, userId, limit: 5 });
    return foods;
  });

  return NextResponse.json({ ...resolved, cached, disclaimer: AI_DISCLAIMER });
}
