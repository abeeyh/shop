import { describe, expect, it } from "vitest";
import { orderSearchKind } from "./staff";

// RF-21 (doc 17): a busca da fila só aceita começo de ID ou e-mail completo (nada de busca parcial
// por e-mail — a lista nunca mostra e-mail, RN-06)
describe("busca de pedidos da equipe", () => {
  it("começo do ID (4+ caracteres hex) ou ID inteiro", () => {
    expect(orderSearchKind("3e66")).toBe("id");
    expect(orderSearchKind(" 3E66E13D ")).toBe("id");
    expect(orderSearchKind("3e66e13d-1b2c-4d5e-8f90-0123456789ab")).toBe("id");
  });
  it("e-mail completo", () => {
    expect(orderSearchKind("Buyer@Example.com")).toBe("email");
  });
  it("vazio não filtra; pedaço de e-mail, curto demais ou texto solto não acha nada", () => {
    expect(orderSearchKind("")).toBe("none");
    expect(orderSearchKind(undefined)).toBe("none");
    for (const q of ["buyer@", "@example.com", "3e6", "gold", "' or 1=1 --"])
      expect(orderSearchKind(q)).toBe("invalid");
  });
});
