import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "@/lib/env";

if (!env.DATABASE_URL) throw new Error("DATABASE_URL não configurada (ver .env.example).");

// Pool próprio e pequeno para o log de acesso: com banco lento ele falha rápido
// e não disputa conexões com checkout e webhooks (revisão de segurança da #10).
export const accessLogDb = drizzle({
  connection: {
    url: env.DATABASE_URL,
    max: 2,
    connect_timeout: 3,
    idle_timeout: 30,
    connection: { statement_timeout: 3000 },
  },
});
