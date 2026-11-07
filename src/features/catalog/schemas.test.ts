import { describe, expect, it } from "vitest";
import { filtersToQuery, parseFilters } from "./schemas";

const defaults = { region: "US" as const, categories: ["gold", "raids", "mythic-plus"] };

describe("filtros da URL (RN-100 a RN-103)", () => {
  it("RN-103: valores inválidos voltam ao padrão", () => {
    const f = parseFilters(
      { min: "abc", max: "-5", sort: "hack", cat: "nope,gold", region: "BR", page: "0" },
      defaults,
    );
    expect(f).toMatchObject({
      min: undefined,
      max: undefined,
      sort: "best",
      categories: ["gold"],
      region: "US",
      page: 1,
    });
  });

  it("RN-100: busca com 1 caractere é ignorada e sinalizada; com 2+ ordena por relevância", () => {
    expect(parseFilters({ q: "g" }, defaults)).toMatchObject({ q: "", tooShort: true, sort: "best" });
    expect(parseFilters({ q: "  mithic " }, defaults)).toMatchObject({ q: "mithic", sort: "relevance" });
  });

  it("relevância sem busca não vale; ordenação válida é mantida", () => {
    expect(parseFilters({ sort: "relevance" }, defaults).sort).toBe("best");
    expect(parseFilters({ sort: "price-asc" }, defaults).sort).toBe("price-asc");
  });

  it("região 'all' e disponível", () => {
    expect(parseFilters({ region: "all", disponivel: "1" }, defaults)).toMatchObject({
      region: "all",
      available: true,
    });
  });

  it("RN-22: filtro em promoção entra e sai da URL", () => {
    const f = parseFilters({ promo: "1" }, defaults);
    expect(f.promo).toBe(true);
    expect(filtersToQuery(f, "US")).toBe("?promo=1");
    expect(filtersToQuery(f, "US", { promo: false })).toBe("");
  });

  it("URL só com o que difere do padrão; patch remove filtros (chips, limpar)", () => {
    const f = parseFilters(
      { q: "gold", cat: "gold,raids", region: "EU", min: "10", disponivel: "1", page: "2" },
      defaults,
    );
    expect(filtersToQuery(f, "US")).toBe("?q=gold&cat=gold%2Craids&region=EU&min=10&disponivel=1&page=2");
    expect(filtersToQuery(f, "US", { categories: ["raids"], page: 1 })).toBe(
      "?q=gold&cat=raids&region=EU&min=10&disponivel=1",
    );
    expect(filtersToQuery(parseFilters({}, defaults), "US")).toBe("");
  });

  it("formulário GET: categoria repetida e preço vazio", () => {
    const f = parseFilters({ cat: ["gold", "raids", "gold"], min: "", max: "50" }, defaults);
    expect(f).toMatchObject({ categories: ["gold", "raids"], min: undefined, max: 50 });
  });
});
