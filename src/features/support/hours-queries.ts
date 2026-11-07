import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, supportHours } from "@/db/schema";
import type { Window } from "./hours";

export const listHours = (): Promise<Window[]> =>
  db
    .select({ weekday: supportHours.weekday, startMin: supportHours.startMin, endMin: supportHours.endMin })
    .from(supportHours)
    .orderBy(asc(supportHours.weekday));

// troca a semana inteira de uma vez e audita antes/depois (RN-07, RN-71)
export async function replaceHours(staffId: string, hours: Window[]) {
  await db.transaction(async (tx) => {
    const before = await tx.select().from(supportHours);
    await tx.delete(supportHours);
    if (hours.length) await tx.insert(supportHours).values(hours);
    await tx.insert(auditLog).values({
      staffId,
      entity: "support_hours",
      entityId: "week",
      action: "update",
      before: { hours: before.map(({ weekday, startMin, endMin }) => ({ weekday, startMin, endMin })) },
      after: { hours },
    });
  });
}
