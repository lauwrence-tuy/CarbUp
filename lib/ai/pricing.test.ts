import { describe, expect, it } from "vitest";
import { costMicroUsd, priceFor } from "./pricing";

describe("costMicroUsd", () => {
  it("prices input and output tokens per million", () => {
    // 1,000 in at $4/M + 500 out at $20/M = $0.004 + $0.01
    expect(costMicroUsd("claude-opus-5-5", { inputTokens: 1000, outputTokens: 500 })).toBe(14_000);
    expect(costMicroUsd("claude-haiku-5-5", { inputTokens: 1000, outputTokens: 500 })).toBe(350);
  });

  it("rounds fractions of a micro-dollar up", () => {
    expect(costMicroUsd("claude-haiku-5-5", { inputTokens: 1, outputTokens: 0 })).toBe(1);
  });

  it("prices unknown models at the highest rate", () => {
    expect(priceFor("claude-something-new")).toEqual({ input: 10, output: 50 });
  });
});
