import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { GET as search } from "@/app/api/nutrition/foods/search/route";
import { GET as barcode } from "@/app/api/nutrition/foods/barcode/route";
import { prisma } from "@/lib/prisma";
import { server } from "@/tests/msw/server";
import { OFF_PRODUCT, OFF_SEARCH, USDA_SEARCH, offProduct, usdaFood } from "@/tests/msw/fixtures";
import { createCatalogFood, createUser, request, signInAs } from "./helpers/factories";

// The catalog keeps external results in memory per query, so every test that
// reaches USDA / Open Food Facts uses its own query word.

async function signIn() {
  const user = await createUser();
  signInAs(user.id);
  return user;
}

const searchFor = (q: string) => search(request(`/api/nutrition/foods/search?q=${encodeURIComponent(q)}`));

function noExternalCalls() {
  server.use(
    http.get(USDA_SEARCH, () => {
      throw new Error("USDA should not be called");
    }),
    http.get(OFF_SEARCH, () => {
      throw new Error("Open Food Facts should not be called");
    })
  );
}

describe("GET /api/nutrition/foods/search", () => {
  it("requires a session", async () => {
    expect((await searchFor("oats")).status).toBe(401);
  });

  it("returns nothing for a one-letter query", async () => {
    await signIn();

    expect(await (await searchFor("o")).json()).toEqual({ foods: [] });
  });

  it("answers from the local catalog when it has enough strong matches", async () => {
    await signIn();
    noExternalCalls();
    for (let i = 0; i < 8; i += 1) {
      await createCatalogFood({ name: `Apple variety ${i}`, usageCount: i });
    }
    await createCatalogFood({ name: "Apple" });

    const body = await (await searchFor("apple")).json();

    expect(body.usedExternal).toBe(false);
    expect(body.foods[0].name).toBe("Apple");
  });

  it("finds a food despite a typo (pg_trgm similarity)", async () => {
    await signIn();
    await createCatalogFood({ name: "Broccoli, raw" });
    server.use(
      http.get(USDA_SEARCH, () => HttpResponse.json({ foods: [] })),
      http.get(OFF_SEARCH, () => HttpResponse.json({ products: [] }))
    );

    const body = await (await searchFor("brocolli")).json();

    expect(body.foods.map((f: { name: string }) => f.name)).toContain("Broccoli, raw");
  });

  it("never returns another user's custom foods", async () => {
    const other = await createUser();
    await createCatalogFood({ name: "Secret smoothie", source: "custom", creator: { connect: { id: other.id } } });
    await signIn();
    server.use(
      http.get(USDA_SEARCH, () => HttpResponse.json({ foods: [] })),
      http.get(OFF_SEARCH, () => HttpResponse.json({ products: [] }))
    );

    const body = await (await searchFor("smoothie")).json();

    expect(body.foods).toEqual([]);
  });

  it("fills in from USDA and Open Food Facts and caches what it found", async () => {
    await signIn();
    server.use(
      http.get(USDA_SEARCH, () => HttpResponse.json({ foods: [usdaFood(170_001, "Quinoa, cooked")] })),
      http.get(OFF_SEARCH, () => HttpResponse.json({ products: [offProduct("5000000000001", "Quinoa Crunch")] }))
    );

    const body = await (await searchFor("quinoa")).json();

    expect(body.usedExternal).toBe(true);
    expect(body.foods.map((f: { name: string }) => f.name).sort()).toEqual(["Quinoa Crunch", "Quinoa, cooked"]);
    expect(
      await prisma.food.findMany({ select: { source: true, externalId: true }, orderBy: { source: "asc" } })
    ).toEqual([
      { source: "off", externalId: "5000000000001" },
      { source: "usda", externalId: "170001" }
    ]);
  });

  it("still returns local results when both providers are down", async () => {
    await signIn();
    await createCatalogFood({ name: "Lentils, boiled" });
    server.use(
      http.get(USDA_SEARCH, () => HttpResponse.error()),
      http.get(OFF_SEARCH, () => new HttpResponse(null, { status: 503 }))
    );

    const response = await searchFor("lentils");

    expect(response.status).toBe(200);
    expect((await response.json()).foods.map((f: { name: string }) => f.name)).toEqual(["Lentils, boiled"]);
  });
});

describe("GET /api/nutrition/foods/barcode", () => {
  const lookup = (code: string) => barcode(request(`/api/nutrition/foods/barcode?code=${code}`));

  it("rejects an invalid barcode", async () => {
    await signIn();

    expect((await lookup("12ab")).status).toBe(400);
  });

  it("answers from the catalog without calling Open Food Facts", async () => {
    await signIn();
    await createCatalogFood({ name: "Known bar", barcode: "0012345678905" });
    server.use(
      http.get(OFF_PRODUCT, () => {
        throw new Error("Open Food Facts should not be called");
      })
    );

    expect((await (await lookup("0012345678905")).json()).food.name).toBe("Known bar");
  });

  it("looks up Open Food Facts once, then serves the cached copy", async () => {
    await signIn();
    let calls = 0;
    server.use(
      http.get(OFF_PRODUCT, ({ params }) => {
        calls += 1;
        return HttpResponse.json({ status: 1, product: offProduct(String(params.code), "Scanned bar") });
      })
    );

    const first = await (await lookup("4006381333931")).json();
    const second = await (await lookup("4006381333931")).json();

    expect(first.food.name).toBe("Scanned bar");
    expect(second.food.id).toBe(first.food.id);
    expect(calls).toBe(1);
  });

  it("returns 404 for an unknown product", async () => {
    await signIn();
    server.use(http.get(OFF_PRODUCT, () => new HttpResponse(null, { status: 404 })));

    expect((await lookup("9999999999994")).status).toBe(404);
  });

  it("requires a session", async () => {
    expect((await lookup("4006381333931")).status).toBe(401);
  });
});
