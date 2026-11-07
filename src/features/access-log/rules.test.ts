import { describe, expect, it } from "vitest";
import { accessLogCutoff, clientIp, sanitizeRoute, shouldRecordAccess } from "./rules";

describe("access-log rules (docs/16 §9)", () => {
  it("corte é exatamente 6 meses antes", () => {
    expect(accessLogCutoff(new Date("2026-11-06T12:00:00Z")).toISOString()).toBe("2026-05-06T12:00:00.000Z");
  });

  it("fim de mês não apaga antes do prazo: 31/ago → 28/fev (e 29 em ano bissexto)", () => {
    expect(accessLogCutoff(new Date("2026-08-31T00:00:00Z")).toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(accessLogCutoff(new Date("2028-08-31T00:00:00Z")).toISOString()).toBe("2028-02-29T00:00:00.000Z");
  });

  it("virada de ano", () => {
    expect(accessLogCutoff(new Date("2027-03-15T00:00:00Z")).toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });

  it("IP: primeiro valor do header confiável; inválido ou ausente → null", () => {
    const h = (v: string) => new Headers({ "x-forwarded-for": v });
    expect(clientIp(h("203.0.113.7, 10.0.0.1"), "x-forwarded-for")).toBe("203.0.113.7");
    expect(clientIp(h("2001:db8::1"), "x-forwarded-for")).toBe("2001:db8::1");
    expect(clientIp(h("não-é-ip"), "x-forwarded-for")).toBeNull();
    expect(clientIp(new Headers(), "x-forwarded-for")).toBeNull();
  });

  it("não registra o monitor de uptime; registra o resto", () => {
    expect(shouldRecordAccess("/api/health")).toBe(false);
    expect(shouldRecordAccess("/en")).toBe(true);
  });

  it("mascara segmento com cara de token e mantém rotas normais", () => {
    expect(sanitizeRoute("/api/auth/reset-password/Xk9aP2qL7mN4vB8cR1tY6wZ3sD5fG0hJ")).toBe(
      "/api/auth/reset-password/:token",
    );
    expect(sanitizeRoute("/en/wow/gold")).toBe("/en/wow/gold");
    expect(sanitizeRoute("/pt-br/wow/raids/manaforge-omega-heroic")).toBe(
      "/pt-br/wow/raids/manaforge-omega-heroic",
    );
  });

  it("limita o tamanho da rota", () => {
    expect(sanitizeRoute("/a".repeat(2000))).toHaveLength(2048);
  });
});
