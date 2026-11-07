import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { bugReports } from "@/db/schema";
import { saveAudited } from "@/features/admin/audit";

export type NewReport = typeof bugReports.$inferInsert;

export async function insertReport(r: NewReport) {
  await db.insert(bugReports).values(r);
}

// RN-91: chegam ao admin (suporte e admin — RN-06), novos primeiro
export const listReports = (status: "novo" | "resolvido" | null) =>
  db
    .select()
    .from(bugReports)
    .where(status ? eq(bugReports.status, status) : undefined)
    .orderBy(desc(bugReports.createdAt))
    .limit(200);

// RN-07: ação da equipe em reporte entra na auditoria
export const resolveReport = (staffId: string, id: string) =>
  saveAudited(
    "bug_report",
    staffId,
    id,
    async (tx, key) => (await tx.select().from(bugReports).where(eq(bugReports.id, key)))[0],
    async (tx) => {
      const [r] = await tx
        .update(bugReports)
        .set({ status: "resolvido" })
        .where(eq(bugReports.id, id))
        .returning({ id: bugReports.id });
      return r?.id;
    },
  );
