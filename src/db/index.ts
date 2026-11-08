import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "@/lib/env";
import * as schema from "./schema";

function connect() {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL não configurada (ver .env.example).");
  return drizzle(env.DATABASE_URL, { schema });
}

let instance: ReturnType<typeof connect> | undefined;

// Só para código de servidor: queries.ts das features, rotas e actions. Conecta no 1º uso: o build da
// imagem (sem DATABASE_URL) carrega as rotas para ler a configuração e não pode falhar ao importar.
export const db = new Proxy({} as ReturnType<typeof connect>, {
  get: (_, key) => Reflect.get((instance ??= connect()), key),
});
