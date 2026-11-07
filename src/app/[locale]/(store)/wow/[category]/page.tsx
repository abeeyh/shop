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

  const groups = groupBySubcategory(products);
  const anchor = (name: string | null) =>
    `sub-${(name ?? "geral").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-14 sm:px-5">
      <nav aria-label="Breadcrumb" className="flex gap-2 pt-6 pb-3 text-sm text-muted-foreground">
        <Link href={`/${locale}`} className="text-link hover:underline">
          {c("home")}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{category.name}</span>
      </nav>
      <div className="mb-6 flex max-w-2xl flex-col gap-2">
        <h1 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-tight text-heading">
          {category.name}
        </h1>
        <p className="text-muted-foreground">{category.description}</p>
      </div>
      {/* #102: subcategorias a 1 clique (âncoras), fixas logo abaixo do cabeçalho */}
      {groups.length > 1 ? (
        <nav
          aria-label={c("subcategories")}
          className="no-scrollbar sticky top-[6.75rem] z-30 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-background/80 px-4 py-2.5 backdrop-blur-xl sm:-mx-5 sm:px-5 md:top-[6.5rem]"
        >
          {groups.map((g) => (
            <a
              key={anchor(g.name)}
              href={`#${anchor(g.name)}`}
              className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 font-heading text-sm font-semibold text-heading hover:bg-accent"
            >
              {g.name ?? category.name}
              <span className="text-muted-foreground">{g.items.length}</span>
            </a>
          ))}
        </nav>
      ) : null}
      {products.length ? (
        <div className="grid gap-8">
          {groups.map((g) => (
            <section
              key={anchor(g.name)}
              id={anchor(g.name)}
              aria-label={g.name ?? category.name}
              className="grid scroll-mt-44 gap-3"
            >
              {g.name ? (
                <h2 className="font-heading text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  {g.name}
                </h2>
              ) : null}
              <div className="grid gap-2">
                {g.items.map((p) => (
                  <ProductCard key={p.id} p={toProductCard(locale, p, labels, promos)} cta={c("buy")} />
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
