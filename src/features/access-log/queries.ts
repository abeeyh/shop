import { lt } from "drizzle-orm";
import { accessLogDb } from "@/db/access-log-client";
import { accessLogs } from "@/db/schema";

export type AccessLogRow = typeof accessLogs.$inferInsert;

export async function insertAccessLog(row: AccessLogRow): Promise<void> {
  await accessLogDb.insert(accessLogs).values(row);
}

export async function deleteAccessLogsBefore(cutoff: Date): Promise<number> {
  const deleted = await accessLogDb
    .delete(accessLogs)
    .where(lt(accessLogs.occurredAt, cutoff))
    .returning({ id: accessLogs.id });
  return deleted.length;
}
