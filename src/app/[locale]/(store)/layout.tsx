import { getTranslations, setRequestLocale } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { SiteFooter } from "@/components/organisms/SiteFooter";
import { SiteHeader } from "@/components/organisms/SiteHeader";
import { categoryHref, listCategories } from "@/features/catalog";
import { getRegion } from "@/lib/preferences";

async function StoreHeader({ locale }: { locale: string }) {
  await connection(); // categorias e região vêm do banco/cookie: hora da requisição
  const [categories, region, t] = await Promise.all([
    listCategories(),
    getRegion(),
    getTranslations({ locale, namespace: "Nav" }),
  ]);
  return (
    <SiteHeader
      homeHref={`/${locale}`}
      navLabel={t("label")}
      nav={categories.map((c) => ({ href: categoryHref(locale, c.slug), label: c.name }))}
      tools={
        <span className="rounded-full bg-muted px-3 py-1 font-heading text-xs font-semibold text-muted-foreground">
          {t("region")}: {region}
        </span>
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
