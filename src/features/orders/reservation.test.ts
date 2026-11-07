import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Db = (typeof import("@/db"))["db"];
type Q = typeof import("./queries");
type S = typeof import("@/db/schema");

// Integração com banco real (docs/13 §8). RN-34: reserva no checkout, devolução na expiração.
describe.skipIf(!process.env.DATABASE_URL)("reserva de vaga (RN-34)", () => {
  let db: Db;
  let q: Q;
  let s: S;
  let productId: string;
  let slotId: string;

  const order = (raidSlotId: string) => ({
    email: "test@example.com",
    locale: "en",
    network: "trc20" as const,
    subtotalUsdtCents: 100,
    totalUsdtCents: 100,
    expiresAt: new Date(Date.now() + 30 * 60_000),
    items: [
      {
        productId,
        raidSlotId,
        productName: "t",
        options: {},
        unitPriceUsdtCents: 100,
        quantity: 1,
      },
    ],
  });
  const reserved = async () =>
    (await db.select().from(s.raidSlots).where(eq(s.raidSlots.id, slotId)))[0]!.reserved;

  beforeAll(async () => {
    ({ db } = await import("@/db"));
    q = await import("./queries");
    s = await import("@/db/schema");
    const [p] = await db.select({ id: s.products.id }).from(s.products).limit(1);
    productId = p!.id;
    const [slot] = await db
      .insert(s.raidSlots)
      .values({ productId, startsAt: new Date(Date.now() + 86_400_000), capacity: 2 })
      .returning({ id: s.raidSlots.id });
    slotId = slot!.id;
  });

  afterAll(async () => {
    if (slotId) {
      await db.delete(s.orderItems).where(eq(s.orderItems.raidSlotId, slotId));
      await db.delete(s.raidSlots).where(eq(s.raidSlots.id, slotId));
    }
    await db?.$client.end();
  });

  it("reserva até a capacidade; o próximo checkout é recusado sem criar pedido", async () => {
    const a = await q.insertOrder(order(slotId));
    await q.insertOrder(order(slotId));
    expect(await reserved()).toBe(2);
    await expect(q.insertOrder(order(slotId))).rejects.toBeInstanceOf(q.SoldOutError);
    expect(await reserved()).toBe(2);

    // pedido pago não expira e não devolve a vaga
    await db.update(s.orders).set({ status: "pago" }).where(eq(s.orders.id, a));
    await db
      .update(s.orders)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(s.orders.id, a));
    expect(await q.markExpired(a)).toBe(0);
    expect(await reserved()).toBe(2);
  });

  it("pendente vencido expira e devolve a vaga; rodar de novo não devolve duas vezes", async () => {
    const rows = await db
      .select({ id: s.orders.id, status: s.orders.status })
      .from(s.orders)
      .innerJoin(s.orderItems, eq(s.orderItems.orderId, s.orders.id))
      .where(eq(s.orderItems.raidSlotId, slotId));
    const open = rows.find((r) => r.status === "pendente")!;
    await db
      .update(s.orders)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(s.orders.id, open.id));
    expect(await q.expireDueOrders()).toBeGreaterThanOrEqual(1);
    expect(await reserved()).toBe(1);
    await q.expireDueOrders();
    expect(await reserved()).toBe(1);
  });
});
