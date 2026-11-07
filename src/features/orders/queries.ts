import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, asc, eq, gt, inArray, isNotNull, lt, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { couponRedemptions, coupons, orderItems, orders, paymentEvents, raidSlots } from "@/db/schema";
import { PAY_CURRENCY } from "@/lib/payments/crypto";
import { inWindow } from "@/features/pricing/rules";
import { nextStatus, settle, type Network, type OrderStatus, type PaymentOutcome } from "./rules";

export type NewOrder = {
  email: string;
  locale: string;
  network: Network;
  subtotalUsdtCents: number;
  discountUsdtCents: number;
  discountSource: "promotion" | "coupon" | "none";
  discountRef: string | null; // id do cupom
  totalUsdtCents: number;
  expiresAt: Date;
  items: {
    productId: string;
    raidSlotId: string | null;
    variantId: string | null;
    productName: string;
    options: unknown;
    unitPriceUsdtCents: number;
    discountUsdtCents: number;
    promotionId: string | null;
    quantity: number;
  }[];
};

export class SoldOutError extends Error {}
export class CouponLimitError extends Error {}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// RN-34 / RN-11: reserva a vaga na mesma transação do pedido; sem vaga (ou horário passado) = nada
// é criado. Condição no UPDATE: dois checkouts simultâneos não passam da capacidade.
async function reserveSeat(tx: Tx, slotId: string) {
  const [ok] = await tx
    .update(raidSlots)
    .set({ reserved: sql`${raidSlots.reserved} + 1`, updatedAt: new Date() })
    .where(
      and(
        eq(raidSlots.id, slotId),
        eq(raidSlots.active, true),
        lt(raidSlots.reserved, raidSlots.capacity),
        gt(raidSlots.startsAt, sql`now()`),
      ),
    )
    .returning({ id: raidSlots.id });
  if (!ok) throw new SoldOutError();
}

// RN-25/RN-27: limites de uso conferidos com a linha do cupom travada (dois checkouts não passam)
async function reserveCoupon(tx: Tx, couponId: string, email: string, orderId: string) {
  const [c] = await tx
    .select({
      max: coupons.maxUses,
      perEmail: coupons.maxUsesPerEmail,
      active: coupons.active,
      startsAt: coupons.startsAt,
      endsAt: coupons.endsAt,
    })
    .from(coupons)
    .where(eq(coupons.id, couponId))
    .for("update");
  if (!c || !inWindow(c, new Date())) throw new CouponLimitError(); // desativado/vencido no meio
  const open = and(
    eq(couponRedemptions.couponId, couponId),
    inArray(couponRedemptions.status, ["reserved", "used"]),
  );
  const total = await tx.$count(couponRedemptions, open);
  const mine = await tx.$count(couponRedemptions, and(open, eq(couponRedemptions.email, email)));
  if ((c.max !== null && total >= c.max) || (c.perEmail !== null && mine >= c.perEmail))
    throw new CouponLimitError();
  await tx.insert(couponRedemptions).values({ couponId, orderId, email });
}

export async function insertOrder({ items, ...order }: NewOrder): Promise<string> {
  return db.transaction(async (tx) => {
    for (const i of items) if (i.raidSlotId) await reserveSeat(tx, i.raidSlotId);
    const [row] = await tx.insert(orders).values(order).returning({ id: orders.id });
    await tx.insert(orderItems).values(items.map((i) => ({ ...i, orderId: row!.id })));
    if (order.discountSource === "coupon" && order.discountRef)
      await reserveCoupon(tx, order.discountRef, order.email, row!.id);
    return row!.id;
  });
}

export async function setInvoice(id: string, provider: string, providerPaymentId: string, payUrl: string) {
  await db
    .update(orders)
    .set({ provider, providerPaymentId, payUrl, updatedAt: new Date() })
    .where(eq(orders.id, id));
}

