import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { buttonVariants } from "@/components/atoms/Button";
import { GradientCard } from "@/components/molecules/GradientCard";
import { LocalTime } from "@/components/molecules/LocalTime";
import { cartSummary, getCartId, removeFromCart, type CartLine } from "@/features/cart";
import { KindThumb } from "@/features/catalog";
import { CheckoutForm } from "@/features/orders";
import { canonicalLocale } from "@/i18n/routing";
import { getTimezone } from "@/lib/preferences";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/carrinho">): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "Cart" }))("title"), robots: { index: false } };
}

type T = Awaited<ReturnType<typeof getTranslations<"Cart">>>;

// detalhes do item no idioma do usuário (o horário da raid aparece no fuso escolhido — RN-83)
function details(line: CartLine, t: T): string {
  const o = line.options;
  if (o.kind === "gold") return `${o.realm} · ${t(o.faction)} · ${o.character} · ${line.quantity}k`;
  if (o.kind === "raid") return t(`loot.${o.loot}`);
  return `+${o.keyLevel} × ${t("runs", { n: line.quantity })}${o.timed ? ` · ${t("timed")}` : ""}`;
}

export default async function CartPage({ params }: PageProps<"/[locale]/carrinho">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, k, timeZone, cartId] = await Promise.all([
    getTranslations({ locale, namespace: "Cart" }),
    getTranslations({ locale, namespace: "Checkout" }),
    getTimezone(),
    getCartId(),
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
    <div className="mx-auto w-full max-w-[1350px] px-4 py-10 sm:px-5">
      <h1 className="mb-6 font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-heading">
        {t("title")}
      </h1>
      <div className="grid items-start gap-7 lg:grid-cols-[1.2fr_0.8fr]">
        <ul className="grid gap-4">
          {cart.lines.map((line) => (
            <li key={line.id}>
              <GradientCard tone="solid" className="flex flex-wrap items-center gap-4">
                <div className="w-18 shrink-0 [&>div]:mb-0">
                  <KindThumb kind={line.kind} />
                </div>
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
                    {details(line, t)} · {line.region}
                  </p>
                  {line.available ? null : <p className="text-sm text-error-text">{t("unavailable")}</p>}
                </div>
                <strong className={line.available ? "text-heading" : "text-muted-foreground line-through"}>
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
          <div className="flex items-baseline justify-between">
            <span>{t("subtotal")}</span>
            <span className="font-heading text-2xl font-bold text-heading">{cart.subtotal}</span>
          </div>
          <p className="text-xs text-muted-foreground">{t("note")}</p>
          {cart.hasUnavailable ? <p className="text-sm text-error-text">{t("removeUnavailable")}</p> : null}
          <CheckoutForm
            locale={locale}
            disabled={cart.hasUnavailable}
            labels={{
              email: k("email"),
              emailHint: k("emailHint"),
              network: k("network"),
              networkWarning: k("networkWarning"),
              pay: k("pay"),
              errors: {
                email: k("errors.email"),
                empty: k("errors.empty"),
                unavailable: k("errors.unavailable"),
                payment: k("errors.payment"),
              },
            }}
          />
        </GradientCard>
      </div>
    </div>
  );
}
