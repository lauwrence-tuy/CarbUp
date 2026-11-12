import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { listenForRequests, server } from "@/tests/msw/server";
import { OFF_PRODUCT, OFF_SEARCH, USDA_SEARCH, offProduct, usdaFood } from "@/tests/msw/fixtures";
import { normalizeOffProduct } from "./off";
import { lookupOffBarcode, normalizeUsdaFood, searchExternalFoods, searchOffFoods, searchUsdaFoods } from "./index";

beforeAll(listenForRequests);
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
});
afterAll(() => server.close());

describe("normalizeUsdaFood", () => {
  it("reads macros per 100 g and marks Foundation foods verified", () => {
    expect(normalizeUsdaFood(usdaFood(1, "OATS, ROLLED"))).toMatchObject({
      source: "usda",
      externalId: "1",
      name: "Oats, Rolled",
      caloriesPer100g: 389,
      proteinPer100g: 16.9,
      carbsPer100g: 66.3,
      fatPer100g: 6.9,
      verified: true,
      defaultServingLabel: "100 g"
    });
  });

  it("converts kJ when kcal is missing", () => {
    const food = normalizeUsdaFood({
      fdcId: 2,
      description: "Rice",
      foodNutrients: [
        { nutrientNumber: "268", amount: 1527 },
        { number: "203", amount: 7 },
        { number: "205", amount: 80 },
        { number: "204", amount: 1 }
      ]
    });

    expect(food?.caloriesPer100g).toBe(365);
  });

  it("keeps a branded serving in grams", () => {
    const food = normalizeUsdaFood({
      ...usdaFood(3, "Granola", "Branded"),
      brandOwner: "Acme",
      servingSize: 55,
      servingSizeUnit: "g",
      householdServingFullText: "2/3 cup"
    });

    expect(food).toMatchObject({
      brand: "Acme",
      verified: false,
      defaultServingGrams: 55,
      defaultServingLabel: "2/3 cup",
      servings: [
        { label: "2/3 cup", grams: 55, isDefault: true },
        { label: "100 g", grams: 100 }
      ]
    });
  });

  it("drops foods with no id, no energy, or macros that contradict the calories", () => {
    expect(normalizeUsdaFood({ description: "No id" })).toBeNull();
    expect(normalizeUsdaFood({ fdcId: 4, description: "No energy", foodNutrients: [] })).toBeNull();
    expect(
      normalizeUsdaFood({
        fdcId: 5,
        description: "Bad data",
        foodNutrients: [
          { nutrientId: 1008, value: 50 },
          { nutrientId: 1004, value: 90 }
        ]
      })
    ).toBeNull();
  });
});

describe("normalizeOffProduct", () => {
  it("uses the first brand and the serving quantity", () => {
    expect(normalizeOffProduct(offProduct("0123456789012", "Trail Bar", "Acme, Other"))).toMatchObject({
      source: "off",
      externalId: "0123456789012",
      barcode: "0123456789012",
      brand: "Acme",
      defaultServingGrams: 40,
      defaultServingLabel: "1 bar (40 g)"
    });
  });

  it("parses grams from the serving text when quantity is missing", () => {
    const product = { ...offProduct("111111", "Bar"), serving_quantity: undefined, serving_size: "2 pieces (30 g)" };

    expect(normalizeOffProduct(product)?.defaultServingGrams).toBe(30);
  });

  it("drops products without a name or with impossible energy", () => {
    expect(normalizeOffProduct({ code: "1" })).toBeNull();
    expect(
      normalizeOffProduct({ code: "1", product_name: "X", nutriments: { "energy-kcal_100g": 5000 } })
    ).toBeNull();
  });
});

describe("provider search", () => {
  it("queries USDA with the configured API key", async () => {
    let apiKey: string | null = null;
    server.use(
      http.get(USDA_SEARCH, ({ request }) => {
        apiKey = new URL(request.url).searchParams.get("api_key");
        return HttpResponse.json({ foods: [usdaFood(1, "Oats"), usdaFood(2, "Oats"), { fdcId: 3 }] });
      })
    );

    const foods = await searchUsdaFoods("oats");

    expect(apiKey).toBe("test-usda-key");
    expect(foods).toHaveLength(1);
  });

  it("falls back to DEMO_KEY without a USDA key", async () => {
    vi.stubEnv("USDA_FDC_API_KEY", "");
    let apiKey: string | null = null;
    server.use(
      http.get(USDA_SEARCH, ({ request }) => {
        apiKey = new URL(request.url).searchParams.get("api_key");
        return HttpResponse.json({ foods: [] });
      })
    );

    await searchUsdaFoods("oats");

    expect(apiKey).toBe("DEMO_KEY");
  });

  it("identifies CarbUp to Open Food Facts", async () => {
    let userAgent: string | null = null;
    server.use(
      http.get(OFF_SEARCH, ({ request }) => {
        userAgent = request.headers.get("user-agent");
        return HttpResponse.json({ products: [offProduct("222222", "Granola Bar")] });
      })
    );

    const foods = await searchOffFoods("granola");

    expect(userAgent).toMatch(/^CarbUp\//);
    expect(foods[0].name).toBe("Granola Bar");
  });

  it("throws on provider errors", async () => {
    server.use(
      http.get(USDA_SEARCH, () => new HttpResponse(null, { status: 500 })),
      http.get(OFF_SEARCH, () => new HttpResponse(null, { status: 503 }))
    );

    await expect(searchUsdaFoods("oats")).rejects.toThrow(/500/);
    await expect(searchOffFoods("oats")).rejects.toThrow(/503/);
  });

  it("skips queries shorter than two characters without a request", async () => {
    expect(await searchUsdaFoods(" a ")).toEqual([]);
    expect(await searchOffFoods("a")).toEqual([]);
    expect(await searchExternalFoods("a")).toEqual([]);
  });

  it("merges both providers and survives one of them failing", async () => {
    server.use(
      http.get(USDA_SEARCH, () => new HttpResponse(null, { status: 500 })),
      http.get(OFF_SEARCH, () => HttpResponse.json({ products: [offProduct("333333", "Oat Bar")] }))
    );

    const foods = await searchExternalFoods("oat");

    expect(foods.map((f) => f.source)).toEqual(["off"]);
  });
});

describe("lookupOffBarcode", () => {
  it("returns the normalized product", async () => {
    server.use(
      http.get(OFF_PRODUCT, ({ params }) =>
        HttpResponse.json({ status: 1, product: offProduct(String(params.code), "Scanned Bar") })
      )
    );

    expect((await lookupOffBarcode("4006381333931"))?.name).toBe("Scanned Bar");
  });

  it("returns null for an unknown code or an invalid barcode", async () => {
    server.use(http.get(OFF_PRODUCT, () => new HttpResponse(null, { status: 404 })));

    expect(await lookupOffBarcode("4006381333931")).toBeNull();
    expect(await lookupOffBarcode("abc")).toBeNull();
  });
});
