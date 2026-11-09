import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseJsonBody } from "./parse-json-body";

const schema = z.object({ id: z.string().min(1) });

function jsonRequest(body: string) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });
}

describe("parseJsonBody", () => {
  it("returns parsed data for a valid body", async () => {
    const result = await parseJsonBody(jsonRequest('{"id":"abc"}'), schema);

    expect(result).toEqual({ ok: true, data: { id: "abc" } });
  });

  it("returns a 400 for malformed JSON", async () => {
    const result = await parseJsonBody(jsonRequest("{not json"), schema);

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.response.status).toBe(400);
      expect(await result.response.json()).toEqual({ error: "Request body must be JSON" });
    }
  });

  it("returns a 400 listing the fields that failed", async () => {
    const result = await parseJsonBody(jsonRequest('{"id":""}'), schema);

    expect(result.ok).toBe(false);

    if (!result.ok) {
      const body = await result.response.json();

      expect(result.response.status).toBe(400);
      expect(body.error).toBe("Invalid request");
      expect(body.issues[0].path).toBe("id");
    }
  });
});
