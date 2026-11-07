import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type Db = (typeof import("@/db"))["db"];

// Integração com banco real (docs/13 §8). Import no beforeAll: o describe roda na coleta mesmo pulado.
describe.skipIf(!process.env.DATABASE_URL)("access-log (banco real)", () => {
  let db: Db;
  let mod: typeof import("./index");
  let schema: typeof import("@/db/schema");

  beforeAll(async () => {
    ({ db } = await import("@/db"));
    mod = await import("./index");
    schema = await import("@/db/schema");
  });

  afterAll(async () => {
    await db?.execute(sql`delete from access_logs where request_id like 'teste-%'`);
    await db?.$client.end();
    const { accessLogDb } = await import("@/db/access-log-client");
    await accessLogDb.$client.end();
  });

  it("grava IP do header confiável e rota sem query string", async () => {
    await mod.recordAccess({
      headers: new Headers({ "x-forwarded-for": "203.0.113.9" }),
      method: "GET",
      pathname: "/en/produtos",
      requestId: "teste-grava",
    });
    const [row] = await db
      .select()
      .from(schema.accessLogs)
      .where(eq(schema.accessLogs.requestId, "teste-grava"));
    expect(row?.ip).toBe("203.0.113.9");
    expect(row?.route).toBe("/en/produtos");
  });

  it("não grava /api/health", async () => {
    await mod.recordAccess({
      headers: new Headers(),
      method: "GET",
      pathname: "/api/health",
      requestId: "teste-health",
    });
    const rows = await db
      .select()
      .from(schema.accessLogs)
      .where(eq(schema.accessLogs.requestId, "teste-health"));
    expect(rows).toHaveLength(0);
  });

  it("limpeza apaga só o que passou de 6 meses", async () => {
    const now = new Date("2026-11-06T00:00:00Z");
    await db.insert(schema.accessLogs).values([
      {
        method: "GET",
        route: "/velho",
        requestId: "teste-velho",
        occurredAt: new Date("2026-05-05T00:00:00Z"),
      },
      {
        method: "GET",
        route: "/novo",
        requestId: "teste-novo",
        occurredAt: new Date("2026-05-07T00:00:00Z"),
      },
    ]);
    await mod.purgeAccessLogs(now);
    const ids = (await db.select().from(schema.accessLogs)).map((r) => r.requestId);
    expect(ids).not.toContain("teste-velho");
    expect(ids).toContain("teste-novo");
  });
});
