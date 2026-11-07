import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getCategory, listProducts, ProductCard, toProductCard } from "@/features/catalog";
import { getRegion } from "@/lib/preferences";

// Bloqueia até ler o banco para responder 404 de verdade a categoria inexistente
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/wow/[category]">): Promise<Metadata> {
  await connection();
  const { category } = await params;
  const cat = await getCategory(category);
  return cat ? { title: cat.name, description: cat.description } : {};
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/wow/[category]">) {
  await connection();
  const { locale, category: slug } = await params;
  setRequestLocale(locale);
  const category = await getCategory(slug);
  if (!category) notFound();

  const region = await getRegion();
  const [products, c] = await Promise.all([
    listProducts({ region, categorySlug: category.slug }),
    getTranslations({ locale, namespace: "Catalog" }),
  ]);
  const unit = (u: string) => (u === "per_1k_gold" ? c("perK") : u);

  return (
    <div className="mx-auto w-full max-w-[1350px] px-4 pb-14 sm:px-5">
      <nav aria-label="Breadcrumb" className="flex gap-2 py-5 text-sm text-muted-foreground">
        <Link href={`/${locale}`} className="text-link hover:underline">
          {c("home")}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{category.name}</span>
      </nav>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-heading">
            {category.name}
          </h1>
          <p className="text-muted-foreground">{category.description}</p>
        </div>
        <span className="rounded-full bg-link/15 px-3 py-1 font-heading text-xs font-semibold text-link">
          {c("region", { region })}
        </span>
      </div>
      {products.length ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5">
          {products.map((p) => (
            <ProductCard key={p.id} p={toProductCard(locale, p, unit)} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">{c("empty")}</p>
      )}
    </div>
  );
}
