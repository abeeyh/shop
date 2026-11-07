import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import proxy from "./proxy";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Next repassa à app os headers de request alterados no proxy com este prefixo
const forwarded = (res: Response) => res.headers.get("x-middleware-request-x-request-id");

describe("proxy — requestId (docs/16 §3)", () => {
  it("API: devolve x-request-id e repassa o mesmo id para a rota", async () => {
    const res = await proxy(new NextRequest("http://localhost/api/health"));
    const id = res.headers.get("x-request-id");
    expect(id).toMatch(UUID);
    expect(forwarded(res)).toBe(id);
  });

  it("página: mantém o redirecionamento de idioma (RN-81) e devolve x-request-id", async () => {
    const res = await proxy(new NextRequest("http://localhost/", { headers: { "accept-language": "de" } }));
    expect(res.headers.get("location")).toBe("http://localhost/de");
    expect(res.headers.get("x-request-id")).toMatch(UUID);
  });

  it("página com idioma: repassa o id para a renderização", async () => {
    const res = await proxy(new NextRequest("http://localhost/en"));
    const id = res.headers.get("x-request-id");
    expect(id).toMatch(UUID);
    expect(forwarded(res)).toBe(id);
  });

  it("ignora x-request-id enviado pelo cliente", async () => {
    const res = await proxy(
      new NextRequest("http://localhost/api/health", { headers: { "x-request-id": "forjado" } }),
    );
    expect(res.headers.get("x-request-id")).not.toBe("forjado");
    expect(forwarded(res)).not.toBe("forjado");
  });

  it("cada requisição tem um id diferente", async () => {
    const a = (await proxy(new NextRequest("http://localhost/api/health"))).headers.get("x-request-id");
    const b = (await proxy(new NextRequest("http://localhost/api/health"))).headers.get("x-request-id");
    expect(a).not.toBe(b);
  });
});

describe("proxy — rate limit (docs/09 §2, issue #48)", () => {
  it("flood acima do limite → 429 com Retry-After, sem renderizar nem gravar log de acesso", async () => {
    vi.resetModules();
    vi.doMock("./lib/rate-limit", async (orig) => ({
      ...(await orig<typeof import("./lib/rate-limit")>()),
      rateLimit: vi.fn(async () => ({ allowed: false, remaining: 0, resetMs: 30_000 })),
    }));
    const recordAccess = vi.fn(async () => undefined);
    vi.doMock("./features/access-log", () => ({ recordAccess }));
    const { default: limitedProxy } = await import("./proxy");
    const waitUntil = vi.fn();
    const res = await limitedProxy(new NextRequest("http://localhost/en"), { waitUntil } as never);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
    expect(res.headers.get("x-request-id")).toMatch(UUID);
    expect(waitUntil).not.toHaveBeenCalled();
    expect(recordAccess).not.toHaveBeenCalled();
    vi.doUnmock("./lib/rate-limit");
    vi.doUnmock("./features/access-log");
  });

  it("/api/health não passa pelo rate limit (monitor de uptime)", async () => {
    vi.resetModules();
    const rateLimit = vi.fn(async () => ({ allowed: false, remaining: 0, resetMs: 1000 }));
    vi.doMock("./lib/rate-limit", async (orig) => ({
      ...(await orig<typeof import("./lib/rate-limit")>()),
      rateLimit,
    }));
    const { default: limitedProxy } = await import("./proxy");
    const res = await limitedProxy(new NextRequest("http://localhost/api/health"));
    expect(res.status).not.toBe(429);
    expect(rateLimit).not.toHaveBeenCalled();
    vi.doUnmock("./lib/rate-limit");
  });
});

describe("proxy — idiomas com código composto (issue #59)", () => {
  it("RN-81: Accept-Language pt-BR, zh-TW e zh-CN redirecionam para o prefixo certo", async () => {
    const go = async (lang: string) =>
      (
        await proxy(new NextRequest("http://localhost/", { headers: { "accept-language": lang } }))
      ).headers.get("location");
    expect(await go("pt-BR,pt;q=0.9")).toBe("http://localhost/pt-br");
    expect(await go("zh-TW,zh;q=0.9")).toBe("http://localhost/zh-hant");
    expect(await go("zh-CN,zh;q=0.9")).toBe("http://localhost/zh-hans");
  });

  it("/pt-br, /zh-hant e /zh-hans são atendidos sem reescrita interna (origem do laço)", async () => {
    for (const p of ["/pt-br", "/zh-hant", "/zh-hans"]) {
      const res = await proxy(new NextRequest(`http://localhost${p}`));
      expect(res.status).toBe(200);
      expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    }
  });
});
