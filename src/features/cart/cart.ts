import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { cookies } from "next/headers";
import { z } from "zod";
import { formatUsdt, productHref } from "@/features/catalog";
import { lineTotalCents, unitPriceCents, type ItemOptions } from "@/features/pricing/rules";
import { isBookable } from "@/features/schedule";
import { env } from "@/lib/env";
import { cartExists, createCart, listItems } from "./queries";

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

// RN-20: tudo recalculado do banco; item que ficou indisponível (produto inativo, horário cheio ou
// passado — RN-11) aparece marcado e fica fora do total
export async function cartSummary(locale: string, cartId: string | null) {
  const rows = cartId ? await listItems(cartId) : [];
  const lines = rows.map((r) => {
    const slotOk =
      r.slotStartsAt === null ||
      isBookable({ startsAt: r.slotStartsAt, capacity: r.slotCapacity ?? 0, reserved: r.slotReserved ?? 0 });
    const available = r.productActive && slotOk;
    const unit = unitPriceCents(r.basePriceCents, r.options as ItemOptions);
    const total = lineTotalCents(unit, r.quantity);
    return {
      id: r.id,
      name: r.productName,
      href: productHref(locale, { categorySlug: r.categorySlug, slug: r.productSlug }),
      kind: r.categoryKind,
      region: r.region,
      quantity: r.quantity,
      options: r.options as ItemOptions,
      slotStartsAt: r.slotStartsAt?.toISOString() ?? null,
      available,
      totalCents: total,
      total: formatUsdt(locale, total),
    };
  });
  const subtotal = lines.filter((l) => l.available).reduce((s, l) => s + l.totalCents, 0);
  return {
    lines,
    subtotalCents: subtotal,
    subtotal: formatUsdt(locale, subtotal),
    hasUnavailable: lines.some((l) => !l.available),
  };
}
