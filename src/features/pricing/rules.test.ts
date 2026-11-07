import { describe, expect, it } from "vitest";
import { lineTotalCents, unitPriceCents } from "./rules";

describe("preço por tipo de produto", () => {
  it("RN-15: gold — preço por 1.000, multiplicado pela quantidade em milhares", () => {
    const unit = unitPriceCents(45, {
      kind: "gold",
      realm: "Area 52",
      faction: "horde",
      character: "Thrall",
    });
    expect(unit).toBe(45);
    expect(lineTotalCents(unit, 200)).toBe(9000); // 200k gold = 90,00 USDT
  });

  it("RN-16: raid — opção de loot multiplica o preço-base", () => {
    expect(unitPriceCents(7900, { kind: "raid", loot: "none" })).toBe(7900);
    expect(unitPriceCents(7900, { kind: "raid", loot: "armor" })).toBe(10270);
    expect(unitPriceCents(7900, { kind: "raid", loot: "full" })).toBe(14220);
  });

  it("RN-17: M+ — faixa do nível da chave e timed; arredonda para o centavo", () => {
    expect(unitPriceCents(1200, { kind: "dungeon", keyLevel: 10, timed: false })).toBe(1200);
    expect(unitPriceCents(1200, { kind: "dungeon", keyLevel: 11, timed: false })).toBe(1560);
    expect(unitPriceCents(1200, { kind: "dungeon", keyLevel: 15, timed: true })).toBe(2304);
    expect(unitPriceCents(1111, { kind: "dungeon", keyLevel: 12, timed: true })).toBe(1733); // 1733,16 → 1733
  });

  it("RN-17: nível fora da tabela é erro (nunca preço inventado)", () => {
    expect(() => unitPriceCents(1200, { kind: "dungeon", keyLevel: 20, timed: false })).toThrow();
  });
});
