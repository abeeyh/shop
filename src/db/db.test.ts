import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Db = (typeof import("./index"))["db"];

// Integração com banco real (docs/13 §8): roda no CI e localmente com DATABASE_URL definida.
// O import fica no beforeAll: o corpo do describe roda na coleta mesmo quando a suíte é pulada.
describe.skipIf(!process.env.DATABASE_URL)("db", () => {
  let db: Db;

  beforeAll(async () => {
    ({ db } = await import("./index"));
  });

  afterAll(async () => {
    await db?.$client.end();
  });

  it("conecta no PostgreSQL e executa consulta", async () => {
    const rows = await db.execute<{ ok: number }>(sql`select 1 as ok`);
    expect(rows[0]?.ok).toBe(1);
  });

  it("migrações aplicadas (tabela de controle do drizzle existe)", async () => {
    const rows = await db.execute<{ exists: boolean }>(
      sql`select to_regclass('drizzle.__drizzle_migrations') is not null as exists`,
    );
    expect(rows[0]?.exists).toBe(true);
  });
});
