import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SiteFooter } from "@/components/organisms/SiteFooter";
import { SearchField } from "@/components/molecules/SearchField";
import { SiteHeader } from "@/components/organisms/SiteHeader";
import { categoryHref, listCategories } from "@/features/catalog";
import {
  MobileMenu,
  PreferenceSelects,
  REGIONS,
  TimezoneDetector,
  timezoneOptions,
} from "@/features/preferences";
import { LOCALE_LABELS } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getRegion, getTimezone } from "@/lib/preferences";

async function StoreHeader({ locale }: { locale: string }) {
  await connection(); // categorias e preferências vêm do banco/cookie: hora da requisição
  const [categories, region, timezone, t, s] = await Promise.all([
    listCategories(),
    getRegion(),
    getTimezone(),
    getTranslations({ locale, namespace: "Nav" }),
    getTranslations({ locale, namespace: "Search" }),
  ]);
  const searchProps = { action: `/${locale}/produtos`, label: s("label"), placeholder: s("placeholder") };
  const nav = categories.map((c) => ({ href: categoryHref(locale, c.slug), label: c.name }));
  const prefs = {
    locale,
    locales: routing.locales.map((code) => ({ code, label: LOCALE_LABELS[code] ?? code })),
    region,
    regions: REGIONS,
    timezone: timezone ?? "",
    detecting: timezone === null,
    timezones: timezoneOptions(timezone),
    labels: {
      language: t("language"),
      region: t("region"),
      timezone: t("timezone"),
      detecting: t("detecting"),
    },
  };
  return (
    <SiteHeader
      homeHref={`/${locale}`}
      navLabel={t("label")}
      nav={nav}
      search={<SearchField id="busca" {...searchProps} />}
      tools={
        <>
          <TimezoneDetector hasTimezone={timezone !== null} />
          <div className="hidden lg:flex">
            <PreferenceSelects idPrefix="pref" {...prefs} />
          </div>
          <MobileMenu openLabel={t("menu")} closeLabel={t("closeMenu")}>
            <div className="mb-4">
              <SearchField id="busca-m" {...searchProps} />
            </div>
            <nav aria-label={t("label")} className="mb-4 grid gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-2 py-3 font-heading text-base font-semibold text-heading hover:bg-accent"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <PreferenceSelects idPrefix="pref-m" stacked {...prefs} />
          </MobileMenu>
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
      <Suspense fallback={<SiteHeader homeHref={`/${locale}`} navLabel={nav("label")} nav={[]} />}>
        <StoreHeader locale={locale} />
      </Suspense>
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter about={footer("about")} columns={[]} copyright={footer("copyright")} />
    </>
  );
}
