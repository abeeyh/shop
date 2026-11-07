import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  addonsFrom,
  cleanName,
  isOnRequest,
  maxQuantityFrom,
  slugify,
  toCatalog,
  toProducts,
  toUsdtCents,
} from "./lib.mjs";

const item = (o) => ({
  id: 1,
  name: "X",
  description: "",
  price: 100000,
  serviceCategoryId: 8,
  hotItem: true,
  sortOrder: 0,
  ...o,
});

describe("importação do catálogo (#94)", () => {
  it("1.000.000 de gold = 45 USDT (decisão do dono), em centavos inteiros (RN-12)", () => {
    expect(toUsdtCents(1_000_000)).toBe(4500);
    expect(toUsdtCents(110_000)).toBe(495); // Mythic +10
    expect(toUsdtCents(10_950_000)).toBe(49275); // All 3 Raids FP Mythic
    expect(toUsdtCents(877_000)).toBe(3947); // 3946,5 → 3947
  });

  it("RN-106: price 1 (e o 800 provisório do Mythic +19) vira sob consulta", () => {
    expect(isOnRequest(1)).toBe(true);
    expect(isOnRequest(800)).toBe(true);
    expect(isOnRequest(15_000)).toBe(false);
    const [p] = toProducts([item({ price: 1 })]);
    expect(p).toMatchObject({ priceOnRequest: true, priceUsdtCents: 1 });
  });

  it("nome sem emoji e espaços extras; slug legível", () => {
    expect(cleanName("🔸 Venomous Abyss  8/8 SAVED HEROIC ")).toBe("Venomous Abyss 8/8 SAVED HEROIC");
    expect(slugify("Mythic +10")).toBe("mythic-plus-10");
    expect(slugify("Glory of the Ny'alotha Raider")).toBe("glory-of-the-ny-alotha-raider");
  });

  it("Armor Stack +25% vira adicional; 'price per tier' libera quantidade", () => {
    expect(addonsFrom("Personal Loot / Armor Stack +25% added price")).toEqual([
      { name: "Armor Stack", percent: 25 },
    ]);
    expect(addonsFrom("Free Roll")).toEqual([]);
    expect(maxQuantityFrom("from tier 1 to tier 3, price per tier")).toBe(10);
    expect(maxQuantityFrom("1/1 Free Roll")).toBe(1);
  });

  it("nome repetido na mesma categoria ganha a descrição; slug nunca repete", () => {
    const out = toProducts([
      item({ id: 220, name: "🔸 PVP 2V2 ", description: "0-1600", serviceCategoryId: 35 }),
      item({ id: 221, name: "🔸PVP 2V2", description: "0-1800", serviceCategoryId: 35 }),
    ]);
    expect(out.map((p) => p.name)).toEqual(["PVP 2V2 0-1600", "PVP 2V2 0-1800"]);
    expect(new Set(out.map((p) => p.slug)).size).toBe(2);
  });

  it("o JSON do projeto importa sem slug repetido e com subcategoria nas raids", () => {
    const { info } = JSON.parse(readFileSync(new URL("./products.json", import.meta.url), "utf8"));
    const out = toProducts(info);
    expect(new Set(out.map((p) => p.slug)).size).toBe(out.length);
    expect(out.filter((p) => p.categoryRef === 40).every((p) => p.subcategoryRef !== null)).toBe(true);
    expect(out.every((p) => p.priceUsdtCents > 0 && p.name.length >= 2)).toBe(true);
  });
});

describe("agrupamento em variantes (#100)", () => {
  const items = [
    item({ id: 1, name: "Venomous Abyss 2/8 FP MYTH", price: 877_000, serviceCategoryId: 41 }),
    item({
      id: 2,
      name: "Venomous Abyss 3/8 FP MYTH",
      price: 1_650_000,
      serviceCategoryId: 41,
      hotItem: false,
    }),
    item({ id: 3, name: "Mythic +20", price: 1, serviceCategoryId: 8 }),
    item({ id: 4, name: "KSH", price: 935_000, serviceCategoryId: 8 }),
  ];
  const group = (variants, axes = [{ name: "Bosses", style: "slider", values: ["2/8", "3/8"] }]) => ({
    slug: "va",
    name: "Venomous Abyss",
    category: "41",
    subcategory: "4",
    axes,
    variants,
  });

  it("junta os itens do grupo num produto com preço 'a partir de' e deixa o resto solto", () => {
    const c = toCatalog(items, [
      group([
        { id: 2, options: { Bosses: "3/8" } },
        { id: 1, options: { Bosses: "2/8" } },
      ]),
    ]);
    expect(c.singles.map((p) => p.externalId)).toEqual([3, 4]);
    const [g] = c.groups;
    expect(g.priceUsdtCents).toBe(3947); // menor preço
    expect(g.priceOnRequest).toBe(false);
    expect(g.variants.map((v) => [v.externalId, v.sortOrder])).toEqual([
      [2, 1],
      [1, 0],
    ]);
  });

  it("grupo só com variantes sob consulta fica sob consulta (RN-106)", () => {
    const axes = [{ name: "Key level", style: "slider", values: ["+20"] }];
    const c = toCatalog(items, [group([{ id: 3, options: { "Key level": "+20" } }], axes)]);
    expect(c.groups[0].priceOnRequest).toBe(true);
    expect(c.groups[0].variants[0].priceOnRequest).toBe(true);
  });

  it("recusa id inexistente, id repetido e valor fora do eixo", () => {
    expect(() => toCatalog(items, [group([{ id: 99, options: { Bosses: "2/8" } }])])).toThrow(/não existe/);
    expect(() =>
      toCatalog(items, [
        group([
          { id: 1, options: { Bosses: "2/8" } },
          { id: 1, options: { Bosses: "3/8" } },
        ]),
      ]),
    ).toThrow(/mais de um grupo/);
    expect(() => toCatalog(items, [group([{ id: 1, options: { Bosses: "9/8" } }])])).toThrow(/valor válido/);
  });

  it("groups.json do repositório bate com products.json", () => {
    const here = (f) => new URL(f, import.meta.url);
    const { info } = JSON.parse(readFileSync(here("./products.json"), "utf8"));
    const { groups } = JSON.parse(readFileSync(here("./groups.json"), "utf8"));
    const c = toCatalog(info, groups);
    expect(c.groups.length + c.singles.length).toBeLessThan(info.length / 2);
    const first = (v) => Number(/\d+/.exec(v)?.[0]);
    for (const g of c.groups) {
      const keys = g.variants.map((v) => JSON.stringify(v.options));
      expect(new Set(keys).size).toBe(keys.length); // combinação única
      // slider anda em ordem crescente (2/8 → 8/8, +6 → +22, tier 1-3 → 11)
      for (const a of g.optionAxes.filter((x) => x.style === "slider")) {
        const nums = a.values.map(first);
        expect(nums, `${g.slug} ${a.name}`).toEqual([...nums].sort((x, y) => x - y));
      }
    }
  });
});
