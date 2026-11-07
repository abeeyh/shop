import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { GradientCard } from "@/components/molecules/GradientCard";
import { PriceTag } from "@/components/molecules/PriceTag";
import { categoryHref, formatEstimate, formatUsdt, getProduct, KindThumb } from "@/features/catalog";
import { UpcomingRaids } from "@/features/schedule/UpcomingRaids";
import { getTimezone } from "@/lib/preferences";

export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/wow/[category]/[product]">): Promise<Metadata> {
  await connection();
  const { product } = await params;
  const p = await getProduct(product);
  return p ? { title: p.name, description: p.description } : {};
}

export default async function ProductPage({ params }: PageProps<"/[locale]/wow/[category]/[product]">) {
  await connection();
  const { locale, category, product: slug } = await params;
  setRequestLocale(locale);
  const product = await getProduct(slug);
  // produto inexistente, inativo ou em outra categoria → 404 (RN-19)
  if (!product || product.categorySlug !== category) notFound();
  const [c, s, timeZone] = await Promise.all([
    getTranslations({ locale, namespace: "Catalog" }),
    getTranslations({ locale, namespace: "Schedule" }),
    getTimezone(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1350px] px-4 pb-14 sm:px-5">
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 py-5 text-sm text-muted-foreground">
        <Link href={`/${locale}`} className="text-link hover:underline">
          {c("home")}
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={categoryHref(locale, product.categorySlug)} className="text-link hover:underline">
          {product.categoryName}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>
      <div className="grid gap-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="flex flex-col gap-5">
          <KindThumb kind={product.categoryKind} badge={product.region} />
          <GradientCard tone="solid" className="flex flex-col gap-4">
            <h1 className="font-heading text-[clamp(1.5rem,3vw,2rem)] font-bold text-heading">
              {product.name}
            </h1>
            <p className="text-muted-foreground">{product.description}</p>
            <p className="flex gap-2.5 rounded-md border border-link/30 bg-link/10 p-3 text-sm">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-link" />
              {c("selfPlay")}
            </p>
          </GradientCard>
        </div>
        <GradientCard tone="solid" className="flex flex-col gap-3 lg:sticky lg:top-24">
          <PriceTag
            price={formatUsdt(locale, product.priceUsdtCents)}
            estimate={formatEstimate(locale, product.priceUsdtCents)}
            unit={product.unit === "per_1k_gold" ? c("perK") : undefined}
          />
          <p className="text-xs text-muted-foreground">{c("estimateNote")}</p>
        </GradientCard>
      </div>
      {product.categoryKind === "raid" ? (
        <UpcomingRaids
          locale={locale}
          region={product.region}
          timeZone={timeZone}
          productSlug={product.slug}
          title={s("slotsTitle")}
        />
      ) : null}
    </div>
  );
}
