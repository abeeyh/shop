"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { formatUsdt, getProduct } from "@/features/catalog";
import { lineTotalCents, unitPriceCents } from "@/features/pricing/rules";
import { isBookable } from "@/features/schedule";
import { routing } from "@/i18n/routing";
import { ensureCart, getCartId } from "./cart";
import { deleteItem, getSlotForProduct, insertItem } from "./queries";
import { parseItem, type ParsedItem } from "./schemas";

export type AddState = { status: "idle" | "ok" | "error"; fields: string[] };

type Checked =
  { ok: true; productId: string; basePrice: number; item: ParsedItem } | { ok: false; fields: string[] };

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
  return { ok: true, productId: product.id, basePrice: product.priceUsdtCents, item: parsed.item };
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
  const unit = unitPriceCents(checked.basePrice, checked.item.options);
  return formatUsdt(locale, lineTotalCents(unit, checked.item.quantity));
}

export async function removeFromCart(form: FormData): Promise<void> {
  const itemId = z.uuid().safeParse(form.get("item"));
  const cartId = await getCartId();
  if (itemId.success && cartId) await deleteItem(cartId, itemId.data);
  refresh();
}
