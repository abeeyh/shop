import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Db = (typeof import("@/db"))["db"];

// Integração com banco real (docs/13 §8). #100: o admin grava eixos e combinações; combinação que saiu
// da lista fica inativa (não é apagada) e o preço do produto vira o menor ("a partir de").
describe.skipIf(!process.env.DATABASE_URL)("variantes no admin (#100)", () => {
  let db: Db;
  let s: typeof import("@/db/schema");
  let q: typeof import("./queries");
  let schemas: typeof import("./schemas");
  let staffId: string;
  let categoryId: string;
  let productId: string | undefined;
  const slug = `test-variants-${Date.now()}`;

  beforeAll(async () => {
    ({ db } = await import("@/db"));
    s = await import("@/db/schema");
    q = await import("./queries");
    schemas = await import("./schemas");
    const [u] = await db.select({ id: s.users.id }).from(s.users).limit(1);
    const [c] = await db.select({ id: s.categories.id }).from(s.categories).limit(1);
    staffId = u!.id;
    categoryId = c!.id;
  });

  afterAll(async () => {
    if (productId) {
      await db.delete(s.auditLog).where(eq(s.auditLog.entityId, productId));
      await db.delete(s.products).where(eq(s.products.id, productId)); // variantes saem em cascata
    }
    await db?.$client.end();
  });

  const input = (variants: string) =>
    schemas.productInput.parse({
      categoryId,
      subcategoryId: "",
      name: "Test Raid",
      slug,
      description: "",
      imageUrl: "",
      price: "",
      addons: "",
      maxQuantity: "1",
      sortOrder: "0",
      active: "on",
      optionAxes: "Bosses | slider | 2/8, 3/8, 4/8",
      variants,
    });
  const variants = () =>
    db
      .select({
        bosses: s.productVariants.options,
        price: s.productVariants.priceUsdtCents,
        active: s.productVariants.active,
      })
      .from(s.productVariants)
      .where(eq(s.productVariants.productId, productId!))
      .orderBy(s.productVariants.sortOrder);

  it("cria o produto com as combinações e o preço 'a partir de'", async () => {
    await q.saveProductRow(staffId, null, input("Bosses=2/8 | 10\nBosses=3/8 | 15\nBosses=4/8 | 20"), null);
    const [p] = await db.select().from(s.products).where(eq(s.products.slug, slug));
    productId = p!.id;
    expect(p!.priceUsdtCents).toBe(1000);
    expect((await variants()).map((v) => [v.bosses.Bosses, v.price, v.active])).toEqual([
      ["2/8", 1000, true],
      ["3/8", 1500, true],
      ["4/8", 2000, true],
    ]);
  });

  it("editar: muda preço, desativa a que saiu e reativa se voltar", async () => {
    await q.saveProductRow(staffId, productId!, input("Bosses=3/8 | 12\nBosses=4/8 | 20"), null);
    expect((await variants()).map((v) => [v.bosses.Bosses, v.price, v.active])).toEqual([
      ["2/8", 1000, false],
      ["3/8", 1200, true],
      ["4/8", 2000, true],
    ]);
    const [p] = await db.select().from(s.products).where(eq(s.products.id, productId!));
    expect(p!.priceUsdtCents).toBe(1200);

    await q.saveProductRow(
      staffId,
      productId!,
      input("Bosses=2/8 | 9\nBosses=3/8 | 12\nBosses=4/8 | 20"),
      null,
    );
    expect((await variants()).every((v) => v.active)).toBe(true);
  });
});
