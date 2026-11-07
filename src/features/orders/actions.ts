"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCustomer } from "@/features/account/session";
import { cartSummary, clearCart, getCartId, setCartCoupon } from "@/features/cart";
import { canonicalEmail } from "@/features/discounts/queries";
import { routing } from "@/i18n/routing";
import { clientIp, rateLimitKey } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { errorSummary, logger } from "@/lib/logger";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { createInvoice, invoiceReady } from "@/lib/payments/crypto";
import { orderPath } from "./link";
import { CouponLimitError, insertOrder, markExpired, setInvoice, SoldOutError } from "./queries";
import { NETWORKS, PAYMENT_WINDOW_MINUTES } from "./rules";

export type CheckoutState = {
  error:
    "" | "email" | "empty" | "unavailable" | "payment" | "coupon" | "changed" | "limited" | "notImplemented";
};

const input = z.object({
  email: z.email().max(254),
  network: z.enum(NETWORKS),
  locale: z.enum(routing.locales),
  expectedTotal: z.coerce.number().int().nonnegative(), // só para comparar — nunca para calcular (RN-20)
});

// docs/09 §2: cada checkout reserva vaga e cupom; limite por IP impede esgotar cupom sem pagar
async function checkoutLimited(): Promise<boolean> {
  const ip = clientIp(await headers(), env.CLIENT_IP_HEADER ?? "x-forwarded-for");
  const r = await rateLimit({
    key: `checkout:${rateLimitKey(ip)}`,
    ...RATE_LIMITS.checkout,
    failClosed: true,
  });
  return !r.allowed;
}

async function createOrder(order: Parameters<typeof insertOrder>[0], cartId: string) {
  try {
    return await insertOrder(order);
  } catch (err) {
    if (err instanceof SoldOutError) return { error: "unavailable" as const }; // vaga acabou entre a tela e o clique
    if (err instanceof CouponLimitError) {
      await setCartCoupon(cartId, null); // RN-25: limite atingido — o carrinho volta sem o cupom
      refresh();
      return { error: "coupon" as const };
    }
    throw err;
  }
}

// RN-107: conta logada (opcional) — visitante compra só com e-mail (RN-01)
const customerId = async () => (await getCustomer())?.id ?? null;

// RN-01, RN-20, RN-30, RN-35: total recalculado aqui; o pedido congela os preços; o pagamento é
// na fatura do provedor e só o IPN confirma (RN-32)
export async function placeOrder(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "email" };
  const { email, network, locale, expectedTotal } = parsed.data;
  if (!invoiceReady()) return { error: "notImplemented" }; // sem provedor: nada é criado nem reservado
  if (await checkoutLimited()) return { error: "limited" };
  const cartId = await getCartId();
  const cart = await cartSummary(locale, cartId);
  if (!cartId || cart.lines.length === 0) return { error: "empty" };
  if (cart.hasUnavailable) return { error: "unavailable" };
  // promoção venceu ou cupom mudou entre a tela e o clique: mostra o carrinho de novo
  if (cart.totalCents !== expectedTotal) {
    refresh();
    return { error: "changed" };
  }

  const order = {
    email: canonicalEmail(email),
    userId: await customerId(), // RN-107: o pedido aparece em "Meus pedidos"
    locale,
    network,
    subtotalUsdtCents: cart.subtotalCents,
    discountUsdtCents: cart.discount.discountCents, // RN-26: o maior entre promoção e cupom
    discountSource: cart.discount.source,
    discountRef: cart.couponId,
    totalUsdtCents: cart.totalCents,
    expiresAt: new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60_000),
    items: cart.lines.map((l) => ({
      productId: l.productId,
      raidSlotId: l.slotId,
      variantId: l.variantId, // #100
      productName: l.name,
      options: l.options,
      unitPriceUsdtCents: l.unitCents,
      discountUsdtCents: l.discountCents,
      promotionId: l.discountCents ? l.promotionId : null,
      quantity: l.quantity,
    })),
  };

  const created = await createOrder(order, cartId);
  if (typeof created !== "string") return created;
  const orderId = created;

  let payUrl: string;
  try {
    const invoice = await createInvoice({
      orderId,
      totalUsdtCents: cart.totalCents,
      network,
      ipnUrl: `${env.APP_URL}/api/webhooks/crypto`,
      returnUrl: `${env.APP_URL}${orderPath(locale, orderId)}`,
    });
    await setInvoice(orderId, "nowpayments", invoice.providerPaymentId, invoice.payUrl);
    payUrl = invoice.payUrl;
  } catch (err) {
    logger.error(
      { event: "checkout.invoice_failed", orderId, ...errorSummary(err) },
      "falha ao criar fatura",
    );
    await markExpired(orderId); // carrinho continua intacto para tentar de novo
    return { error: "payment" };
  }
  await clearCart(cartId);
  redirect(payUrl);
}
