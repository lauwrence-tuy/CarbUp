import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { DAY_TYPE_LABELS, formatMinutes, type FuelingPlan } from "@/lib/fueling";
import { getAiModel } from "./meal-parser";
import type { TokenUsage } from "./pricing";

/** Bump when the prompt or schema changes, so old cache entries stop matching. */
export const FUELING_COACH_VERSION = "fuel-coach-v1";

export const COACH_DISCLAIMER =
  "General sports-nutrition guidance from your logged rides and food. Not medical or dietary advice.";

const MAX_HEADLINE_LENGTH = 120;
const MAX_ADVICE_LENGTH = 700;
const MAX_ACTIONS = 3;
const MAX_ACTION_LENGTH = 200;

/**
 * Small whole numbers ("1 hour", "2 bottles", "3 meals") are allowed without
 * appearing in the plan; anything bigger has to come from it.
 */
const FREE_NUMBER_MAX = 12;

export const coachSchema = z.object({
  headline: z.string().describe("One short sentence: the main thing to know about fueling this day"),
  advice: z
    .string()
    .describe("Two or three sentences explaining the targets, using only numbers from the plan"),
  actions: z
    .array(z.string())
    .describe("Up to three concrete next steps, e.g. what to eat at the next meal")
});

export type CoachMessage = z.infer<typeof coachSchema>;

export type CoachResult = {
  coach: CoachMessage;
  model: string;
  usage: TokenUsage;
};

export class CoachRejectedError extends Error {
  constructor(
    message: string,
    readonly reason: "refused" | "truncated" | "invalid" | "unsupported-number",
    readonly usage: TokenUsage | null = null
  ) {
    super(message);
  }
}

/** Every number the coach may quote: the plan's own figures. */
export function planNumbers(plan: FuelingPlan): number[] {
  const numbers: number[] = [
    plan.weightKg,
    plan.trainingMinutes,
    plan.load,
    ...Object.values(plan.carbs),
    ...Object.values(plan.protein)
  ];

  // Training time as the prompt writes it ("2 h 22 min").
  numbers.push(Math.floor(plan.trainingMinutes / 60), plan.trainingMinutes % 60);

  if (plan.recovery) {
    numbers.push(plan.recovery.carbsG, plan.recovery.proteinG);
  }

  if (plan.duringRide) {
    const { rideMinutes, carbsPerHourMin, carbsPerHourMax } = plan.duringRide;
    numbers.push(rideMinutes, Math.floor(rideMinutes / 60), rideMinutes % 60, carbsPerHourMin, carbsPerHourMax);
  }

  return numbers;
}

/**
 * Numbers in the text that the plan doesn't contain. The model explains the
 * plan; it must not make up targets, so any stray figure rejects the answer.
 */
export function findUnsupportedNumbers(text: string, allowed: number[]) {
  const found = text.replace(/(\d),(\d{3})/g, "$1$2").match(/\d+(?:\.\d+)?/g) ?? [];

  return found
    .map(Number)
    .filter(
      (value) =>
        !(Number.isInteger(value) && value <= FREE_NUMBER_MAX) &&
        !allowed.some((number) => Math.abs(number - value) <= Math.max(1, number * 0.02))
    );
}

/** Trim and cap the answer, then reject it if it quotes numbers the plan doesn't have. */
export function validateCoach(coach: CoachMessage, plan: FuelingPlan): CoachMessage {
  const cleaned: CoachMessage = {
    headline: coach.headline.trim().slice(0, MAX_HEADLINE_LENGTH),
    advice: coach.advice.trim().slice(0, MAX_ADVICE_LENGTH),
    actions: coach.actions
      .map((action) => action.trim().slice(0, MAX_ACTION_LENGTH))
      .filter(Boolean)
      .slice(0, MAX_ACTIONS)
  };

  if (!cleaned.headline || !cleaned.advice) {
    throw new CoachRejectedError("The coach's answer was empty.", "invalid");
  }

  const unsupported = findUnsupportedNumbers(
    [cleaned.headline, cleaned.advice, ...cleaned.actions].join("\n"),
    planNumbers(plan)
  );

  if (unsupported.length > 0) {
    throw new CoachRejectedError(
      `The coach quoted numbers that aren't in the plan: ${unsupported.join(", ")}`,
      "unsupported-number"
    );
  }

  return cleaned;
}

