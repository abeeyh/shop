import { getTranslations, setRequestLocale } from "next-intl/server";
import { Globe, ShoppingCart, UserRound } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SiteFooter } from "@/components/organisms/SiteFooter";
import { NavTabs } from "@/components/molecules/NavTabs";
import { Popover } from "@/components/molecules/Popover";
import { SearchField } from "@/components/molecules/SearchField";
import { SpotlightTracker } from "@/components/molecules/SpotlightTracker";
import { SiteHeader } from "@/components/organisms/SiteHeader";
import { countItems, getCartId } from "@/features/cart";
import { ChatLauncher } from "@/features/support/ChatLauncher";
import { ReportLink } from "@/features/support/components/ReportLink";
import { categoryHref, listCategories } from "@/features/catalog";
import { PreferenceSelects, TimezoneDetector, timezoneOptions } from "@/features/preferences";
import { LOCALE_LABELS } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getTimezone } from "@/lib/preferences";

async function StoreHeader({ locale }: { locale: string }) {
  await connection(); // categorias e preferências vêm do banco/cookie: hora da requisição
  const cartId = await getCartId();
  const [categories, timezone, t, s, cartCount] = await Promise.all([
    listCategories(),
    getTimezone(),
    getTranslations({ locale, namespace: "Nav" }),
    getTranslations({ locale, namespace: "Search" }),
    cartId ? countItems(cartId) : 0,
  ]);
  const searchProps = { action: `/${locale}/produtos`, label: s("label"), placeholder: s("placeholder") };
  const nav = categories.map((c) => ({ href: categoryHref(locale, c.slug), label: c.name }));
  const prefs = {
    locale,
    locales: routing.locales.map((code) => ({ code, label: LOCALE_LABELS[code] ?? code })),
    timezone: timezone ?? "",
    detecting: timezone === null,
    timezones: timezoneOptions(timezone),
    labels: {
      language: t("language"),
      timezone: t("timezone"),
      detecting: t("detecting"),
    },
  };
  const iconLink =
    "relative grid size-11 place-items-center rounded-full border border-border text-heading hover:bg-accent";
  return (
    <SiteHeader
      homeHref={`/${locale}`}
      search={<SearchField id="busca" {...searchProps} />}
      mobileSearch={<SearchField id="busca-m" {...searchProps} />}
      tabs={<NavTabs items={nav} label={t("label")} />}
      tools={
        <>
          <TimezoneDetector hasTimezone={timezone !== null} />
          {/* idioma e fuso já vêm detectados: ficam guardados atrás do globo (#102) */}
          <Popover label={t("preferences")} icon={<Globe aria-hidden="true" className="size-5" />}>
            <PreferenceSelects idPrefix="pref" stacked {...prefs} />
          </Popover>
          {/* RN-107: a página decide entre "Minha conta" e o login */}
          <Link href={`/${locale}/conta`} aria-label={t("account")} className={iconLink}>
            <UserRound aria-hidden="true" className="size-5" />
          </Link>
          <Link href={`/${locale}/carrinho`} aria-label={t("cart", { n: cartCount })} className={iconLink}>
            <ShoppingCart aria-hidden="true" className="size-5" />
            {cartCount ? (
              <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-primary px-1.5 text-center font-heading text-[11px] leading-5 font-bold text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>
        </>
      }
    />
  );
}

export default async function StoreLayout({ children, modal, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [nav, footer] = await Promise.all([
    getTranslations({ locale, namespace: "Nav" }),
    getTranslations({ locale, namespace: "Footer" }),
  ]);

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-card px-3 py-2 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        {nav("skip")}
      </a>
      <Suspense fallback={<SiteHeader homeHref={`/${locale}`} />}>
        <StoreHeader locale={locale} />
      </Suspense>
      <SpotlightTracker />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      {/* #102: gaveta do produto aberta pela lista (lê o banco: Suspense próprio, não segura a página) */}
      <Suspense fallback={null}>{modal}</Suspense>
      <SiteFooter
        about={footer("about")}
        columns={[]}
        copyright={footer("copyright")}
        extra={<ReportLink locale={locale} label={footer("report")} />}
      />
      <Suspense fallback={null}>
        <ChatLauncher locale={locale} />
      </Suspense>
    </>
  );
}
