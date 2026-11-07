import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { canonicalLocale } from "@/i18n/routing";
import { bestPromotion, type Promotion } from "@/features/pricing/rules";
import type { ProductCardData } from "./components/ProductCard";
import type { CatalogProduct } from "./queries";

// Formatação no servidor, no idioma do usuário (docs/11 §3: sempre por Intl)
export function formatUsdt(locale: string, cents: number): string {
  const n = new Intl.NumberFormat(canonicalLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n.format(cents / 100)} USDT`;
}

export const categoryHref = (locale: string, slug: string) => `/${locale}/wow/${slug}`;
export const productHref = (locale: string, p: { categorySlug: string; slug: string }) =>
  `/${locale}/wow/${p.categorySlug}/${p.slug}`;

// RN-22: preço-base com a melhor promoção valendo (preço "a partir de" — as opções podem mudar)
export function promoPrice(
  p: { id: string; categoryId: string; priceUsdtCents: number },
  promos: Promotion[],
  now = new Date(),
) {
  const best = bestPromotion(
    { productId: p.id, categoryId: p.categoryId, unitCents: p.priceUsdtCents },
    promos,
    now,
  );
  return best
    ? {
        cents: p.priceUsdtCents - best.discountCents,
        originalCents: p.priceUsdtCents,
        endsAt: best.promotion.endsAt,
      }
    : { cents: p.priceUsdtCents, originalCents: null, endsAt: null };
}

export function toProductCard(
  locale: string,
  p: CatalogProduct,
  unitLabel: (unit: string) => string,
  promos: Promotion[] = [],
): ProductCardData {
  const price = promoPrice(p, promos);
  return {
    href: productHref(locale, p),
    name: p.name,
    kind: p.categoryKind,
    price: formatUsdt(locale, price.cents),
    original: price.originalCents ? formatUsdt(locale, price.originalCents) : undefined,
    unit: p.unit ? unitLabel(p.unit) : undefined,
  };
}
