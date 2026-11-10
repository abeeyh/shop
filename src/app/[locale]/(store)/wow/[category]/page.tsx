import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  cardLabels,
  getCategory,
  listCategoryTags,
  listProducts,
  ProductList,
  productView,
  toProductCard,
  ViewToggle,
} from "@/features/catalog";
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

// #160: produtos já vêm na ordem do admin (tag principal → posição); agrupa os vizinhos da mesma tag principal
function groupByPrimaryTag<T extends { primaryTag: string | null }>(items: T[]) {
  const groups: { name: string | null; items: T[] }[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && last.name === item.primaryTag) last.items.push(item);
    else groups.push({ name: item.primaryTag, items: [item] });
  }
  return groups;
}

export default async function CategoryPage({ params, searchParams }: PageProps<"/[locale]/wow/[category]">) {
  await connection();
  const [{ locale, category: slug }, { tag, vista }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const category = await getCategory(slug);
  if (!category) notFound();

  const [timeZone, tagList, view] = await Promise.all([
    getTimezone(),
    listCategoryTags(category.slug),
    productView(vista), // #166: lista ou grade
  ]);
  // só tag que existe na categoria vira filtro (entrada não confiável — docs/09)
  const selected = tagList.find((x) => x.slug === tag)?.slug;
  const [products, c, promos] = await Promise.all([
    listProducts({ categorySlug: category.slug, tag: selected }),
    getTranslations({ locale, namespace: "Catalog" }),
    activePromotions(),
  ]);
  const labels = cardLabels(c);

  const groups = groupByPrimaryTag(products);
  const viewHref = (v: string) =>
    `?${new URLSearchParams({ ...(selected ? { tag: selected } : {}), vista: v })}`;
  const anchor = (name: string | null) =>
    `sub-${(name ?? "geral").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-14 sm:px-5">
      <nav aria-label={c("breadcrumb")} className="flex gap-2 pt-6 pb-3 text-sm text-muted-foreground">
        <Link href={`/${locale}`} className="text-link hover:underline">
          {c("home")}
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{category.name}</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-tight text-heading">
            {category.name}
          </h1>
          <p className="text-muted-foreground">{category.description}</p>
        </div>
        <ViewToggle
          view={view}
          hrefs={{ lista: viewHref("lista"), grade: viewHref("grade") }}
          labels={{ group: c("view.group"), lista: c("view.list"), grade: c("view.grid") }}
        />
      </div>
      {/* #160: tags como chips de filtro (?tag=), fixos logo abaixo do cabeçalho */}
      {tagList.length > 1 ? (
        <nav
          aria-label={c("tags")}
          className="no-scrollbar sticky top-[6.75rem] z-30 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-background/80 px-4 py-2.5 backdrop-blur-xl sm:-mx-5 sm:px-5 md:top-[6.5rem]"
        >
          {[{ slug: undefined, name: c("allTags") }, ...tagList].map((x) => {
            const on = x.slug === selected;
            return (
              <Link
                key={x.slug ?? "all"}
                href={x.slug ? `?tag=${encodeURIComponent(x.slug)}` : `/${locale}/wow/${category.slug}`}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-11 shrink-0 items-center rounded-full border px-3.5 font-heading text-sm font-semibold ${on ? "border-primary bg-primary/15 text-heading" : "border-border text-heading hover:bg-accent"}`}
              >
                {x.name}
              </Link>
            );
          })}
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
              <ProductList
                view={view}
                cta={c("buy")}
                hideTag={g.name}
                items={g.items.map((p) => ({ key: p.id, p: toProductCard(locale, p, labels, promos) }))}
              />
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
