import { describe, expect, it } from "vitest";
import { isAuthorizedCron } from "./cron";

const SECRET = "s".repeat(32);
const auth = (v?: string) => new Headers(v ? { authorization: v } : {});

describe("cron (docs/09 caso de abuso 6)", () => {
  it("sem segredo configurado nada passa", () => {
    expect(isAuthorizedCron(auth(`Bearer ${SECRET}`), undefined)).toBe(false);
  });
  it("sem header, header errado ou de outro tamanho → recusado", () => {
    expect(isAuthorizedCron(auth(), SECRET)).toBe(false);
    expect(isAuthorizedCron(auth(`Bearer ${"x".repeat(32)}`), SECRET)).toBe(false);
    expect(isAuthorizedCron(auth("Bearer curto"), SECRET)).toBe(false);
  });
  it("segredo certo → aceito", () => {
    expect(isAuthorizedCron(auth(`Bearer ${SECRET}`), SECRET)).toBe(true);
  });
});
