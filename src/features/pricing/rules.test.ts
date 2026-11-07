import { describe, expect, it } from "vitest";
import {
  bestPromotion,
  chooseDiscount,
  couponDiscountCents,
  discountCents,
  lineTotalCents,
  unitPriceCents,
  type Promotion,
} from "./rules";

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

describe("descontos (RN-21 a RN-26)", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const window = {
    startsAt: new Date("2026-11-10T00:00:00Z"),
    endsAt: new Date("2026-11-11T00:00:00Z"),
    active: true,
  };
  const promo = (p: Partial<Promotion>): Promotion => ({
    id: "p",
    type: "percent",
    value: 10,
    scope: "store",
    categoryId: null,
    productId: null,
    ...window,
    ...p,
  });
  const item = { productId: "prod", categoryId: "cat", unitCents: 1000 };

  it("RN-24: arredonda para o centavo e nunca deixa o preço abaixo de 1 centavo", () => {
    expect(discountCents(1999, { type: "percent", value: 15 })).toBe(300); // 299,85 → 300
    expect(discountCents(500, { type: "fixed", value: 900 })).toBe(499);
    expect(discountCents(1, { type: "percent", value: 90 })).toBe(0);
  });

  it("RN-22: só dentro de [início, fim)", () => {
    expect(bestPromotion(item, [promo({ endsAt: now })], now)).toBeNull(); // fim é exclusivo
    expect(bestPromotion(item, [promo({ startsAt: now })], now)?.discountCents).toBe(100);
    expect(bestPromotion(item, [promo({ active: false })], now)).toBeNull();
  });

  it("RN-23: não acumula; vale a de maior desconto e só no escopo", () => {
    const r = bestPromotion(
      item,
      [
        promo({ id: "a", value: 10 }),
        promo({ id: "b", type: "fixed", value: 250, scope: "category", categoryId: "cat" }),
        promo({ id: "c", value: 50, scope: "product", productId: "outro" }),
      ],
      now,
    );
    expect(r).toMatchObject({ promotion: { id: "b" }, discountCents: 250 });
  });

  it("RN-25: cupom só nos itens do escopo e com pedido mínimo", () => {
    const lines = [
      { productId: "prod", categoryId: "cat", unitCents: 1000, quantity: 2 },
      { productId: "x", categoryId: "outra", unitCents: 500, quantity: 1 },
    ];
    const c = {
      id: "c",
      type: "percent" as const,
      value: 20,
      scope: "category" as const,
      categoryId: "cat",
      productId: null,
      ...window,
      minOrderUsdtCents: 0,
    };
    expect(couponDiscountCents(lines, c, now)).toBe(400);
    expect(couponDiscountCents(lines, { ...c, minOrderUsdtCents: 2600 }, now)).toBe(0);
    expect(couponDiscountCents(lines, { ...c, endsAt: now }, now)).toBe(0);
  });

  it("RN-26: vale o maior; empate fica com a promoção", () => {
    expect(chooseDiscount(300, 400)).toEqual({ source: "coupon", discountCents: 400 });
    expect(chooseDiscount(400, 400)).toEqual({ source: "promotion", discountCents: 400 });
    expect(chooseDiscount(0, 0)).toEqual({ source: "none", discountCents: 0 });
  });
});
