import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Db = (typeof import("@/db"))["db"];
type Q = typeof import("./queries");
type S = typeof import("@/db/schema");

// Integração com banco real (docs/13 §8). Doc 17 §3 + RN-72: exclui só o que nunca foi usado; o banco
// decide pela chave estrangeira; a exclusão entra na auditoria (RN-71).
describe.skipIf(!process.env.DATABASE_URL)("excluir do catálogo (RN-72)", () => {
  let db: Db;
  let q: Q;
  let s: S;
  let staffId: string;
  const tag = `del-${Date.now().toString(36)}`;
  const cats: string[] = [];
  const prods: string[] = [];

  beforeAll(async () => {
    ({ db } = await import("@/db"));
    q = await import("./queries");
    s = await import("@/db/schema");
    // membro da equipe do próprio teste (a auditoria exige um autor real; na CI o banco começa vazio)
    staffId = `test-${tag}`;
    await db
      .insert(s.users)
      .values({ id: staffId, name: tag, email: `${tag}@shop.test`, emailVerified: true });
    await db.insert(s.staffProfiles).values({ userId: staffId, role: "admin" });
  });
  afterAll(async () => {
    if (prods.length) await db.delete(s.products).where(inArray(s.products.id, prods));
    if (cats.length) await db.delete(s.categories).where(inArray(s.categories.id, cats));
    await db.delete(s.auditLog).where(eq(s.auditLog.staffId, staffId));
    await db.delete(s.users).where(eq(s.users.id, staffId)); // perfil da equipe sai em cascata
  });

  const category = async (suffix: string) => {
    const [c] = await db
      .insert(s.categories)
      .values({ slug: `${tag}-${suffix}`, name: `${tag} ${suffix}`, kind: "dungeon", description: "" })
      .returning({ id: s.categories.id });
    cats.push(c!.id);
    return c!.id;
  };

  it("sem uso: exclui e registra o 'antes' na auditoria", async () => {
    const id = await category("free");
    expect(await q.deleteCatalogRow("category", staffId, id)).toBe("ok");
    expect(await db.select().from(s.categories).where(eq(s.categories.id, id))).toHaveLength(0);
    const [log] = await db
      .select()
      .from(s.auditLog)
      .where(and(eq(s.auditLog.entityId, id), eq(s.auditLog.action, "delete")));
    expect((log!.before as { slug: string }).slug).toBe(`${tag}-free`);
  });

  it("em uso (tem produto): recusa e não apaga nada", async () => {
    const id = await category("used");
    const [p] = await db
      .insert(s.products)
      .values({ categoryId: id, name: `${tag} p`, slug: `${tag}-p`, priceUsdtCents: 100 })
      .returning({ id: s.products.id });
    prods.push(p!.id);
    expect(await q.deleteCatalogRow("category", staffId, id)).toBe("inUse");
    expect(await db.select().from(s.categories).where(eq(s.categories.id, id))).toHaveLength(1);
  });

  it("id inexistente: nada acontece", async () => {
    expect(await q.deleteCatalogRow("coupon", staffId, "00000000-0000-4000-8000-000000000000")).toBe(
      "missing",
    );
  });
});
