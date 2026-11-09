import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Db = (typeof import("@/db"))["db"];
type O = typeof import("./overview");
type S = typeof import("@/db/schema");

// Integração com banco real (docs/13 §8). RF-20 (doc 17): "pagos hoje" conta só pedidos pagos de
// hoje no fuso de quem olha; pendente e expirado ficam fora; o valor é o recebido (RN-37).
describe.skipIf(!process.env.DATABASE_URL)("visão geral do admin (RF-20)", () => {
  let db: Db;
  let o: O;
  let s: S;
  const ids: string[] = [];
  const row = (status: "pago" | "pendente" | "concluido", createdAt: Date, paid: number | null) => ({
    email: "overview-test@example.com",
    locale: "en",
    status,
    subtotalUsdtCents: 1000,
    totalUsdtCents: 1000,
    paidUsdtCents: paid,
    expiresAt: new Date(createdAt.getTime() + 30 * 60_000),
    createdAt,
  });

  beforeAll(async () => {
    ({ db } = await import("@/db"));
    o = await import("./overview");
    s = await import("@/db/schema");
  });
  afterAll(async () => {
    if (ids.length) await db.delete(s.orders).where(inArray(s.orders.id, ids));
  });

  it("soma os pagos de hoje (valor recebido) e ignora pendente e os de ontem", async () => {
    const before = await o.adminOverview("UTC");
    const now = new Date();
    const yesterday = new Date(now.getTime() - 36 * 60 * 60 * 1000);
    const rows = await db
      .insert(s.orders)
      .values([
        row("pago", now, 1200),
        row("concluido", now, null),
        row("pendente", now, null),
        row("pago", yesterday, 500),
      ])
      .returning({ id: s.orders.id });
    ids.push(...rows.map((r) => r.id));
    const after = await o.adminOverview("UTC");
    expect(after.paidToday - before.paidToday).toBe(2);
    expect(after.revenueTodayCents - before.revenueTodayCents).toBe(1200 + 1000); // recebido, senão o total
  });

  it("o fuso entra como parâmetro (texto estranho não vira SQL)", async () => {
    await expect(o.adminOverview("UTC'; drop table orders; --")).rejects.toThrow();
    expect((await o.supportOverview()).ordersToDo).toBeGreaterThanOrEqual(0);
  });
});
