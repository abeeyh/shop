import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "@/lib/env";
import * as schema from "./schema";

if (!env.DATABASE_URL) throw new Error("DATABASE_URL não configurada (ver .env.example).");

// Só para código de servidor: queries.ts das features, rotas e actions.
export const db = drizzle(env.DATABASE_URL, { schema });
