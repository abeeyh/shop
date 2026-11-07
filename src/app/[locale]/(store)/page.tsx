import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import {
  CategoryCard,
  categoryHref,
  listCategories,
  listProducts,
  ProductCard,
  toProductCard,
} from "@/features/catalog";
import { UpcomingRaids } from "@/features/schedule/UpcomingRaids";
import { getRegion, getTimezone } from "@/lib/preferences";

const BEST_SELLERS = 8;

async function HomeCatalog({ locale }: { locale: string }) {
  await connection();
  const [region, timeZone] = await Promise.all([getRegion(), getTimezone()]);
  const [categories, products, t, c] = await Promise.all([
    listCategories(),
    listProducts({ region, limit: BEST_SELLERS }),
    getTranslations({ locale, namespace: "Home" }),
    getTranslations({ locale, namespace: "Catalog" }),
  ]);
  // RN-13: categorias do admin; os botões do topo apontam para a primeira de cada tipo
  const firstOf = (kind: string) => categories.find((x) => x.kind === kind);
  const gold = firstOf("gold");
  const raid = firstOf("raid");
  const unit = (u: string) => (u === "per_1k_gold" ? c("perK") : u);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {gold ? (
          <Link
            href={categoryHref(locale, gold.slug)}
            className={buttonVariants({ variant: "primary", size: "lg" })}
          >
            {t("ctaGold")}
          </Link>
        ) : null}
        {raid ? (
          <Link
            href={categoryHref(locale, raid.slug)}
            className={buttonVariants({ variant: "gradient-outline", size: "lg" })}
          >
            {t("ctaRaid")}
          </Link>
        ) : null}
      </div>

      <section className="pt-14" aria-labelledby="categorias">
        <h2
          id="categorias"
          className="mb-6 font-heading text-[clamp(1.5rem,3vw,2rem)] font-bold text-heading"
        >
          {t("categories")}
        </h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              href={categoryHref(locale, cat.slug)}
              name={cat.name}
              description={cat.description}
              kind={cat.kind}
            />
          ))}
        </div>
      </section>

      <UpcomingRaids locale={locale} region={region} timeZone={timeZone} limit={3} />

      <section className="pt-14" aria-labelledby="mais-vendidos">
        <h2
          id="mais-vendidos"
          className="mb-6 font-heading text-[clamp(1.5rem,3vw,2rem)] font-bold text-heading"
        >
          {t("bestSellers")}
        </h2>
        <Link
          href={`/${locale}/produtos`}
          className="-mt-3 mb-6 inline-block text-sm text-link hover:underline"
        >
          {t("viewAll")} →
        </Link>
        {products.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5">
            {products.map((p) => (
              <ProductCard key={p.id} p={toProductCard(locale, p, unit)} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">{c("empty")}</p>
        )}
      </section>
    </>
  );
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, c] = await Promise.all([
    getTranslations({ locale, namespace: "Home" }),
    getTranslations({ locale, namespace: "Catalog" }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1350px] px-4 py-14 sm:px-5 lg:py-20">
      <section className="mb-8 flex max-w-3xl flex-col gap-6">
        <span className="self-start rounded-full bg-link/15 px-3 py-1 font-heading text-xs font-semibold text-link">
          {t("badge")}
        </span>
        <h1 className="font-heading text-[clamp(2rem,5vw,3.5rem)] leading-tight font-bold text-balance text-heading">
          {t("title")}
        </h1>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">{t("subtitle")}</p>
      </section>
      <Suspense fallback={<p className="text-muted-foreground">{c("loading")}</p>}>
        <HomeCatalog locale={locale} />
      </Suspense>
    </div>
  );
}