/** The same explanation without the model: used when AI is off, limited or fails. */
export function templateCoach(plan: FuelingPlan): CoachMessage {
  const { carbs, protein, recovery, duringRide } = plan;
  const dayLabel = DAY_TYPE_LABELS[plan.dayType].toLowerCase();
  const trained =
    plan.trainingMinutes > 0 ? `${formatMinutes(plan.trainingMinutes)} of training` : "no training logged";

  const headline =
    plan.isToday && carbs.remainingG > 0
      ? `About ${carbs.remainingG} g of carbs still to go today.`
      : `${carbs.eatenG} g of ${carbs.targetG} g carbs on this ${dayLabel}.`;

  const advice = [
    `With ${trained}, this is a ${dayLabel}: ${carbs.perKgMin}–${carbs.perKgMax} g of carbs per kg, about ${carbs.minG}–${carbs.maxG} g for you.`,
    `Protein target is ${protein.targetG} g (${protein.perKg} g/kg), and you've logged ${protein.eatenG} g.`
  ].join(" ");

  const actions: string[] = [];

  if (recovery) {
    actions.push(`After a ride like this, have about ${recovery.carbsG} g of carbs and ${recovery.proteinG} g of protein within the first hour.`);
  }

  if (duringRide) {
    actions.push(`On rides of ${formatMinutes(duringRide.rideMinutes)}, take in ${duringRide.carbsPerHourMin}–${duringRide.carbsPerHourMax} g of carbs per hour.`);
  }

  if (plan.weightIsDefault) {
    actions.push("Set your weight in Settings so these targets fit you.");
  }

  return { headline, advice, actions: actions.slice(0, MAX_ACTIONS) };
}

/** The plan alone decides the answer, so it's the cache key. */
export function coachCacheKey(model: string, plan: FuelingPlan) {
  return createHash("sha256")
    .update(`${FUELING_COACH_VERSION}\n${model}\n${JSON.stringify(plan)}`)
    .digest("hex");
}

const SYSTEM_PROMPT = `You are a friendly cycling fueling coach inside a nutrition app. The app has already worked out the rider's targets; you explain them in plain words.

You get one day's fueling plan as JSON:
- dayType and trainingTime: how much the rider trained that day.
- carbs: the target band in g/kg (perKgMin–perKgMax), the same band in grams (minG–maxG), the target (targetG), what they've logged (eatenG) and what's left (remainingG).
- protein: target, logged and remaining grams.
- recovery: carbs and protein to eat soon after a long or hard ride, or null.
- duringRide: carbs per hour on the bike for rides like the day's longest, or null.
- isToday: true means the day isn't over (say what's left); false means it's a past day (say how it went).
- weightIsDefault: true means the rider hasn't set a weight; mention that the targets assume 70 kg and they can set theirs in Settings.

Rules:
- Use only numbers that appear in the plan. Never compute new figures, percentages or calorie numbers.
- Be specific and practical: name everyday foods that fit (rice, pasta, oats, bananas, bread, yogurt), not supplements or brands.
- Don't diagnose, mention medical conditions, or suggest eating less than the plan.
- headline: one sentence. advice: two or three sentences. actions: at most three short steps.`;

function promptInput(plan: FuelingPlan) {
  return JSON.stringify({
    dayType: plan.dayType,
    trainingTime: plan.trainingMinutes > 0 ? formatMinutes(plan.trainingMinutes) : "none",
    weightKg: plan.weightKg,
    weightIsDefault: plan.weightIsDefault,
    isToday: plan.isToday,
    carbs: plan.carbs,
    protein: plan.protein,
    recovery: plan.recovery,
    duringRide: plan.duringRide
      ? { ...plan.duringRide, rideTime: formatMinutes(plan.duringRide.rideMinutes) }
      : null
  });
}

/** Models that support server-side refusal fallbacks. */
function supportsFallbacks(model: string) {
  return !model.startsWith("claude-haiku");
}

/**
 * One structured-output call that explains the plan. The caller handles
 * caching, rate limits and the spend cap. A rejected answer still reports
 * its usage, so the caller can count what it cost.
 */
export async function explainFuelingPlan(
  plan: FuelingPlan,
  options: { client?: Anthropic; model?: string } = {}
): Promise<CoachResult> {
  const client = options.client ?? new Anthropic();
  const model = options.model ?? getAiModel();
  const fallbacks = supportsFallbacks(model);

  const response = await client.beta.messages.parse({
    model,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: promptInput(plan) }],
    output_config: {
      effort: "low",
      format: betaZodOutputFormat(coachSchema)
    },
    ...(fallbacks
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {})
  });

  const usage = {
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens
  };

  if (response.stop_reason === "refusal") {
    throw new CoachRejectedError("The coach declined to answer.", "refused", usage);
  }

  if (response.stop_reason === "max_tokens") {
    throw new CoachRejectedError("The coach's answer was cut off.", "truncated", usage);
  }

  if (!response.parsed_output) {
    throw new CoachRejectedError("The coach's answer wasn't readable.", "invalid", usage);
  }

  try {
    return { coach: validateCoach(response.parsed_output, plan), model, usage };
  } catch (error) {
    if (error instanceof CoachRejectedError) {
      throw new CoachRejectedError(error.message, error.reason, usage);
    }

    throw error;
  }
}
