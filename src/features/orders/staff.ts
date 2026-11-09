import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, deliveries, orderItems, orders, users } from "@/db/schema";
import { saveAudited } from "@/features/admin/audit";
import { canonicalEmail } from "@/features/discounts/queries";
import { ADMIN_PAGE_SIZE } from "@/lib/pagination";
import { STAFF_STEPS, type OrderStatus, type StaffStep } from "./rules";

// RF-21 (doc 17): busca da fila — começo do ID (hex) ou e-mail exato. Outro texto não acha nada
// (sem busca parcial por e-mail: a lista nunca mostra e-mail — RN-06).
export function orderSearchKind(q: string | undefined): "none" | "id" | "email" | "invalid" {
  const term = q?.trim().toLowerCase() ?? "";
  if (!term) return "none";
  if (/^[0-9a-f-]{4,36}$/.test(term)) return "id";
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(term) && term.length <= 254) return "email";
  return "invalid";
}

// Fila da equipe (RN-06): sem e-mail completo na lista. #88: só a página pedida sai do banco.
export async function listOrdersForStaff(status: OrderStatus[] | null, page = 1, q?: string) {
  const kind = orderSearchKind(q);
  const term = q?.trim().toLowerCase() ?? "";
  const search = {
    none: undefined,
    id: sql`${orders.id}::text like ${`${term}%`}`,
    email: eq(orders.email, canonicalEmail(term)),
    invalid: sql`false`,
  }[kind];
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalUsdtCents: orders.totalUsdtCents,
      createdAt: orders.createdAt,
      assignedTo: orders.assignedTo,
      assignee: users.email, // quem assumiu (equipe)
      total: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(orders)
    .leftJoin(users, eq(users.id, orders.assignedTo))
    .where(and(status ? inArray(orders.status, status) : undefined, search))
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

// RF-22 (doc 17): linha do tempo do pedido — cada passo da equipe vem da auditoria (RN-07)
export async function orderTimeline(id: string) {
  const rows = await db
    .select({ at: auditLog.createdAt, who: users.email, after: auditLog.after })
    .from(auditLog)
    .innerJoin(users, eq(users.id, auditLog.staffId))
    .where(and(eq(auditLog.entity, "order"), eq(auditLog.entityId, id)))
    .orderBy(asc(auditLog.createdAt));
  return rows.map((r) => ({
    at: r.at,
    who: r.who,
    status: (r.after as { status?: OrderStatus } | null)?.status ?? null,
  }));
}

// RF-24 (doc 17): pedidos do mesmo e-mail ao lado da conversa (sem mostrar o e-mail — RN-06)
export const listOrdersByEmail = (email: string, limit = 5) =>
  db
    .select({
      id: orders.id,
      status: orders.status,
      totalUsdtCents: orders.totalUsdtCents,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.email, canonicalEmail(email)))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
