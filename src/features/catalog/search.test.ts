import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Db = (typeof import("@/db"))["db"];

// Integração com banco real (docs/13 §8). RN-102: ordenar/filtrar pelo preço final com promoção.
describe.skipIf(!process.env.DATABASE_URL)("busca pelo preço final (RN-102, RN-22)", () => {
  let db: Db;
  let s: typeof import("@/db/schema");
  let search: typeof import("./search");
  let schemas: typeof import("./schemas");
  let promoId: string;
  let productId: string;

  beforeAll(async () => {
    ({ db } = await import("@/db"));
    s = await import("@/db/schema");
    search = await import("./search");
    schemas = await import("./schemas");
    const [p] = await db
      .select({ id: s.products.id })
      .from(s.products)
      .where(eq(s.products.slug, "mythic-plus-key")); // #100: "a partir de" 3,15 (+6)
    productId = p!.id;
    const [promo] = await db
      .insert(s.promotions)
      .values({
        name: "test-search-promo",
        type: "percent",
        value: 50,
        scope: "product",
        productId,
        startsAt: new Date(Date.now() - 60_000),
        endsAt: new Date(Date.now() + 3_600_000),
      })
      .returning({ id: s.promotions.id });
    promoId = promo!.id;
  });

  afterAll(async () => {
    if (promoId) await db.delete(s.promotions).where(eq(s.promotions.id, promoId));
    await db?.$client.end();
  });

  const filters = (raw: Record<string, string>) =>
    schemas.parseFilters(raw, { categories: ["gold", "raids", "mythic-plus"] });

  it("filtro em promoção traz o produto e o limite de preço usa o preço final", async () => {
    const promo = await search.searchProducts(filters({ promo: "1" }));
    expect(promo.items.map((i) => i.id)).toContain(productId);
    // 3,15 com 50% = 1,58: entra com máximo de 2 USDT, que o preço-base não passaria
    const cheap = await search.searchProducts(filters({ max: "2", cat: "mythic-plus" }));
    expect(cheap.items.map((i) => i.id)).toContain(productId);
  });

  it("menor preço ordena pelo preço final", async () => {
    const r = await search.searchProducts(filters({ sort: "price-asc", cat: "mythic-plus" }));
    expect(r.items[0]?.id).toBe(productId);
  });
});
