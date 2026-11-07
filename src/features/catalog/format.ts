import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { canonicalLocale } from "@/i18n/routing";
import { estimate } from "@/lib/fx";
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

export function formatEstimate(locale: string, cents: number): string {
  const { currency, amount } = estimate(locale, cents);
  const money = new Intl.NumberFormat(canonicalLocale(locale), { style: "currency", currency });
  return `≈ ${money.format(amount)}`;
}

export const categoryHref = (locale: string, slug: string) => `/${locale}/wow/${slug}`;
export const productHref = (locale: string, p: { categorySlug: string; slug: string }) =>
  `/${locale}/wow/${p.categorySlug}/${p.slug}`;

export function toProductCard(
  locale: string,
  p: CatalogProduct,
  unitLabel: (unit: string) => string,
): ProductCardData {
  return {
    href: productHref(locale, p),
    name: p.name,
    kind: p.categoryKind,
    region: p.region,
    price: formatUsdt(locale, p.priceUsdtCents),
    estimate: formatEstimate(locale, p.priceUsdtCents),
    unit: p.unit ? unitLabel(p.unit) : undefined,
  };
}
