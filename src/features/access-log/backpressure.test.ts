import { afterEach, describe, expect, it, vi } from "vitest";

// Banco travado: gravações pendentes param em MAX_IN_FLIGHT (revisão de segurança da #10).
describe("access-log — limite de gravações pendentes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.doUnmock("./queries");
  });

  it("descarta além do limite em vez de enfileirar sem fim", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5999/x");
    const insert = vi.fn(() => new Promise<void>(() => undefined)); // nunca termina: banco travado
    vi.doMock("./queries", () => ({ insertAccessLog: insert, deleteAccessLogsBefore: vi.fn() }));
    const mod = await import("./index");
    const req = { headers: new Headers(), method: "GET", pathname: "/en", requestId: "r" };
    for (let i = 0; i < mod.MAX_IN_FLIGHT + 20; i++) void mod.recordAccess(req);
    await vi.waitFor(() => expect(insert).toHaveBeenCalledTimes(mod.MAX_IN_FLIGHT));
    await new Promise((r) => setTimeout(r, 50));
    expect(insert).toHaveBeenCalledTimes(mod.MAX_IN_FLIGHT);
  });
});
