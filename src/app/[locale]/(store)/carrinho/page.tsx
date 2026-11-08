import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@/components/atoms/Button";
import { GradientCard } from "@/components/molecules/GradientCard";
import { LocalTime } from "@/components/molecules/LocalTime";
import { getCustomer } from "@/features/account";
import { cartSummary, getCartId, removeFromCart } from "@/features/cart";
import { CouponForm } from "@/features/cart/components/CouponForm";
import { describeItem } from "@/features/cart/describe";
import { KindTile } from "@/features/catalog";
import { CheckoutForm } from "@/features/orders";
import { canonicalLocale } from "@/i18n/routing";
import { getTimezone } from "@/lib/preferences";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/carrinho">): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "Cart" }))("title"), robots: { index: false } };
}

type T = Awaited<ReturnType<typeof getTranslations<"Cart">>>;

type Cart = Awaited<ReturnType<typeof cartSummary>>;

// RN-26: mostra qual desconto valeu e por quê
function Totals({ cart, t }: { cart: Cart; t: T }) {
  const row = "flex items-baseline justify-between text-sm";
  const why =
    cart.coupon?.state === "not_better"
      ? t("couponNotBetter")
      : cart.coupon?.state === "invalid"
        ? t("couponNotApplicable")
        : null;
  return (
    <div className="grid gap-2">
      <p className={row}>
        <span>{t("subtotal")}</span>
        <span>{cart.subtotal}</span>
      </p>
      {cart.discount.source !== "none" ? (
        <p className={`${row} text-link`}>
          <span>
            {cart.discount.source === "coupon"
              ? t("discountCoupon", { code: cart.coupon!.code.toUpperCase() })
              : t("discountPromotion")}
          </span>
          <span>−{cart.discount.formatted}</span>
        </p>
      ) : null}
      {why ? <p className="text-xs text-muted-foreground">{why}</p> : null}
      <p className="flex items-baseline justify-between border-t border-border pt-2">
        <span>{t("total")}</span>
        <span data-testid="cart-total" className="font-heading text-2xl font-bold text-heading">
          {cart.total}
        </span>
      </p>
    </div>
  );
}

export default async function CartPage({ params }: PageProps<"/[locale]/carrinho">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, k, timeZone, cartId, customer] = await Promise.all([
    getTranslations({ locale, namespace: "Cart" }),
    getTranslations({ locale, namespace: "Checkout" }),
    getTimezone(),
    getCartId(),
    getCustomer(),
  ]);
  const cart = await cartSummary(locale, cartId);

  if (!cart.lines.length) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-heading">{t("title")}</h1>
        <p className="text-muted-foreground">{t("empty")}</p>
        <Link href={`/${locale}/produtos`} className={buttonVariants({ variant: "primary" })}>
          {t("browse")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-5">
      <h1 className="mb-6 font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-heading">
        {t("title")}
      </h1>
      <div className="grid items-start gap-7 lg:grid-cols-[1.2fr_0.8fr]">
        <ul className="grid gap-4">
          {cart.lines.map((line) => (
            <li key={line.id}>
              <GradientCard tone="solid" className="flex flex-wrap items-center gap-4">
                <KindTile kind={line.kind} />
                <div className="min-w-0 flex-1">
                  <Link href={line.href} className="font-heading font-semibold text-heading hover:underline">
                    {line.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {line.slotStartsAt ? (
                      <>
                        <LocalTime
                          iso={line.slotStartsAt}
                          locale={canonicalLocale(locale)}
                          timeZone={timeZone}
                        />{" "}
                        ·{" "}
                      </>
                    ) : null}
                    {describeItem(line.options, line.quantity, t)}
                  </p>
                  {line.available ? null : <p className="text-sm text-error-text">{t("unavailable")}</p>}
                </div>
                <strong className={line.available ? "text-heading" : "text-muted-foreground line-through"}>
                  {line.original ? (
                    <s className="mr-1.5 text-sm font-medium text-muted-foreground">{line.original}</s>
                  ) : null}
                  {line.total}
                </strong>
                <form action={removeFromCart}>
                  <input type="hidden" name="item" value={line.id} />
                  <button type="submit" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    {t("remove")}
                  </button>
                </form>
              </GradientCard>
            </li>
          ))}
        </ul>
        <GradientCard tone="solid" className="flex flex-col gap-3 lg:sticky lg:top-24">
          <Totals cart={cart} t={t} />
          <CouponForm
            current={cart.coupon?.code ?? null}
            labels={{
              code: t("coupon"),
              apply: t("applyCoupon"),
              remove: t("removeCoupon"),
              invalid: t("couponInvalid"),
            }}
          />
          {cart.hasUnavailable ? <p className="text-sm text-error-text">{t("removeUnavailable")}</p> : null}
          {/* #102: "Comprar agora" chega aqui (#pagar) */}
          <div id="pagar" className="scroll-mt-32" />
          <CheckoutForm
            locale={locale}
            defaultEmail={customer?.email}
            disabled={cart.hasUnavailable}
            expectedTotal={cart.totalCents}
            labels={{
              email: k("email"),
              emailHint: k("emailHint"),
              network: k("network"),
              networkWarning: k("networkWarning"),
              pay: k("pay"),
              method: k("method"),
              crypto: k("crypto"),
              card: k("card"),
              payCard: k("payCard"),
              cardNotImplemented: k("errors.cardNotImplemented"),
              errors: {
                email: k("errors.email"),
                empty: k("errors.empty"),
                unavailable: k("errors.unavailable"),
                payment: k("errors.payment"),
                coupon: k("errors.coupon"),
                changed: k("errors.changed"),
                limited: k("errors.limited"),
                notImplemented: k("errors.notImplemented"),
                cardNotImplemented: k("errors.cardNotImplemented"),
              },
            }}
          />
        </GradientCard>
      </div>
    </div>
  );
}
