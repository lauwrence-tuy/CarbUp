import { NextResponse } from "next/server";
import type { z } from "zod";

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/**
 * Read a request's JSON body and validate it against a schema.
 * Malformed JSON and schema failures both become a 400 response, so route
 * handlers never see unvalidated input.
 */
export async function parseJsonBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema
): Promise<ParseResult<z.output<Schema>>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request body must be JSON" }, { status: 400 })
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Invalid request",
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        },
        { status: 400 }
      )
    };
  }

  return { ok: true, data: result.data };
}
