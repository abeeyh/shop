import { getTranslations, setRequestLocale } from "next-intl/server";
import { Globe, LayoutDashboard, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SiteFooter } from "@/components/organisms/SiteFooter";
import { Tooltip } from "@/components/atoms/Tooltip";
import { NavTabs } from "@/components/molecules/NavTabs";
import { Popover } from "@/components/molecules/Popover";
import { SpotlightTracker } from "@/components/molecules/SpotlightTracker";
import { SiteHeader } from "@/components/organisms/SiteHeader";
import { AccountTools, getCustomer, hasStaffSession } from "@/features/account";
import { countItems, getCartId } from "@/features/cart";
import { ChatLauncher } from "@/features/support/ChatLauncher";
import { ReportLink } from "@/features/support/components/ReportLink";
import { categoryHref, listCategories, SearchBox } from "@/features/catalog";
import { PreferenceSelects, ThemeSync, TimezoneDetector, timezoneOptions } from "@/features/preferences";
import { LOCALE_LABELS } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getTimezone } from "@/lib/preferences";
import { getTheme } from "@/features/preferences/theme";
import { THEMES } from "@/lib/theme";

async function StoreHeader({ locale }: { locale: string }) {
  await connection(); // categorias e preferências vêm do banco/cookie: hora da requisição
  const cartId = await getCartId();
  const [categories, timezone, theme, t, s, cartCount, customer, staff] = await Promise.all([
    listCategories(),
    getTimezone(),
    getTheme(),
    getTranslations({ locale, namespace: "Nav" }),
    getTranslations({ locale, namespace: "Search" }),
    cartId ? countItems(cartId) : 0,
    getCustomer(),
    hasStaffSession(), // #158: equipe logada ganha o atalho para o painel
  ]);
  // #110: busca com sugestões de produtos e categorias enquanto digita
  const searchProps = {
    action: `/${locale}/produtos`,
    locale,
    labels: {
      label: s("label"),
      placeholder: s("placeholder"),
      categories: s("suggestCategories"),
      products: s("suggestProducts"),
      seeAll: s("seeAll"),
      empty: s("suggestEmpty"),
      onRequest: s("onRequest"),
    },
  };
  const nav = categories.map((c) => ({ href: categoryHref(locale, c.slug), label: c.name }));
  const prefs = {
    locale,
    locales: routing.locales.map((code) => ({ code, label: LOCALE_LABELS[code] ?? code })),
    timezone: timezone ?? "",
    detecting: timezone === null,
    timezones: timezoneOptions(timezone),
    theme,
    themes: THEMES.map((code) => ({ code, label: t(`themes.${code}`) })),
    labels: {
      theme: t("theme"),
      language: t("language"),
      timezone: t("timezone"),
      detecting: t("detecting"),
    },
  };
  const iconLink =
    "relative grid size-11 place-items-center rounded-full border border-border text-heading hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
  return (
    <SiteHeader
      homeHref={`/${locale}`}
      search={<SearchBox id="busca" {...searchProps} />}
      mobileSearch={<SearchBox id="busca-m" {...searchProps} />}
      tabs={<NavTabs items={nav} label={t("label")} />}
      tools={
        <>
          <TimezoneDetector hasTimezone={timezone !== null} />
          <ThemeSync theme={theme} />
          {/* #130: Idioma · Carrinho · Usuário · Sair — cada ícone com dica (hover e Tab) */}
          <Tooltip label={t("preferences")}>
            <Popover label={t("preferences")} icon={<Globe aria-hidden="true" className="size-5" />}>
              <PreferenceSelects idPrefix="pref" stacked {...prefs} />
            </Popover>
          </Tooltip>
          <Tooltip label={t("cart", { n: cartCount })}>
            <Link href={`/${locale}/carrinho`} aria-label={t("cart", { n: cartCount })} className={iconLink}>
              <ShoppingCart aria-hidden="true" className="size-5" />
              {cartCount ? (
                <span
                  key={cartCount} // #168: muda o número → pulsa
                  className="count-pop absolute -top-1 -right-1 min-w-5 rounded-full bg-primary px-1.5 text-center font-heading text-[11px] leading-5 font-bold text-primary-foreground"
                >
                  {cartCount}
                </span>
              ) : null}
            </Link>
          </Tooltip>
          {staff ? (
            <Tooltip label={t("dashboard")}>
              <Link href={`/${locale}/admin`} aria-label={t("dashboard")} className={iconLink}>
                <LayoutDashboard aria-hidden="true" className="size-5" />
              </Link>
            </Tooltip>
          ) : null}
          {/* RN-107/RN-110: equipe logada não é cliente — aparece como visitante na loja */}
          <AccountTools
            locale={locale}
            signedIn={customer !== null}
            avatar={customer ? { avatar: customer.avatar, name: customer.name || customer.email } : undefined}
            iconClass={iconLink}
            labels={{ account: t("account"), signIn: t("signIn"), signOut: t("signOut") }}
          />
        </>
      }
    />
  );
}

export default async function StoreLayout({ children, params }: LayoutProps<"/[locale]">) {
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
      <SiteFooter
        about={footer("about")}
        columns={[]}
        copyright={footer("copyright")}
        extra={<ReportLink locale={locale} label={footer("report")} />}
        credits={
          // #166: CC BY 3.0 pede crédito aos autores dos ícones
          <>
            {footer("iconCredits")}{" "}
            <a href="https://game-icons.net" rel="noopener noreferrer" className="text-link hover:underline">
              game-icons.net
            </a>{" "}
            (Lorc, Delapouite) ·{" "}
            <a
              href="https://creativecommons.org/licenses/by/3.0/"
              rel="noopener noreferrer"
              className="text-link hover:underline"
            >
              CC BY 3.0
            </a>
          </>
        }
      />
      <Suspense fallback={null}>
        <ChatLauncher locale={locale} />
      </Suspense>
    </>
  );
}
