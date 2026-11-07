import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)

// Tabelas de preço como configuração (docs/13 §2: nada de if espalhado). RN-15 e RN-17.
export const PRICING = {
  gold: { minK: 50, maxK: 5000, stepK: 50 }, // RN-15: preço por 1.000 gold
} as const;

export type Faction = "alliance" | "horde";
export type Addon = { name: string; percent: number }; // RN-17: adicional cadastrado no produto
export type ItemOptions =
  | { kind: "gold"; realm: string; faction: Faction; character: string }
  // RN-17 (#94): serviço com preço fixo; o cliente escolhe adicionais pelo nome (o % vem do banco)
  // #100: `variant` = valores da combinação escolhida na ordem dos eixos (cópia para exibir — o jsonb
  // reordena chaves de objeto); o preço vem da variante no banco
  | {
      kind: "service";
      realm: string;
      faction: Faction;
      character: string;
      addons: string[];
      variant?: string[];
    };

// Preço unitário em centavos de USDT (RN-12: inteiro; arredonda para o centavo mais próximo).
// `quantity` multiplica fora: gold = milhares; serviço = unidades (ex.: tiers de delve).
// Item antigo (antes do #94: raid/dungeon com multiplicador) não tem preço válido aqui — o carrinho o
// marca como indisponível; pedidos antigos guardam o preço congelado e não passam por esta função.
export function unitPriceCents(basePriceCents: number, options: ItemOptions, addons: Addon[] = []): number {
  if (options.kind !== "service") return basePriceCents;
  const percent = options.addons.reduce(
    (sum, name) => sum + (addons.find((a) => a.name === name)?.percent ?? 0),
    0,
  );
  return Math.round((basePriceCents * (100 + percent)) / 100);
}

// Item guardado no carrinho continua válido para o produto como está AGORA? (o admin pode ter mudado
// adicionais, limite, horários ou o tipo da categoria depois — revisão de segurança do #94)
export function itemStillValid(
  options: unknown,
  quantity: number,
  product: {
    isGold: boolean;
    addons: Addon[];
    maxQuantity: number;
    hasSlots: boolean;
    slotId: string | null;
    hasVariants: boolean; // #100: produto com eixos exige uma variante ativa, com preço, deste produto
    variantChosen: boolean; // o item aponta para uma variante
    variantOk: boolean;
  },
): boolean {
  // produto sem eixos com item de variante (admin tirou os eixos): o rótulo "8/8" não vale o preço base
  if (product.hasVariants !== product.variantChosen) return false;
  if (product.hasVariants && !product.variantOk) return false;
  if (!isCurrentOptions(options) || (options.kind === "gold") !== product.isGold) return false;
  if (options.kind === "gold") return true;
  const names = product.addons.map((a) => a.name);
  return (
    options.addons.every((n) => names.includes(n)) && // adicional removido/renomeado não vira 0%
    quantity <= product.maxQuantity &&
    (!product.hasSlots || product.slotId !== null) // produto ganhou horários: tem de escolher um
  );
}

export const isCurrentOptions = (o: unknown): o is ItemOptions => {
  const kind = (o as { kind?: unknown } | null)?.kind;
  return kind === "gold" || kind === "service";
};

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
