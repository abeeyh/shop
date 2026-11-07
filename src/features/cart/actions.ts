"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { formatUsdt, getProduct } from "@/features/catalog";
import { activePromotions, couponByCode, normalizeCode } from "@/features/discounts/queries";
import { inWindow, lineTotalCents, promoUnitCents, unitPriceCents } from "@/features/pricing/rules";
import { isBookable } from "@/features/schedule";
import { routing } from "@/i18n/routing";
import { clientIp, rateLimitKey } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { ensureCart, getCartId } from "./cart";
import { deleteItem, getSlotForProduct, insertItem, setCartCoupon } from "./queries";
import { parseItem, type ParsedItem } from "./schemas";

export type AddState = { status: "idle" | "ok" | "error"; fields: string[] };

type Checked =
  | { ok: true; productId: string; categoryId: string; basePrice: number; item: ParsedItem }
  | { ok: false; fields: string[] };

// Valida tudo no servidor: produto ativo, opções do tipo do produto e horário com vaga (RN-11, RN-15 a RN-17)
async function checkItem(form: FormData): Promise<Checked> {
  const product = await getProduct(String(form.get("product") ?? ""));
  if (!product) return { ok: false, fields: ["product"] };
  const parsed = parseItem(product.categoryKind, Object.fromEntries(form));
  if (!parsed.ok) return parsed;
  if (parsed.item.slotId) {
    const slot = await getSlotForProduct(parsed.item.slotId, product.id);
    if (!slot || !isBookable(slot)) return { ok: false, fields: ["slotId"] };
  }
  return {
    ok: true,
    productId: product.id,
    categoryId: product.categoryId,
    basePrice: product.priceUsdtCents,
    item: parsed.item,
  };
}

export async function addToCart(_prev: AddState, form: FormData): Promise<AddState> {
  const checked = await checkItem(form);
  if (!checked.ok) return { status: "error", fields: checked.fields };
  const cartId = await ensureCart();
  await insertItem(cartId, { productId: checked.productId, ...checked.item });
  refresh(); // contador do carrinho no cabeçalho
  return { status: "ok", fields: [] };
}

// Prévia do total no formulário: calculada aqui (o navegador não calcula preço — docs/04)
export async function quoteItem(form: FormData): Promise<string | null> {
  const locale = String(form.get("locale") ?? "");
  if (!routing.locales.some((l) => l === locale)) return null;
  const checked = await checkItem(form);
  if (!checked.ok) return null;
  const unitCents = unitPriceCents(checked.basePrice, checked.item.options);
  const unit = promoUnitCents({ ...checked, unitCents }, await activePromotions()); // RN-22
  return formatUsdt(locale, lineTotalCents(unit, checked.item.quantity));
}

export async function removeFromCart(form: FormData): Promise<void> {
  const itemId = z.uuid().safeParse(form.get("item"));
  const cartId = await getCartId();
  if (itemId.success && cartId) await deleteItem(cartId, itemId.data);
  refresh();
}

export type CouponFormState = { status: "idle" | "ok" | "error" };

const couponCode = z
  .string()
  .trim()
  .min(6)
  .max(40)
  .regex(/^[\w-]+$/);

// RN-25/RN-27/RN-28: valida no servidor; mensagem genérica; 10 tentativas por hora por IP (Valkey fora = bloqueia)
export async function applyCoupon(_prev: CouponFormState, form: FormData): Promise<CouponFormState> {
  const ip = clientIp(await headers(), env.CLIENT_IP_HEADER ?? "x-forwarded-for");
  const limit = await rateLimit({
    key: `coupon:${rateLimitKey(ip)}`,
    ...RATE_LIMITS.coupon,
    failClosed: true,
  });
  if (!limit.allowed) return { status: "error" };
  const code = couponCode.safeParse(form.get("code"));
  const coupon = code.success ? await couponByCode(code.data) : null;
  if (!coupon || !inWindow(coupon, new Date())) return { status: "error" };
  await setCartCoupon(await ensureCart(), normalizeCode(code.data!));
  refresh();
  return { status: "ok" };
}

export async function removeCoupon(): Promise<void> {
  const cartId = await getCartId();
  if (cartId) await setCartCoupon(cartId, null);
  refresh();
}
