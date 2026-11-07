import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { cookies } from "next/headers";
import { z } from "zod";
import { formatUsdt, productHref } from "@/features/catalog";
import { activePromotions, couponByCode, couponUses } from "@/features/discounts/queries";
import {
  bestPromotion,
  chooseDiscount,
  couponDiscountCents,
  lineTotalCents,
  itemStillValid,
  unitPriceCents,
  type ItemOptions,
  type Promotion,
} from "@/features/pricing/rules";
import { isBookable } from "@/features/schedule";
import { env } from "@/lib/env";
import { cartExists, createCart, getCartCoupon, listItems } from "./queries";

export const CART_COOKIE = "cart";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

// cookie do carrinho: só uuid; valor forjado/inválido = sem carrinho (docs/09 caso 11)
export async function getCartId(): Promise<string | null> {
  const value = (await cookies()).get(CART_COOKIE)?.value;
  return z.uuid().safeParse(value).success ? value! : null;
}

// Só em Server Action: cria o carrinho na primeira adição (RN-01: sem conta)
export async function ensureCart(): Promise<string> {
  const current = await getCartId();
  if (current && (await cartExists(current))) return current;
  const id = await createCart();
  (await cookies()).set(CART_COOKIE, id, {
    path: "/",
    maxAge: THIRTY_DAYS,
    sameSite: "lax",
    httpOnly: true,
    secure: env.NODE_ENV === "production",
  });
  return id;
}

export type CartLine = Awaited<ReturnType<typeof cartSummary>>["lines"][number];

type Row = Awaited<ReturnType<typeof listItems>>[number];

const slotOk = (r: Row) =>
  r.slotStartsAt === null ||
  isBookable({ startsAt: r.slotStartsAt, capacity: r.slotCapacity ?? 0, reserved: r.slotReserved ?? 0 });

function priceLine(r: Row, promos: Promotion[], now: Date) {
  // item com opções antigas (antes do #94) ou produto que virou "sob consulta" não pode seguir ao checkout
  const current =
    !r.priceOnRequest &&
    itemStillValid(r.options, r.quantity, {
      isGold: r.categoryKind === "gold",
      addons: r.addons,
      maxQuantity: r.maxQuantity,
      hasSlots: r.hasSlots,
      slotId: r.slotId,
    });
  const unitCents = current
    ? unitPriceCents(r.basePriceCents, r.options as ItemOptions, r.addons)
    : r.basePriceCents;
  const best = bestPromotion({ productId: r.productId, categoryId: r.categoryId, unitCents }, promos, now);
  return {
    id: r.id,
    productId: r.productId,
    categoryId: r.categoryId,
    slotId: r.slotId,
    unitCents,
    quantity: r.quantity,
    promotionId: best?.promotion.id ?? null,
    promoDiscountCents: (best?.discountCents ?? 0) * r.quantity, // RN-24: por unidade × quantidade
    originalCents: lineTotalCents(unitCents, r.quantity),
    available: current && r.productActive && slotOk(r), // RN-11 / RN-19 / RN-106
  };
}

type CouponState = { code: string; state: "applied" | "not_better" | "invalid" } | null;

// limite total já atingido: não aparece como aplicado (o checkout confere de novo com trava)
async function usableCoupon(code: string | null) {
  const found = code ? await couponByCode(code) : null;
  if (!found || found.maxUses === null) return found;
  return (await couponUses(found.id)) >= found.maxUses ? null : found;
}

// RN-25/RN-26: cupom guardado no carrinho é revalidado a cada leitura; vale o maior desconto
async function pickDiscount(code: string | null, lines: ReturnType<typeof priceLine>[], now: Date) {
  const promotionCents = lines.reduce((s, l) => s + l.promoDiscountCents, 0);
  const coupon = await usableCoupon(code);
  const couponCents = coupon ? couponDiscountCents(lines, coupon, now) : 0;
  const applied = chooseDiscount(promotionCents, couponCents);
  const state: CouponState = !code
    ? null
    : { code, state: couponCents === 0 ? "invalid" : applied.source === "coupon" ? "applied" : "not_better" };
  return { applied, coupon: state, couponId: applied.source === "coupon" ? coupon!.id : null };
}

// RN-20: tudo recalculado do banco; item que ficou indisponível (produto inativo, horário cheio ou
// passado — RN-11) aparece marcado e fica fora do total
export async function cartSummary(locale: string, cartId: string | null) {
  const now = new Date();
  const [rows, promos, code] = await Promise.all([
    cartId ? listItems(cartId) : [],
    activePromotions(now),
    cartId ? getCartCoupon(cartId) : null,
  ]);
  const priced = rows.map((r) => priceLine(r, promos, now));
  const valid = priced.filter((l) => l.available);
  const { applied, coupon, couponId } = await pickDiscount(code, valid, now);
  const promoOn = applied.source === "promotion";
  const lines = rows.map((r, i) => {
    const p = priced[i]!;
    const totalCents = p.originalCents - (promoOn ? p.promoDiscountCents : 0);
    return {
      ...p,
      discountCents: promoOn ? p.promoDiscountCents : 0,
      name: r.productName,
      href: productHref(locale, { categorySlug: r.categorySlug, slug: r.productSlug }),
      kind: r.categoryKind,
      options: r.options as ItemOptions,
      slotStartsAt: r.slotStartsAt?.toISOString() ?? null,
      totalCents,
      total: formatUsdt(locale, totalCents),
      original: totalCents < p.originalCents ? formatUsdt(locale, p.originalCents) : null,
    };
  });
  const subtotal = valid.reduce((s, l) => s + l.originalCents, 0);
  const total = subtotal - applied.discountCents;
  return {
    lines,
    subtotalCents: subtotal,
    subtotal: formatUsdt(locale, subtotal),
    discount: { ...applied, formatted: formatUsdt(locale, applied.discountCents) },
    coupon,
    couponId,
    totalCents: total,
    total: formatUsdt(locale, total),
    hasUnavailable: lines.some((l) => !l.available),
  };
}
