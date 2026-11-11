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

export type CardLabels = { unit: (unit: string) => string; onRequest: string; hot: string; from: string };
type CardProduct = Pick<
  CatalogProduct,
  "id" | "slug" | "name" | "categoryId" | "categorySlug" | "categoryKind" | "priceUsdtCents" | "unit"
> & {
  priceOnRequest: boolean;
  hot: boolean;
  description: string;
  tags: string[]; // #160
  optionAxes: unknown[];
};

// unidade embaixo do preço: gold "por 1.000"; com opções (#100) "a partir de"
function unitLabel(p: CardProduct, labels: CardLabels) {
  if (p.priceOnRequest) return undefined;
  if (p.unit) return labels.unit(p.unit);
  return p.optionAxes.length ? labels.from : undefined;
}

// RN-106: "sob consulta" no lugar do preço (o valor guardado é só um marcador)
export function toProductCard(
  locale: string,
  p: CardProduct,
  labels: CardLabels,
  promos: Promotion[] = [],
): ProductCardData {
  const price = promoPrice(p, promos);
  return {
    href: productHref(locale, p),
    name: p.name,
    kind: p.categoryKind,
    badge: p.hot ? labels.hot : undefined,
    tags: p.tags,
    description: p.description,
    price: p.priceOnRequest ? labels.onRequest : formatUsdt(locale, price.cents),
    original: !p.priceOnRequest && price.originalCents ? formatUsdt(locale, price.originalCents) : undefined,
    unit: unitLabel(p, labels),
  };
}

// rótulos do card no idioma de quem vê (home, categoria e busca usam os mesmos)
export const cardLabels = (c: (key: "perK" | "onRequest" | "hot" | "from") => string): CardLabels => ({
  unit: (u) => (u === "per_1k_gold" ? c("perK") : u),
  onRequest: c("onRequest"),
  hot: c("hot"),
  from: c("from"),
});
