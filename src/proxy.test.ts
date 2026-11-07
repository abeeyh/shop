import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import proxy from "./proxy";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Next repassa à app os headers de request alterados no proxy com este prefixo
const forwarded = (res: Response) => res.headers.get("x-middleware-request-x-request-id");

describe("proxy — requestId (docs/16 §3)", () => {
  it("API: devolve x-request-id e repassa o mesmo id para a rota", () => {
    const res = proxy(new NextRequest("http://localhost/api/health"));
    const id = res.headers.get("x-request-id");
    expect(id).toMatch(UUID);
    expect(forwarded(res)).toBe(id);
  });

  it("página: mantém o redirecionamento de idioma (RN-81) e devolve x-request-id", () => {
    const res = proxy(new NextRequest("http://localhost/", { headers: { "accept-language": "de" } }));
    expect(res.headers.get("location")).toBe("http://localhost/de");
    expect(res.headers.get("x-request-id")).toMatch(UUID);
  });

  it("página com idioma: repassa o id para a renderização", () => {
    const res = proxy(new NextRequest("http://localhost/en"));
    const id = res.headers.get("x-request-id");
    expect(id).toMatch(UUID);
    expect(forwarded(res)).toBe(id);
  });

  it("ignora x-request-id enviado pelo cliente", () => {
    const res = proxy(
      new NextRequest("http://localhost/api/health", { headers: { "x-request-id": "forjado" } }),
    );
    expect(res.headers.get("x-request-id")).not.toBe("forjado");
    expect(forwarded(res)).not.toBe("forjado");
  });

  it("cada requisição tem um id diferente", () => {
    const a = proxy(new NextRequest("http://localhost/api/health")).headers.get("x-request-id");
    const b = proxy(new NextRequest("http://localhost/api/health")).headers.get("x-request-id");
    expect(a).not.toBe(b);
  });
});