// RN-34/RN-50: só pedido `pendente` expira (o IPN trava a linha; pago no meio do caminho não expira)
// e as vagas voltam na mesma transação
async function expireWhere(where: SQL | undefined): Promise<number> {
  return db.transaction(async (tx) => {
    const expired = await tx
      .update(orders)
      .set({ status: "expirado", updatedAt: new Date() })
      .where(and(eq(orders.status, "pendente"), where))
      .returning({ id: orders.id });
    if (!expired.length) return 0;
    const ids = expired.map((o) => o.id);
    await tx // RN-27: cupom reservado volta a valer
      .update(couponRedemptions)
      .set({ status: "released" })
      .where(and(inArray(couponRedemptions.orderId, ids), eq(couponRedemptions.status, "reserved")));
    const seats = await tx
      .select({ slotId: orderItems.raidSlotId, n: sql<number>`count(*)::int` })
      .from(orderItems)
      .where(and(inArray(orderItems.orderId, ids), isNotNull(orderItems.raidSlotId)))
      .groupBy(orderItems.raidSlotId);
    for (const s of seats)
      await tx
        .update(raidSlots)
        .set({ reserved: sql`greatest(${raidSlots.reserved} - ${s.n}, 0)`, updatedAt: new Date() })
        .where(eq(raidSlots.id, s.slotId!));
    return expired.length;
  });
}

export const markExpired = (id: string) => expireWhere(eq(orders.id, id));

// cron /api/cron/expire-orders: pendente com prazo vencido (RN-34)
export const expireDueOrders = (now = new Date()) => expireWhere(lt(orders.expiresAt, now));

export async function getOrder(id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return null;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id))
    .orderBy(asc(orderItems.id));
  return { ...order, items };
}

export type PaymentEvent = {
  provider: string;
  eventId: string;
  paymentId: string;
  orderId: string;
  type: string;
  outcome: PaymentOutcome | null;
  priceCents: number; // valor da fatura
  payCurrency: string;
  payAmountCents: number; // quanto a fatura pediu na moeda paga
  paidCents: number; // quanto chegou na moeda paga
  txHash?: string;
};

export type ApplyResult =
  "duplicate" | "unknown_order" | "mismatch" | "late_payment" | "ignored" | OrderStatus;

const OPEN: OrderStatus[] = ["pendente", "pagamento_parcial"];

type LockedOrder = { status: OrderStatus; total: number; network: Network | null; paid: number | null };

// IPN que não bate com o pedido (outra rede ou outro valor) nunca muda o estado
const matches = (o: LockedOrder, e: PaymentEvent) =>
  o.network !== null && PAY_CURRENCY[o.network] === e.payCurrency && e.priceCents === o.total;

const eventRow = (e: PaymentEvent) => ({
  provider: e.provider,
  providerEventId: e.eventId,
  orderId: e.orderId,
  type: e.type,
  paymentId: e.paymentId,
  payCurrency: e.payCurrency,
  paidUsdtCents: e.paidCents,
  txHash: e.txHash ?? null,
});

type Decision = Exclude<ApplyResult, OrderStatus> | { status: OrderStatus; paid: number };

// RN-37: pago × parcial compara o que chegou com o que a fatura pediu (mesma moeda)
function decide(order: LockedOrder, e: PaymentEvent): Decision {
  if (!matches(order, e)) return "mismatch";
  if (!e.outcome) return "ignored";
  if (!OPEN.includes(order.status)) return e.outcome === "expired" ? "ignored" : "late_payment";
  const next = nextStatus(order.status, settle(e.outcome, e.paidCents, e.payAmountCents));
  // parcial que cresce continua parcial, mas o valor recebido é atualizado
  const paid = Math.max(order.paid ?? 0, e.paidCents);
  if (!next && paid === order.paid) return "ignored";
  return { status: next ?? order.status, paid };
}

// RN-32/RN-33: grava o evento (único) e muda o pedido na mesma transação; repetido = sem efeito
export async function applyPaymentEvent(e: PaymentEvent): Promise<ApplyResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({
        status: orders.status,
        total: orders.totalUsdtCents,
        network: orders.network,
        paid: orders.paidUsdtCents,
      })
      .from(orders)
      .where(eq(orders.id, e.orderId))
      .for("update");
    if (!order) return "unknown_order";
    const inserted = await tx
      .insert(paymentEvents)
      .values(eventRow(e))
      .onConflictDoNothing()
      .returning({ id: paymentEvents.id });
    if (inserted.length === 0) return "duplicate";
    const d = decide(order, e);
    if (typeof d === "string") return d;
    await tx
      .update(orders)
      .set({ status: d.status, paidUsdtCents: d.paid, txHash: e.txHash ?? null, updatedAt: new Date() })
      .where(eq(orders.id, e.orderId));
    if (d.status === "pago")
      await tx // RN-27: o cupom conta como usado quando o pedido é pago
        .update(couponRedemptions)
        .set({ status: "used" })
        .where(eq(couponRedemptions.orderId, e.orderId));
    return d.status;
  });
}
