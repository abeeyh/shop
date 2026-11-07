// Tabelas do banco (docs/04 — Modelo de dados). Cada feature acrescenta as suas aqui
// e gera a migração com `pnpm db:generate`.
import { bigserial, index, inet, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Log de acesso legal — Marco Civil art. 15, 6 meses (docs/16 §9). Não é ferramenta de depuração.
export const accessLogs = pgTable(
  "access_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    ip: inet("ip"),
    port: integer("port"),
    userId: text("user_id"),
    sessionId: text("session_id"),
    method: text("method").notNull(),
    route: text("route").notNull(),
    requestId: text("request_id").notNull(),
  },
  (t) => [index("access_logs_occurred_at_idx").on(t.occurredAt)],
);
