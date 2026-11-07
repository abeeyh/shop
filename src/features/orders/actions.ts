"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { cartSummary, clearCart, getCartId } from "@/features/cart";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import { errorSummary, logger } from "@/lib/logger";
import { createInvoice } from "@/lib/payments/crypto";
import { orderPath } from "./link";
import { insertOrder, markExpired, setInvoice } from "./queries";
import { NETWORKS, PAYMENT_WINDOW_MINUTES } from "./rules";

export type CheckoutState = { error: "" | "email" | "empty" | "unavailable" | "payment" };

const input = z.object({
  email: z.email().max(254),
  network: z.enum(NETWORKS),
  locale: z.enum(routing.locales),
});

// RN-01, RN-20, RN-30, RN-35: total recalculado aqui; o pedido congela os preços; o pagamento é
// na fatura do provedor e só o IPN confirma (RN-32)
export async function placeOrder(_prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const parsed = input.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "email" };
  const { email, network, locale } = parsed.data;
  const cartId = await getCartId();
  const cart = await cartSummary(locale, cartId);
  if (!cartId || cart.lines.length === 0) return { error: "empty" };
  if (cart.hasUnavailable) return { error: "unavailable" };

  const orderId = await insertOrder({
    email: email.toLowerCase(),
    locale,
    network,
    subtotalUsdtCents: cart.subtotalCents,
    totalUsdtCents: cart.subtotalCents, // descontos entram com #21
    expiresAt: new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60_000),
    items: cart.lines.map((l) => ({
      productId: l.productId,
      raidSlotId: l.slotId,
      productName: l.name,
      options: l.options,
      unitPriceUsdtCents: l.unitCents,
      quantity: l.quantity,
    })),
  });

  let payUrl: string;
  try {
    const invoice = await createInvoice({
      orderId,
      totalUsdtCents: cart.subtotalCents,
      network,
      ipnUrl: `${env.APP_URL}/api/webhooks/crypto`,
      returnUrl: `${env.APP_URL}${orderPath(locale, orderId)}`,
    });
    await setInvoice(orderId, env.PAYMENTS_PROVIDER, invoice.providerPaymentId, invoice.payUrl);
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
