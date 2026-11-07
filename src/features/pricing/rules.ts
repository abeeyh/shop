import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)

// Tabelas de preço como configuração (docs/13 §2: nada de if espalhado). RN-15 a RN-17.
export const PRICING = {
  gold: { minK: 50, maxK: 5000, stepK: 50 }, // RN-15: preço por 1.000 gold
  raid: { loot: { none: 1, armor: 1.3, full: 1.8 } }, // RN-16: multiplicador da opção de loot
  dungeon: {
    // RN-17: multiplicador por faixa de nível da chave; "timed" +20%
    levels: [
      { from: 2, to: 10, factor: 1 },
      { from: 11, to: 13, factor: 1.3 },
      { from: 14, to: 15, factor: 1.6 },
    ],
    timed: 1.2,
    maxRuns: 10,
  },
} as const;

export type LootOption = keyof typeof PRICING.raid.loot;
export type ItemOptions =
  | { kind: "gold"; realm: string; faction: "alliance" | "horde"; character: string }
  | { kind: "raid"; loot: LootOption }
  | { kind: "dungeon"; keyLevel: number; timed: boolean };

const levelFactor = (level: number) =>
  PRICING.dungeon.levels.find((b) => level >= b.from && level <= b.to)?.factor;

// Preço unitário em centavos de USDT (RN-12: inteiro; arredonda para o centavo mais próximo).
// `quantity` multiplica fora: gold = milhares; M+ = runs; raid = 1.
export function unitPriceCents(basePriceCents: number, options: ItemOptions): number {
  switch (options.kind) {
    case "gold":
      return basePriceCents;
    case "raid":
      return Math.round(basePriceCents * PRICING.raid.loot[options.loot]);
    case "dungeon": {
      const factor = levelFactor(options.keyLevel);
      if (factor === undefined) throw new Error("nível de chave fora da tabela");
      return Math.round(basePriceCents * factor * (options.timed ? PRICING.dungeon.timed : 1));
    }
  }
}

export const lineTotalCents = (unitCents: number, quantity: number) => unitCents * quantity;

// ---- Descontos (RN-21 a RN-29) ----

export type Discount = { type: "percent" | "fixed"; value: number }; // percent 1–90; fixed em centavos
export type Scope = {
  scope: "store" | "category" | "product";
  categoryId: string | null;
  productId: string | null;
};
export type Promotion = Discount & Scope & { id: string; startsAt: Date; endsAt: Date; active: boolean };
export type Coupon = Discount &
  Scope & { id: string; startsAt: Date; endsAt: Date; active: boolean; minOrderUsdtCents: number };
export type PricedLine = { productId: string; categoryId: string; unitCents: number; quantity: number };

export const PROMO_LIMITS = { minPercent: 1, maxPercent: 90 } as const; // RN-21

// RN-24: centavos, arredondado; o preço final nunca fica abaixo de 1 centavo
export function discountCents(baseCents: number, d: Discount): number {
  const raw = d.type === "percent" ? Math.round((baseCents * d.value) / 100) : d.value;
  return Math.max(0, Math.min(raw, baseCents - 1));
}

// RN-22: vale só dentro de [início, fim)
export const inWindow = (x: { startsAt: Date; endsAt: Date; active: boolean }, now: Date) =>
  x.active && x.startsAt.getTime() <= now.getTime() && now.getTime() < x.endsAt.getTime();

export const appliesTo = (s: Scope, item: { productId: string; categoryId: string }) =>
  s.scope === "store" ||
  (s.scope === "category" && s.categoryId === item.categoryId) ||
  (s.scope === "product" && s.productId === item.productId);

// RN-23: várias promoções valendo → a de maior desconto (por unidade)
export function bestPromotion(
  item: { productId: string; categoryId: string; unitCents: number },
  promos: Promotion[],
  now: Date,
): { promotion: Promotion; discountCents: number } | null {
  let best: { promotion: Promotion; discountCents: number } | null = null;
  for (const p of promos) {
    if (!inWindow(p, now) || !appliesTo(p, item)) continue;
    const d = discountCents(item.unitCents, p);
    if (d > 0 && (!best || d > best.discountCents)) best = { promotion: p, discountCents: d };
  }
  return best;
}

// Cupom sobre os itens do escopo; mínimo do pedido sobre o subtotal original (RN-25)
export function couponDiscountCents(lines: PricedLine[], c: Coupon, now: Date): number {
  const subtotal = lines.reduce((s, l) => s + l.unitCents * l.quantity, 0);
  if (!inWindow(c, now) || subtotal < c.minOrderUsdtCents) return 0;
  const eligible = lines.filter((l) => appliesTo(c, l)).reduce((s, l) => s + l.unitCents * l.quantity, 0);
  return eligible > 0 ? discountCents(eligible, c) : 0;
}

export type Applied = { source: "promotion" | "coupon" | "none"; discountCents: number };

// RN-26: promoção e cupom não acumulam — vale o maior; empate fica com a promoção (não gasta o cupom)
export function chooseDiscount(promotionCents: number, couponCents: number): Applied {
  if (couponCents > promotionCents) return { source: "coupon", discountCents: couponCents };
  if (promotionCents > 0) return { source: "promotion", discountCents: promotionCents };
  return { source: "none", discountCents: 0 };
}

// Preço unitário final com a melhor promoção (RN-22 a RN-24) — vitrine, prévia e carrinho usam este
export const promoUnitCents = (
  item: { productId: string; categoryId: string; unitCents: number },
  promos: Promotion[],
  now = new Date(),
) => item.unitCents - (bestPromotion(item, promos, now)?.discountCents ?? 0);
