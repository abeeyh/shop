import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { deliveries, orderItems, orders } from "@/db/schema";
import { saveAudited } from "@/features/admin/audit";
import { ADMIN_PAGE_SIZE } from "@/lib/pagination";
import { STAFF_STEPS, type OrderStatus, type StaffStep } from "./rules";

// Fila da equipe (RN-06): sem e-mail completo na lista. #88: só a página pedida sai do banco.
export async function listOrdersForStaff(status: OrderStatus[] | null, page = 1) {
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalUsdtCents: orders.totalUsdtCents,
      createdAt: orders.createdAt,
      assignedTo: orders.assignedTo,
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(orders)
    .where(status ? inArray(orders.status, status) : undefined)
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(ADMIN_PAGE_SIZE)
    .offset((page - 1) * ADMIN_PAGE_SIZE);
  return { rows, total: rows[0]?.total ?? 0 };
}

export async function getOrderForStaff(id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return null;
  const [items, [delivery]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.id)),
    db.select().from(deliveries).where(eq(deliveries.orderId, id)),
  ]);
  return { ...order, items, delivery: delivery ?? null };
}

export const getDelivery = async (orderId: string) =>
  (await db.select().from(deliveries).where(eq(deliveries.orderId, orderId)))[0] ?? null;

// RN-50/RN-52/RN-07: UPDATE condicional (dois cliques não pulam etapa) + prova + auditoria juntos
export async function advanceOrder(
  staffId: string,
  id: string,
  step: StaffStep,
  proof?: { proofUrl: string; note: string },
): Promise<boolean> {
  const { from, to } = STAFF_STEPS[step];
  let moved = false;
  await saveAudited(
    "order",
    staffId,
    id,
    async (tx, key) => (await tx.select().from(orders).where(eq(orders.id, key)))[0],
    async (tx) => {
      const [r] = await tx
        .update(orders)
        .set({ status: to, updatedAt: new Date(), ...(step === "start" ? { assignedTo: staffId } : {}) })
        .where(and(eq(orders.id, id), eq(orders.status, from)))
        .returning({ id: orders.id });
      if (r && proof) await tx.insert(deliveries).values({ orderId: id, staffId, ...proof });
      moved = !!r;
      return r?.id;
    },
  );
  return moved;
}
