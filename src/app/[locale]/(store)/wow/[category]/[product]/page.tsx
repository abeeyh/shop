import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ProductPanel } from "@/features/cart/ProductPanel";
import { categoryHref, getProduct } from "@/features/catalog";
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

// Página do produto (link direto, recarregar ou compartilhar). Vindo da lista, a mesma compra abre
// numa gaveta (@modal/(.)wow/… — #102).
export default async function ProductPage({ params }: PageProps<"/[locale]/wow/[category]/[product]">) {
  await connection();
  const { locale, category, product: slug } = await params;
  setRequestLocale(locale);
  const product = await getProduct(slug);
  // produto inexistente, inativo ou em outra categoria → 404 (RN-19)
  if (!product || product.categorySlug !== category) notFound();
  const [c, timeZone] = await Promise.all([getTranslations({ locale, namespace: "Catalog" }), getTimezone()]);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-14 sm:px-5">
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 pt-6 pb-5 text-sm text-muted-foreground">
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
      <ProductPanel locale={locale} product={product} timeZone={timeZone} />
    </div>
  );
}
