import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { ProductSearch } from "@/features/catalog/ProductSearch";

export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/produtos">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Search" });
  return { title: t("title") };
}

// RN-100 a RN-105: página de produtos com busca e filtros
export default async function ProductsPage({ params, searchParams }: PageProps<"/[locale]/produtos">) {
  await connection();
  const { locale } = await params;
  setRequestLocale(locale);
  const [raw, t, c] = await Promise.all([
    searchParams,
    getTranslations({ locale, namespace: "Search" }),
    getTranslations({ locale, namespace: "Catalog" }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-14 sm:px-5">
      <nav aria-label={c("breadcrumb")} className="flex gap-2 py-5 text-sm text-muted-foreground">
        <Link href={`/${locale}`} className="text-link hover:underline">
          {c("home")}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t("title")}</span>
      </nav>
      <h1 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-heading">{t("title")}</h1>
      <ProductSearch locale={locale} raw={raw} />
    </div>
  );
}
