import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integração com banco real (docs/13 §8). #110: sugestões da busca do cabeçalho (seed + catálogo).
describe.skipIf(!process.env.DATABASE_URL)("sugestões da busca (#110, RN-100)", () => {
  let suggest: typeof import("./suggest").suggest;
  let db: (typeof import("@/db"))["db"];

  beforeAll(async () => {
    ({ suggest } = await import("./suggest"));
    ({ db } = await import("@/db"));
  });
  afterAll(async () => {
    await db?.$client.end();
  });

  it('"ven" traz Venomous Abyss primeiro (começo do nome)', async () => {
    const r = await suggest("en", "ven");
    expect(r.products[0]?.name).toMatch(/^Venomous Abyss/);
    expect(r.products[0]?.href).toMatch(/^\/en\/wow\//);
    expect(r.products.length).toBeLessThanOrEqual(6);
  });

  it("acha categoria pelo nome e tolera erro de digitação", async () => {
    expect((await suggest("en", "raid")).categories.map((c) => c.name)).toContain("Raids");
    expect((await suggest("en", "mithic")).products.some((p) => /Mythic/.test(p.name))).toBe(true);
  });

  it("curinga do ILIKE é texto: % e _ não trazem tudo", async () => {
    const r = await suggest("en", "%_");
    expect(r.products).toEqual([]);
    expect(r.categories).toEqual([]);
  });
});
