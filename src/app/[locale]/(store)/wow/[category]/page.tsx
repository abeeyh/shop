import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cardLabels, getCategory, listProducts, ProductCard, toProductCard } from "@/features/catalog";
import { activePromotions } from "@/features/discounts/queries";
import { UpcomingRaids } from "@/features/schedule/UpcomingRaids";
import { getTimezone } from "@/lib/preferences";

// Bloqueia até ler o banco para responder 404 de verdade a categoria inexistente
export const instant = false;

export async function generateMetadata({ params }: PageProps<"/[locale]/wow/[category]">): Promise<Metadata> {
  await connection();
  const { category } = await params;
  const cat = await getCategory(category);
  return cat ? { title: cat.name, description: cat.description } : {};
}

// #94: produtos já vêm na ordem do admin (subcategoria → posição); agrupa os vizinhos da mesma subcategoria
function groupBySubcategory<T extends { subcategoryName: string | null }>(items: T[]) {
  const groups: { name: string | null; items: T[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && last.name === item.subcategoryName) last.items.push(item);
    else groups.push({ name: item.subcategoryName, items: [item] });
  }
  return groups;
}

export default async function CategoryPage({ params }: PageProps<"/[locale]/wow/[category]">) {
  await connection();
  const { locale, category: slug } = await params;
  setRequestLocale(locale);
  const category = await getCategory(slug);
  if (!category) notFound();

  const timeZone = await getTimezone();
  const [products, c, promos] = await Promise.all([
    listProducts({ categorySlug: category.slug }),
    getTranslations({ locale, namespace: "Catalog" }),
    activePromotions(),
  ]);
  const labels = cardLabels(c);

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
      </div>
      {products.length ? (
        <div className="grid gap-10">
          {groupBySubcategory(products).map((g) => (
            <section key={g.name ?? "-"} aria-label={g.name ?? category.name} className="grid gap-5">
              {g.name ? (
                <h2 className="font-heading text-[clamp(1.25rem,2.5vw,1.5rem)] font-bold text-heading">
                  {g.name}
                </h2>
              ) : null}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5">
                {g.items.map((p) => (
                  <ProductCard key={p.id} p={toProductCard(locale, p, labels, promos)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">{c("empty")}</p>
      )}
      {category.kind !== "gold" ? (
        <UpcomingRaids locale={locale} timeZone={timeZone} categorySlug={category.slug} />
      ) : null}
    </div>
  );
}
