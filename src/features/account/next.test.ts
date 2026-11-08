import { describe, expect, it } from "vitest";
import { safeNext } from "./next";

describe("#130: voltar à página anterior sem open redirect (docs/09)", () => {
  it("aceita caminho interno do idioma atual", () => {
    expect(safeNext("/pt-br/wow/raids", "pt-br")).toBe("/pt-br/wow/raids");
    expect(safeNext("/pt-br", "pt-br")).toBe("/pt-br");
    expect(safeNext("/pt-br/produtos?q=ven", "pt-br")).toBe("/pt-br/produtos?q=ven");
  });
  it("recusa externo, protocolo relativo, barra invertida, outro idioma e as telas de login", () => {
    for (const bad of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/pt-br//evil.com",
      "/en/wow/raids",
      "/pt-brx/a",
      "javascript:alert(1)",
      "/pt-br/entrar",
      "/pt-br/cadastro?voltar=/pt-br",
      "",
      undefined,
      `/pt-br/${"a".repeat(400)}`,
    ])
      expect(safeNext(bad, "pt-br"), String(bad)).toBeNull();
  });
});
