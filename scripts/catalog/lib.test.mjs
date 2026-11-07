import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  addonsFrom,
  cleanName,
  isOnRequest,
  maxQuantityFrom,
  slugify,
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
