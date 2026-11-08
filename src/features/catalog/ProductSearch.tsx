import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Pagination } from "@/components/molecules/Pagination";
import { headers } from "next/headers";
import Link from "next/link";
import { buttonVariants } from "@/components/atoms/Button";
import { activePromotions } from "@/features/discounts/queries";
import { clientIp, rateLimitKey } from "@/lib/client-ip";
import { env } from "@/lib/env";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { ProductCard } from "./components/ProductCard";
import { ProductFilters } from "./components/ProductFilters";
import { cardLabels, categoryHref, toProductCard } from "./format";
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
function buildChips(f: Filters, categories: Category[], t: T, href: (p: Partial<Filters>) => string): Chip[] {
  const name = (slug: string) => categories.find((x) => x.slug === slug)?.name ?? slug;
  const reset = { page: 1 };
  return [
    ...(f.q ? [{ label: `“${f.q}”`, href: href({ ...reset, q: "" }) }] : []),
    ...f.categories.map((slug) => ({
      label: name(slug),
      href: href({ ...reset, categories: f.categories.filter((x) => x !== slug) }),
    })),
    ...(f.min !== undefined ? [{ label: `≥ ${f.min} USDT`, href: href({ ...reset, min: undefined }) }] : []),
    ...(f.max !== undefined ? [{ label: `≤ ${f.max} USDT`, href: href({ ...reset, max: undefined }) }] : []),
    ...(f.available ? [{ label: t("available"), href: href({ ...reset, available: false }) }] : []),
    ...(f.promo ? [{ label: t("promo"), href: href({ ...reset, promo: false }) }] : []),
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

function filterLabels(t: T) {
  return {
    title: t("filters"),
    search: t("label"),
    placeholder: t("placeholder"),
    category: t("category"),
    price: t("price"),
    min: t("minPrice"),
    max: t("maxPrice"),
    available: t("available"),
    promo: t("promo"),
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

type Props = { locale: string; raw: Record<string, string | string[] | undefined> };

// RN-100 a RN-105: busca e filtros na URL, aplicados no servidor
export async function ProductSearch({ locale, raw }: Props) {
  const [categories, t, c, promos] = await Promise.all([
    listCategories(),
    getTranslations({ locale, namespace: "Search" }),
    getTranslations({ locale, namespace: "Catalog" }),
    activePromotions(),
  ]);
  const f = parseFilters(raw, { categories: categories.map((x) => x.slug) });
  const base = `/${locale}/produtos`;
  const href = (patch: Partial<Filters>) => base + filtersToQuery(f, patch);
  const allowed = await searchAllowed(f);
  const { items, total } = allowed ? await searchProducts(f) : { items: [], total: 0 };
  const labels = cardLabels(c);
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
          <ActiveFilters chips={buildChips(f, categories, t, href)} clearHref={base} t={t} />
          {items.length ? (
            <div className="grid gap-2">
              {items.map((p) => (
                <ProductCard
                  key={p.id}
                  p={toProductCard(locale, p, labels, promos)}
                  cta={c("buy")}
                  flag={p.available ? undefined : t("unavailable")}
                />
              ))}
            </div>
          ) : allowed ? (
            <EmptyState locale={locale} categories={categories} clearHref={base} t={t} />
          ) : null}
          <Pagination
            page={f.page}
            pages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
            href={(page) => href({ page })}
            labels={{ nav: t("pagination"), prev: t("prev"), next: t("next") }}
          />
        </div>
      </div>
    </>
  );
}
