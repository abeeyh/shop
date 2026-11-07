"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { formatUsdt, getProduct } from "@/features/catalog";
import { activePromotions, couponByCode, normalizeCode } from "@/features/discounts/queries";
import {
  inWindow,
  lineTotalCents,
  promoUnitCents,
  unitPriceCents,
  type Addon,
} from "@/features/pricing/rules";
import { isBookable, listSlotsForProduct } from "@/features/schedule";
import { addCharacter } from "@/features/account/queries";
import { getCustomer } from "@/features/account/session";
import { routing } from "@/i18n/routing";
import { clientIp, rateLimitKey } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { ensureCart, getCartId } from "./cart";
import { deleteItem, getSlotForProduct, getVariantForProduct, insertItem, setCartCoupon } from "./queries";
import { parseItem, type ParsedItem } from "./schemas";

export type AddState = { status: "idle" | "ok" | "error"; fields: string[] };

type Checked =
  | {
      ok: true;
      productId: string;
      categoryId: string;
      basePrice: number;
      addons: Addon[];
      item: ParsedItem;
    }
  | { ok: false; fields: string[] };

// prévia do preço antes de o cliente digitar o personagem: o preço não depende dele
const QUOTE_WHO = { realm: "quote", faction: "alliance", character: "quote" };

function formInput(form: FormData, forQuote: boolean) {
  const sent = Object.fromEntries(form);
  const who = forQuote
    ? Object.fromEntries(Object.entries(QUOTE_WHO).map(([k, v]) => [k, sent[k] || v]))
    : {};
  return { ...sent, ...who, addon: form.getAll("addon").map(String) };
}

// #100: preço da combinação escolhida (e cópia dela nas opções); variante de outro produto, inativa ou
// sob consulta = null. Sem variante, vale o preço do produto.
async function variantPrice(
  item: ParsedItem,
  product: { id: string; priceUsdtCents: number; optionAxes: { name: string }[] },
) {
  if (!item.variantId) return product.priceUsdtCents;
  const variant = await getVariantForProduct(item.variantId, product.id);
  if (!variant || item.options.kind !== "service") return null;
  item.options.variant = product.optionAxes.map((a) => variant.options[a.name] ?? "");
  return variant.price;
}

// RN-11: horário escolhido existe, é deste produto e ainda tem vaga
async function slotOk(slotId: string | undefined, productId: string) {
  if (!slotId) return true;
  const slot = await getSlotForProduct(slotId, productId);
  return !!slot && isBookable(slot);
}

// Valida tudo no servidor: produto ativo, opções do produto e horário com vaga (RN-11, RN-15 a RN-17).
// Sob consulta (RN-106) não entra no carrinho.

async function checkItem(form: FormData, forQuote = false): Promise<Checked> {
  const product = await getProduct(String(form.get("product") ?? ""));
  if (!product || product.priceOnRequest) return { ok: false, fields: ["product"] };
  const slots = product.categoryKind === "gold" ? [] : await listSlotsForProduct(product.slug);
  const parsed = parseItem(product.categoryKind, formInput(form, forQuote), {
    addons: product.addons,
    maxQuantity: product.maxQuantity,
    hasSlots: slots.length > 0,
    hasVariants: product.optionAxes.length > 0,
  });
  if (!parsed.ok) return parsed;
  const basePrice = await variantPrice(parsed.item, product);
  if (basePrice === null) return { ok: false, fields: ["variant"] };
  if (!(await slotOk(parsed.item.slotId, product.id))) return { ok: false, fields: ["slotId"] };
  return {
    ok: true,
    productId: product.id,
    categoryId: product.categoryId,
    basePrice,
    addons: product.addons,
    item: parsed.item,
  };
}

export async function addToCart(_prev: AddState, form: FormData): Promise<AddState> {
  const checked = await checkItem(form);
  if (!checked.ok) return { status: "error", fields: checked.fields };
  const cartId = await ensureCart();
  await insertItem(cartId, { productId: checked.productId, ...checked.item });
  if (form.get("saveCharacter") === "on") await rememberCharacter(checked.item);
  // #102: "Comprar agora" pula o carrinho e cai direto no pagamento (carrinho e checkout na mesma página)
  const locale = routing.locales.find((l) => l === form.get("locale"));
  if (form.get("intent") === "buy" && locale) redirect(`/${locale}/carrinho#pagar`);
  refresh(); // contador do carrinho no cabeçalho
  return { status: "ok", fields: [] };
}

// RN-108: "salvar este personagem" (só logado; repetido ou acima do limite é ignorado em silêncio — a
// compra não depende disso)
async function rememberCharacter(item: ParsedItem) {
  const customer = await getCustomer();
  if (!customer) return;
  const { realm, faction, character: name } = item.options;
  await addCharacter(customer.id, { realm, faction, name });
}

// Prévia do total no formulário: calculada aqui (o navegador não calcula preço — docs/04)
export async function quoteItem(form: FormData): Promise<string | null> {
  const locale = String(form.get("locale") ?? "");
  if (!routing.locales.some((l) => l === locale)) return null;
  const checked = await checkItem(form, true);
  if (!checked.ok) return null;
  const unitCents = unitPriceCents(checked.basePrice, checked.item.options, checked.addons);
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
