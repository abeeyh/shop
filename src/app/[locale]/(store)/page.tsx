import { getTranslations, setRequestLocale } from "next-intl/server";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { buttonVariants } from "@/components/atoms/Button";
import { CardGridSkeleton, LoadingRegion } from "@/components/molecules/Skeletons";
import {
  cardLabels,
  CategoryCard,
  categoryHref,
  listCategories,
  listProducts,
  ProductCard,
  toProductCard,
} from "@/features/catalog";
import { activePromotions } from "@/features/discounts/queries";
import { UpcomingRaids } from "@/features/schedule/UpcomingRaids";
import { getTimezone } from "@/lib/preferences";

const BEST_SELLERS = 8;
const sectionTitle = "mb-4 font-heading text-xl font-bold tracking-tight text-heading";

// #88: cada seção da home chega sozinha (streaming); a mais lenta não segura as outras
async function HomeCategories({ locale }: { locale: string }) {
  await connection();
  const [categories, t] = await Promise.all([
    listCategories(),
    getTranslations({ locale, namespace: "Home" }),
  ]);
  // RN-13: categorias do admin; os botões do topo apontam para a primeira de cada tipo
  const firstOf = (kind: string) => categories.find((x) => x.kind === kind);
  const gold = firstOf("gold");
  const raid = firstOf("raid");

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

      {/* #102: todas as categorias numa olhada, 1 clique até a lista */}
      <section className="pt-12" aria-labelledby="categorias">
        <h2 id="categorias" className={sectionTitle}>
          {t("categories")}
        </h2>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,170px),1fr))] gap-2.5">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              href={categoryHref(locale, cat.slug)}
              name={cat.name}
              kind={cat.kind}
            />
          ))}
        </div>
      </section>
    </>
  );
}

async function HomeRaids({ locale }: { locale: string }) {
  await connection();
  return <UpcomingRaids locale={locale} timeZone={await getTimezone()} limit={3} />;
}

async function HomeBestSellers({ locale }: { locale: string }) {
  await connection();
  const [products, t, c, promos] = await Promise.all([
    listProducts({ limit: BEST_SELLERS }),
    getTranslations({ locale, namespace: "Home" }),
    getTranslations({ locale, namespace: "Catalog" }),
    activePromotions(),
  ]);
  const labels = cardLabels(c);
  return (
    <section className="pt-12" aria-labelledby="mais-vendidos">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 id="mais-vendidos" className="font-heading text-xl font-bold tracking-tight text-heading">
          {t("bestSellers")}
        </h2>
        <Link href={`/${locale}/produtos`} className="text-sm font-semibold text-link hover:underline">
          {t("viewAll")} →
        </Link>
      </div>
      {products.length ? (
        <div className="grid gap-2">
          {products.map((p) => (
            <ProductCard key={p.id} p={toProductCard(locale, p, labels, promos)} cta={c("buy")} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">{c("empty")}</p>
      )}
    </section>
  );
}

const HomeSkeleton = ({ label, count }: { label: string; count: number }) => (
  <div className="pt-14">
    <LoadingRegion label={label}>
      <CardGridSkeleton count={count} />
    </LoadingRegion>
  </div>
);

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, c] = await Promise.all([
    getTranslations({ locale, namespace: "Home" }),
    getTranslations({ locale, namespace: "Catalog" }),
  ]);

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-10 sm:px-5 lg:py-14">
      <section className="mb-7 flex max-w-3xl flex-col gap-4">
        <span className="badge-glow self-start rounded-full px-3 py-1 font-heading text-xs font-semibold text-heading">
          {t("badge")}
        </span>
        <h1 className="bg-linear-to-r from-heading via-heading to-link bg-clip-text font-heading text-[clamp(2rem,5vw,3.25rem)] leading-[1.05] font-bold tracking-tight text-balance text-transparent">
          {t("title")}
        </h1>
        <p className="max-w-xl text-pretty text-muted-foreground">{t("subtitle")}</p>
      </section>
      <Suspense fallback={<HomeSkeleton label={c("loading")} count={4} />}>
        <HomeCategories locale={locale} />
      </Suspense>
      <Suspense fallback={null}>
        <HomeRaids locale={locale} />
      </Suspense>
      <Suspense fallback={<HomeSkeleton label={c("loading")} count={BEST_SELLERS} />}>
        <HomeBestSellers locale={locale} />
      </Suspense>
    </div>
  );
}
