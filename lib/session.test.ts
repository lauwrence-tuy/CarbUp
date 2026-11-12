import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  getSessionCookieOptions,
  verifySessionToken
} from "./session";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("session tokens", () => {
  it("round-trips the user id", () => {
    const token = createSessionToken("user_1");

    expect(verifySessionToken(token)?.userId).toBe("user_1");
  });

  it("rejects a token whose payload was edited", () => {
    const [, signature] = createSessionToken("user_1").split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ userId: "someone_else", exp: 9_999_999_999 })
    ).toString("base64url");

    expect(verifySessionToken(`${forgedPayload}.${signature}`)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken("user_1");
    vi.stubEnv("SESSION_SECRET", "a-different-secret");

    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("no-signature")).toBeNull();
    expect(verifySessionToken("payload.short")).toBeNull();
  });

  it("is valid until 30 days have passed, then expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = createSessionToken("user_1");

    vi.setSystemTime(new Date(Date.parse("2026-01-01T00:00:00Z") + THIRTY_DAYS_MS - 1000));
    expect(verifySessionToken(token)?.userId).toBe("user_1");

    vi.setSystemTime(new Date(Date.parse("2026-01-01T00:00:00Z") + THIRTY_DAYS_MS));
    expect(verifySessionToken(token)).toBeNull();
  });

  it("falls back to TOKEN_ENCRYPTION_KEY when SESSION_SECRET is unset", () => {
    vi.stubEnv("SESSION_SECRET", undefined);

    expect(verifySessionToken(createSessionToken("user_1"))?.userId).toBe("user_1");
  });

  it("refuses to sign without any secret", () => {
    vi.stubEnv("SESSION_SECRET", undefined);
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", undefined);

    expect(() => createSessionToken("user_1")).toThrow(/Missing SESSION_SECRET/);
  });
});

describe("getSessionCookieOptions", () => {
  it("is HTTP-only and only marked secure in production", () => {
    expect(getSessionCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/"
    });

    vi.stubEnv("NODE_ENV", "production");
    expect(getSessionCookieOptions().secure).toBe(true);
  });
});
