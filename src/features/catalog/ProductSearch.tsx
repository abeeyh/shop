import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import Link from "next/link";
import { buttonVariants } from "@/components/atoms/Button";
import { activePromotions } from "@/features/discounts/queries";
import { clientIp, rateLimitKey } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { ProductCard } from "./components/ProductCard";
import { ProductFilters } from "./components/ProductFilters";
import { categoryHref, toProductCard } from "./format";
import { listCategories } from "./queries";
import { filtersToQuery, PAGE_SIZE, parseFilters, SORTS, type Filters } from "./schemas";
import { searchProducts } from "./search";

type T = Awaited<ReturnType<typeof getTranslations<"Search">>>;
type Chip = { label: string; href: string };
type Category = { slug: string; name: string };

// RN-105: rate limit da busca por IP (só quando há termo)
async function searchAllowed(f: Filters): Promise<boolean> {
  if (!f.q) return true;
  const ip = clientIp(await headers(), env.CLIENT_IP_HEADER ?? "x-forwarded-for");
  return (await rateLimit({ key: `search:${rateLimitKey(ip)}`, ...RATE_LIMITS.search })).allowed;
}

// RN-101: filtros ativos viram chips que levam à mesma busca sem aquele filtro
function buildChips(
  f: Filters,
  region: string,
  categories: Category[],
  t: T,
  href: (p: Partial<Filters>) => string,
): Chip[] {
  const name = (slug: string) => categories.find((x) => x.slug === slug)?.name ?? slug;
  const reset = { page: 1 };
  return [
    ...(f.q ? [{ label: `“${f.q}”`, href: href({ ...reset, q: "" }) }] : []),
    ...f.categories.map((slug) => ({
      label: name(slug),
      href: href({ ...reset, categories: f.categories.filter((x) => x !== slug) }),
    })),
    ...(f.region !== region
      ? [
          {
            label: `${t("region")}: ${f.region === "all" ? t("all") : f.region}`,
            href: href({ ...reset, region: region as "US" }),
          },
        ]
      : []),
    ...(f.min !== undefined ? [{ label: `≥ ${f.min} USDT`, href: href({ ...reset, min: undefined }) }] : []),
    ...(f.max !== undefined ? [{ label: `≤ ${f.max} USDT`, href: href({ ...reset, max: undefined }) }] : []),
    ...(f.available ? [{ label: t("available"), href: href({ ...reset, available: false }) }] : []),
  ];
}

function ActiveFilters({ chips, clearHref, t }: { chips: Chip[]; clearHref: string; t: T }) {
  if (!chips.length) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.href}
          aria-label={t("removeFilter", { f: chip.label })}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent py-1 pr-2 pl-3 text-[13px] text-heading hover:bg-muted"
        >
          {chip.label}
          <X aria-hidden="true" className="size-3.5" />
        </Link>
      ))}
      <Link href={clearHref} className={buttonVariants({ variant: "ghost", size: "sm" })}>
        {t("clear")}
      </Link>
    </div>
  );
}

function EmptyState({
  locale,
  categories,
  clearHref,
  t,
}: {
  locale: string;
  categories: Category[];
  clearHref: string;
  t: T;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-5 py-12 text-center">
      <h2 className="font-heading text-xl font-bold text-heading">{t("noResults")}</h2>
      <p className="text-muted-foreground">{t("noResultsText")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={categoryHref(locale, cat.slug)}
            className={buttonVariants({ variant: "gradient-outline", size: "sm" })}
          >
            {cat.name}
          </Link>
        ))}
      </div>
      <Link href={clearHref} className={buttonVariants({ variant: "primary" })}>
        {t("clear")}
      </Link>
    </div>
  );
}

function Pagination({
  page,
  pages,
  href,
  t,
}: {
  page: number;
  pages: number;
  href: (p: Partial<Filters>) => string;
  t: T;
}) {
  if (pages <= 1) return null;
  const link = buttonVariants({ variant: "ghost", size: "sm" });
  return (
    <nav aria-label={t("pagination")} className="mt-8 flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link href={href({ page: page - 1 })} className={link}>
          {t("prev")}
        </Link>
      ) : null}
      <span className="text-sm text-muted-foreground">
        {page} / {pages}
      </span>
      {page < pages ? (
        <Link href={href({ page: page + 1 })} className={link}>
          {t("next")}
        </Link>
      ) : null}
    </nav>
  );
}

function filterLabels(t: T) {
  return {
    title: t("filters"),
    search: t("label"),
    placeholder: t("placeholder"),
    category: t("category"),
    region: t("region"),
    all: t("all"),
    price: t("price"),
    min: t("minPrice"),
    max: t("maxPrice"),
    available: t("available"),
    sort: t("sort"),
    sorts: {
      relevance: t("relevance"),
      best: t("best"),
      "price-asc": t("priceAsc"),
      "price-desc": t("priceDesc"),
    },
    apply: t("apply"),
  };
}

type Props = { locale: string; region: "US" | "EU"; raw: Record<string, string | string[] | undefined> };

// RN-100 a RN-105: busca e filtros na URL, aplicados no servidor
export async function ProductSearch({ locale, region, raw }: Props) {
  const [categories, t, c, promos] = await Promise.all([
    listCategories(),
    getTranslations({ locale, namespace: "Search" }),
    getTranslations({ locale, namespace: "Catalog" }),
    activePromotions(),
  ]);
  const f = parseFilters(raw, { region, categories: categories.map((x) => x.slug) });
  const base = `/${locale}/produtos`;
  const href = (patch: Partial<Filters>) => base + filtersToQuery(f, region, patch);
  const allowed = await searchAllowed(f);
  const { items, total } = allowed ? await searchProducts(f) : { items: [], total: 0 };
  const unit = (u: string) => (u === "per_1k_gold" ? c("perK") : u);
  const status = allowed
    ? `${t("results", { n: total })}${f.q ? ` ${t("resultsFor", { q: f.q })}` : ""}`
    : t("tooMany");

  return (
    <>
      <p role="status" className="mb-6 text-muted-foreground">
        {status}
      </p>
      {f.tooShort ? <p className="mb-4 text-sm text-error-text">{t("min")}</p> : null}
      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        <ProductFilters
          action={base}
          values={f}
          categories={categories}
          sorts={SORTS.filter((s) => s !== "relevance" || f.q)}
          labels={filterLabels(t)}
        />
        <div>
          <ActiveFilters chips={buildChips(f, region, categories, t, href)} clearHref={base} t={t} />
          {items.length ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-5">
              {items.map((p) => (
                <div key={p.id} className="relative">
                  {p.available ? null : (
                    <span className="absolute top-7 right-7 z-10 rounded-full bg-destructive px-3 py-1 font-heading text-xs font-semibold text-destructive-foreground">
                      {t("unavailable")}
                    </span>
                  )}
                  <ProductCard p={toProductCard(locale, p, unit, promos)} />
                </div>
              ))}
            </div>
          ) : allowed ? (
            <EmptyState locale={locale} categories={categories} clearHref={base} t={t} />
          ) : null}
          <Pagination page={f.page} pages={Math.max(1, Math.ceil(total / PAGE_SIZE))} href={href} t={t} />
        </div>
      </div>
    </>
  );
}
