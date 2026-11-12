import { describe, expect, it } from "vitest";
import { getActivitySlug } from "./activity-slug";

describe("getActivitySlug", () => {
  it("lowercases and hyphenates", () => {
    expect(getActivitySlug("Morning Ride @ Park!")).toBe("morning-ride-park");
  });

  it("strips accents", () => {
    expect(getActivitySlug("Café Crème Run")).toBe("cafe-creme-run");
  });

  it("falls back when nothing is left", () => {
    expect(getActivitySlug("🚴‍♂️")).toBe("activity");
  });
});
