import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptToken, encryptToken } from "./token-crypto";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("token encryption", () => {
  it("round-trips a token and never stores it in plain text", () => {
    const encrypted = encryptToken("strava-access-token");

    expect(encrypted).not.toContain("strava-access-token");
    expect(decryptToken(encrypted)).toBe("strava-access-token");
  });

  it("uses a fresh IV, so the same token encrypts differently each time", () => {
    expect(encryptToken("same")).not.toBe(encryptToken("same"));
  });

  it("rejects a tampered ciphertext (GCM auth tag check)", () => {
    const [iv, tag, data] = encryptToken("strava-access-token").split(".");
    const flipped = Buffer.from(data, "base64url");
    flipped[0] ^= 0xff;

    expect(() => decryptToken([iv, tag, flipped.toString("base64url")].join("."))).toThrow();
  });

  it("cannot be decrypted with a different key", () => {
    const encrypted = encryptToken("strava-access-token");
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", "another-key");

    expect(() => decryptToken(encrypted)).toThrow();
  });

  it("rejects a payload that is not iv.tag.data", () => {
    expect(() => decryptToken("not-encrypted")).toThrow(/Invalid encrypted token/);
  });

  it("requires TOKEN_ENCRYPTION_KEY", () => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", undefined);

    expect(() => encryptToken("x")).toThrow(/Missing TOKEN_ENCRYPTION_KEY/);
  });
});
