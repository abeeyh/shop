import { describe, expect, it } from "vitest";
import {
  bestPromotion,
  chooseDiscount,
  couponDiscountCents,
  discountCents,
  isCurrentOptions,
  itemStillValid,
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

  const svc = (addons: string[]) =>
    ({ kind: "service", realm: "Area 52", faction: "horde", character: "Thrall", addons }) as const;
  const armor = [{ name: "Armor Stack", percent: 25 }];

  it("RN-17 (#94): serviço tem preço fixo; adicional soma o % cadastrado no produto", () => {
    expect(unitPriceCents(495, svc([]), armor)).toBe(495); // Mythic +10 = 110k gold = 4,95 USDT
    expect(unitPriceCents(495, svc(["Armor Stack"]), armor)).toBe(619); // 618,75 → 619
    expect(lineTotalCents(unitPriceCents(68, svc([]), []), 3)).toBe(204); // delve: 3 tiers
  });

  it("RN-17: adicional que o produto não tem não muda o preço (nunca confia no cliente)", () => {
    expect(unitPriceCents(495, svc(["Armor Stack"]), [])).toBe(495);
    expect(unitPriceCents(495, svc(["Inventado"]), armor)).toBe(495);
  });

  it("item antigo (raid/dungeon antes do #94) não é opção atual", () => {
    expect(isCurrentOptions({ kind: "raid", loot: "full" })).toBe(false);
    expect(isCurrentOptions(svc([]))).toBe(true);
    expect(isCurrentOptions(null)).toBe(false);
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

describe("item do carrinho conferido de novo contra o produto atual (#94, revisão de segurança)", () => {
  const svc = { kind: "service", realm: "A", faction: "horde", character: "T", addons: ["Armor Stack"] };
  const product = {
    isGold: false,
    addons: [{ name: "Armor Stack", percent: 25 }],
    maxQuantity: 3,
    hasSlots: false,
    slotId: null,
    hasVariants: false,
    variantOk: false,
  };
  it("válido enquanto o produto não muda", () => {
    expect(itemStillValid(svc, 2, product)).toBe(true);
  });
  it("adicional removido ou renomeado deixa o item indisponível (não cobra 0%)", () => {
    expect(itemStillValid(svc, 1, { ...product, addons: [{ name: "Armor stack", percent: 25 }] })).toBe(
      false,
    );
  });
  it("quantidade acima do novo limite, horário novo ou tipo trocado também", () => {
    expect(itemStillValid(svc, 3, { ...product, maxQuantity: 1 })).toBe(false);
    expect(itemStillValid(svc, 1, { ...product, hasSlots: true })).toBe(false);
    expect(itemStillValid(svc, 1, { ...product, hasSlots: true, slotId: "s" })).toBe(true);
    expect(itemStillValid(svc, 1, { ...product, isGold: true })).toBe(false);
    expect(itemStillValid({ kind: "gold", realm: "A", faction: "horde", character: "T" }, 100, product)).toBe(
      false,
    );
  });
  it("#100: produto com variantes exige variante válida; variante sumida/sob consulta/de outro produto não vale", () => {
    expect(itemStillValid(svc, 1, { ...product, hasVariants: true, variantOk: true })).toBe(true);
    expect(itemStillValid(svc, 1, { ...product, hasVariants: true, variantOk: false })).toBe(false);
    // produto perdeu os eixos depois que o item entrou: o preço da variante não vale mais
    expect(itemStillValid(svc, 1, { ...product, hasVariants: false, variantOk: true })).toBe(false);
  });
});
