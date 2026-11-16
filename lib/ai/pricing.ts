/**
 * Anthropic list prices in US dollars per million tokens (input, output).
 * Thinking tokens are billed as output tokens. Prices change: check
 * https://www.anthropic.com/pricing when you change models.
 */
const PRICES_PER_MILLION: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-haiku-4-5": { input: 1, output: 5 }
};

/** Unknown models are priced like the most expensive one, so the cap errs safe. */
const FALLBACK_PRICE = { input: 10, output: 50 };

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export function priceFor(model: string) {
  return PRICES_PER_MILLION[model] ?? FALLBACK_PRICE;
}

/** Cost of one call in millionths of a dollar, rounded up. */
export function costMicroUsd(model: string, usage: TokenUsage): number {
  const price = priceFor(model);

  return Math.ceil(usage.inputTokens * price.input + usage.outputTokens * price.output);
}
