import { describe, expect, it } from "vitest";
import { applyListFilter, parseListFilter } from "./filters";

// RF-03 (doc 17): busca e filtros do catálogo no admin
describe("filtros das listas do admin", () => {
  const cat = "11111111-1111-4111-8111-111111111111";
  const rows = [
    { name: "Venomous Abyss", slug: "venomous-abyss-heroic", active: true, categoryId: cat },
    { name: "Gold — US", slug: "gold-us", active: false, categoryId: "x" },
  ];
  it("busca por nome sem acento/maiúscula ou pelo slug; filtra categoria e status", () => {
    expect(applyListFilter(rows, parseListFilter({ q: "VENOM" }))).toHaveLength(1);
    expect(applyListFilter(rows, parseListFilter({ q: "gold-us" }))).toHaveLength(1);
    expect(applyListFilter(rows, parseListFilter({ cat }))).toHaveLength(1);
    expect(applyListFilter(rows, parseListFilter({ status: "inactive" }))[0]!.slug).toBe("gold-us");
    expect(applyListFilter(rows, parseListFilter({}))).toHaveLength(2);
  });
  it("parâmetro inválido vira 'sem filtro'", () => {
    expect(parseListFilter({ cat: "1 or 1=1", status: "x", q: ["a", "b"] })).toEqual({
      q: "a",
      cat: "",
      status: "",
    });
  });
});
