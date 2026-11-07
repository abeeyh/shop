import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Db = (typeof import("@/db"))["db"];
type Q = typeof import("./queries");
type S = typeof import("@/db/schema");

// Integração com banco real (docs/13 §8). RN-25/RN-27: limite de uso com reserva e liberação.
describe.skipIf(!process.env.DATABASE_URL)("limite de uso do cupom (RN-25, RN-27)", () => {
  let db: Db;
  let q: Q;
  let s: S;
  let productId: string;
  let couponId: string;
  const now = Date.now();

  const order = (email: string) => ({
    email,
    locale: "en",
    network: "trc20" as const,
    subtotalUsdtCents: 1000,
    discountUsdtCents: 100,
    discountSource: "coupon" as const,
    discountRef: couponId,
    totalUsdtCents: 900,
    expiresAt: new Date(now + 30 * 60_000),
    items: [
      {
        productId,
        raidSlotId: null,
        productName: "t",
        options: {},
        unitPriceUsdtCents: 1000,
        discountUsdtCents: 0,
        promotionId: null,
        quantity: 1,
      },
    ],
  });
  const status = async (orderId: string) =>
    (await db.select().from(s.couponRedemptions).where(eq(s.couponRedemptions.orderId, orderId)))[0]?.status;

  beforeAll(async () => {
    ({ db } = await import("@/db"));
    q = await import("./queries");
    s = await import("@/db/schema");
    const [p] = await db
      .select({ id: s.products.id })
      .from(s.products)
      .where(eq(s.products.slug, "mythic-plus-10")); // produto do seed, nunca um criado pelo E2E
    productId = p!.id;
    const [c] = await db
      .insert(s.coupons)
      .values({
        code: `test-limit-${now}`,
        type: "percent",
        value: 10,
        scope: "store",
        startsAt: new Date(now - 60_000),
        endsAt: new Date(now + 86_400_000),
        maxUses: 1,
      })
      .returning({ id: s.coupons.id });
    couponId = c!.id;
  });

  afterAll(async () => {
    if (couponId) {
      const rows = await db
        .select()
        .from(s.couponRedemptions)
        .where(eq(s.couponRedemptions.couponId, couponId));
      await db.delete(s.couponRedemptions).where(eq(s.couponRedemptions.couponId, couponId));
      for (const r of rows) {
        await db.delete(s.paymentEvents).where(eq(s.paymentEvents.orderId, r.orderId));
        await db.delete(s.orders).where(eq(s.orders.id, r.orderId));
      }
      await db.delete(s.coupons).where(eq(s.coupons.id, couponId));
    }
    await db?.$client.end();
  });

  it("limite total 1: o segundo pedido é recusado; expirar libera; pagar marca como usado", async () => {
    const first = await q.insertOrder(order("a@example.com"));
    expect(await status(first)).toBe("reserved");
    await expect(q.insertOrder(order("b@example.com"))).rejects.toBeInstanceOf(q.CouponLimitError);

    await q.markExpired(first);
    expect(await status(first)).toBe("released");

    const second = await q.insertOrder(order("b@example.com"));
    await db.update(s.orders).set({ network: "trc20" }).where(eq(s.orders.id, second));
    const result = await q.applyPaymentEvent({
      provider: "test",
      eventId: `test-${now}`,
      paymentId: "1",
      orderId: second,
      type: "finished",
      outcome: "paid",
      priceCents: 900,
      payCurrency: "usdttrc20",
      payAmountCents: 900,
      paidCents: 900,
    });
    expect(result).toBe("pago");
    expect(await status(second)).toBe("used");
  });
});
