import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { and, count, eq, gt, inArray, lte, min, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import {
  bugReports,
  coupons,
  orders,
  promotions,
  staffProfiles,
  supportConversations,
  users,
} from "@/db/schema";

const TO_DO = ["pago", "em_andamento"] as const; // RN-50: pagos esperando entrega
const PAID = ["pago", "em_andamento", "concluido"] as const;
const ENDING_SOON_MS = 3 * 24 * 60 * 60 * 1000;

// RF-20 (doc 17): contagens da visão geral do suporte — agregadas no banco, sem trazer linhas
export async function supportOverview() {
  const [[toDo], [queue], [reports]] = await Promise.all([
    db
      .select({ n: count() })
      .from(orders)
      .where(inArray(orders.status, [...TO_DO])),
    db
      .select({ n: count(), oldest: min(supportConversations.lastMessageAt) })
      .from(supportConversations)
      .where(inArray(supportConversations.status, ["aberta", "em_atendimento"])),
    db.select({ n: count() }).from(bugReports).where(eq(bugReports.status, "novo")),
  ]);
  return { ordersToDo: toDo.n, openChats: queue.n, oldestChat: queue.oldest, newReports: reports.n };
}

// RF-20: o que só o admin vê (RN-06: faturamento, descontos, equipe). "Hoje" no fuso de quem olha.
// shortcut: pago = criado hoje e já pago (sem coluna paid_at; o pagamento chega em até 30 min — RN-34)
export async function adminOverview(timeZone: string) {
  const now = new Date();
  const soon = new Date(now.getTime() + ENDING_SOON_MS);
  const today = sql`date_trunc('day', now() at time zone ${timeZone}) at time zone ${timeZone}`;
  const endingSoon = (t: typeof promotions | typeof coupons) =>
    db
      .select({ n: count() })
      .from(t)
      .where(and(eq(t.active, true), gt(t.endsAt, now), lte(t.endsAt, soon)));
  const [[sales], [promos], [codes], [no2fa]] = await Promise.all([
    db
      .select({ n: count(), cents: sum(sql`coalesce(${orders.paidUsdtCents}, ${orders.totalUsdtCents})`) })
      .from(orders)
      .where(and(inArray(orders.status, [...PAID]), sql`${orders.createdAt} >= ${today}`)),
    endingSoon(promotions),
    endingSoon(coupons),
    db
      .select({ n: count() })
      .from(staffProfiles)
      .innerJoin(users, eq(users.id, staffProfiles.userId))
      .where(and(eq(staffProfiles.active, true), eq(users.twoFactorEnabled, false))),
  ]);
  return {
    paidToday: sales.n,
    revenueTodayCents: Number(sales.cents ?? 0),
    endingSoon: promos.n + codes.n,
    staffWithout2fa: no2fa.n,
  };
}
