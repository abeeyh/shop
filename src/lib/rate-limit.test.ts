import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

type Mod = typeof import("./rate-limit");

describe("rate limit — sem Valkey (docs/09 §2)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("tráfego geral passa (failClosed=false) e rota sensível bloqueia (failClosed=true)", async () => {
    vi.stubEnv("VALKEY_URL", "");
    const { rateLimit } = await import("./rate-limit");
    expect((await rateLimit({ key: "x", limit: 1, windowMs: 1000 })).allowed).toBe(true);
    expect((await rateLimit({ key: "x", limit: 1, windowMs: 1000, failClosed: true })).allowed).toBe(false);
  });

  it("Valkey fora do ar: falha rápido, sem lançar erro", async () => {
    vi.stubEnv("VALKEY_URL", "redis://127.0.0.1:1"); // porta fechada
    const { rateLimit } = await import("./rate-limit");
    const started = Date.now();
    const result = await rateLimit({ key: "x", limit: 1, windowMs: 1000 });
    expect(result.allowed).toBe(true);
    expect(Date.now() - started).toBeLessThan(2000);
    const { getValkey } = await import("./valkey");
    getValkey()?.disconnect();
  });

  it("429 com Retry-After em segundos, código estável e requestId", async () => {
    const { tooManyRequests } = await import("./rate-limit");
    const res = tooManyRequests({ allowed: false, remaining: 0, resetMs: 1500 }, "req-1");
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("2");
    expect(await res.json()).toEqual({
      error: { code: "rate_limited", message: "Too many requests", requestId: "req-1" },
    });
  });
});

// Integração com Valkey real (docs/13 §8): roda no CI e localmente com VALKEY_URL definida.
describe.skipIf(!process.env.VALKEY_URL)("rate limit — Valkey real", () => {
  let mod: Mod;
  const key = `teste:${Date.now()}:${Math.random()}`;

  beforeAll(async () => {
    mod = await import("./rate-limit");
  });

  afterAll(async () => {
    const { getValkey } = await import("./valkey");
    await getValkey()?.quit();
  });

  it("permite até o limite e bloqueia o excedente", async () => {
    const opts = { key, limit: 2, windowMs: 5000 };
    const results = [await mod.rateLimit(opts), await mod.rateLimit(opts), await mod.rateLimit(opts)];
    expect(results.map((r) => r.allowed)).toEqual([true, true, false]);
    expect(results[1]?.remaining).toBe(0);
    expect(results[2]?.resetMs).toBeGreaterThan(0);
  });

  it("chaves diferentes não se misturam", async () => {
    expect((await mod.rateLimit({ key: `${key}:outra`, limit: 1, windowMs: 5000 })).allowed).toBe(true);
  });

  it("janela expira e libera de novo", async () => {
    const opts = { key: `${key}:janela`, limit: 1, windowMs: 150 };
    expect((await mod.rateLimit(opts)).allowed).toBe(true);
    expect((await mod.rateLimit(opts)).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 250));
    expect((await mod.rateLimit(opts)).allowed).toBe(true);
  });
});
