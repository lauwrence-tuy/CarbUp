import { http, HttpResponse } from "msw";

export const STRAVA = {
  token: "https://www.strava.com/oauth/token",
  deauthorize: "https://www.strava.com/oauth/deauthorize",
  activities: "https://www.strava.com/api/v3/athlete/activities",
  activity: "https://www.strava.com/api/v3/activities/:id",
  streams: "https://www.strava.com/api/v3/activities/:id/streams"
} as const;

export const USDA_SEARCH = "https://api.nal.usda.gov/fdc/v1/foods/search";
export const OFF_SEARCH = "https://world.openfoodfacts.org/cgi/search.pl";
export const OFF_PRODUCT = "https://world.openfoodfacts.org/api/v2/product/:code";

export type StravaSummary = {
  id: number;
  name: string;
  sport_type?: string;
  type?: string;
  start_date: string;
  distance?: number;
  moving_time?: number;
  calories?: number;
  suffer_score?: number;
};

export function stravaActivity(overrides: Partial<StravaSummary> & { id: number }): StravaSummary {
  return {
    name: `Ride ${overrides.id}`,
    sport_type: "Ride",
    start_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    distance: 40_000,
    moving_time: 5_400,
    ...overrides
  };
}

export function stravaTokenResponse(overrides: Record<string, unknown> = {}) {
  return {
    token_type: "Bearer",
    access_token: "new-access-token",
    refresh_token: "new-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 6 * 60 * 60,
    expires_in: 6 * 60 * 60,
    athlete: { id: 987654, firstname: "Test" },
    ...overrides
  };
}

/** Strava activity list: returns `activities` on page 1 and nothing after. */
export function stravaActivitiesHandler(
  activities: StravaSummary[],
  onRequest?: (request: Request) => void
) {
  return http.get(STRAVA.activities, ({ request }) => {
    onRequest?.(request);
    const page = Number(new URL(request.url).searchParams.get("page") ?? "1");

    return HttpResponse.json(page === 1 ? activities : []);
  });
}

/** A USDA search result that passes the Atwater sanity check. */
export function usdaFood(fdcId: number, description: string, dataType = "Foundation") {
  return {
    fdcId,
    description,
    dataType,
    foodNutrients: [
      { nutrientId: 1008, value: 389 },
      { nutrientId: 1003, value: 16.9 },
      { nutrientId: 1005, value: 66.3 },
      { nutrientId: 1004, value: 6.9 }
    ]
  };
}

/** An Open Food Facts product that passes the Atwater sanity check. */
export function offProduct(code: string, name: string, brands = "Test Brand") {
  return {
    code,
    product_name: name,
    brands,
    serving_size: "1 bar (40 g)",
    serving_quantity: 40,
    nutriments: {
      "energy-kcal_100g": 400,
      proteins_100g: 10,
      carbohydrates_100g: 60,
      fat_100g: 13.3
    }
  };
}

export const ANTHROPIC_MESSAGES = "https://api.anthropic.com/v1/messages";

/**
 * A Messages API response whose text block is `output` as JSON, the way a
 * structured-output call returns it.
 */
export function anthropicMessage(
  output: unknown,
  overrides: { stop_reason?: string; model?: string; input_tokens?: number; output_tokens?: number } = {}
) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: overrides.model ?? "claude-opus-5-5",
    content: [{ type: "text", text: JSON.stringify(output) }],
    stop_reason: overrides.stop_reason ?? "end_turn",
    stop_sequence: null,
    stop_details: null,
    usage: {
      input_tokens: overrides.input_tokens ?? 900,
      output_tokens: overrides.output_tokens ?? 400,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0
    }
  };
}
