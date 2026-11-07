import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { getTranslations } from "next-intl/server";
import { PriceTag } from "@/components/molecules/PriceTag";
import { GradientCard } from "@/components/molecules/GradientCard";
import { formatEstimate, formatUsdt, type CatalogProduct } from "@/features/catalog";
import { lineTotalCents, PRICING, unitPriceCents, type ItemOptions } from "@/features/pricing/rules";
import { isBookable, listSlotsForProduct, seatsLeft } from "@/features/schedule";
import { canonicalLocale } from "@/i18n/routing";
import { AddToCartForm } from "./components/AddToCartForm";

// opções iniciais do formulário — a prévia inicial usa as mesmas (RN-20: calculada aqui)
const DEFAULTS: Record<string, { options: ItemOptions; quantity: number }> = {
  gold: { options: { kind: "gold", realm: "", faction: "alliance", character: "" }, quantity: 100 },
  raid: { options: { kind: "raid", loot: "none" }, quantity: 1 },
  dungeon: { options: { kind: "dungeon", keyLevel: 10, timed: false }, quantity: 1 },
};

type Props = { locale: string; product: CatalogProduct; timeZone: string | null };

export async function BuyBox({ locale, product, timeZone }: Props) {
  const [t, c, s] = await Promise.all([
    getTranslations({ locale, namespace: "Buy" }),
    getTranslations({ locale, namespace: "Catalog" }),
    getTranslations({ locale, namespace: "Schedule" }),
  ]);
  const kind = product.categoryKind;
  const slots =
    kind === "raid"
      ? (await listSlotsForProduct(product.slug)).map((x) => ({
          id: x.id,
          startsAt: x.startsAt.toISOString(),
          bookable: isBookable(x), // RN-11
          seats: isBookable(x) ? s("seatsLeft", { n: seatsLeft(x) }) : s("soldOut"),
        }))
      : [];
  const d = DEFAULTS[kind]!;
  const initial = formatUsdt(
    locale,
    lineTotalCents(unitPriceCents(product.priceUsdtCents, d.options), d.quantity),
  );
  const keys = ["realm", "character", "quantity", "slotId", "product", "faction", "keyLevel", "runs", "loot"];

  return (
    <GradientCard tone="solid" className="flex flex-col gap-4 lg:sticky lg:top-24">
      <PriceTag
        price={formatUsdt(locale, product.priceUsdtCents)}
        estimate={formatEstimate(locale, product.priceUsdtCents)}
        unit={product.unit === "per_1k_gold" ? c("perK") : t(`unit.${kind}`)}
      />
      <AddToCartForm
        product={product.slug}
        kind={kind}
        locale={locale}
        canonicalLocale={canonicalLocale(locale)}
        timeZone={timeZone}
        initialQuote={initial}
        cartHref={`/${locale}/carrinho`}
        gold={{ min: PRICING.gold.minK, max: PRICING.gold.maxK, step: PRICING.gold.stepK }}
        slots={slots}
        labels={{
          realm: t("realm"),
          faction: t("faction"),
          alliance: t("alliance"),
          horde: t("horde"),
          character: t("character"),
          characterHint: t("characterHint"),
          quantity: t("quantity"),
          slot: t("slot"),
          loot: t("loot"),
          lootNone: t("lootNone"),
          lootArmor: t("lootArmor"),
          lootFull: t("lootFull"),
          keyLevel: t("keyLevel"),
          runs: t("runs"),
          timed: t("timed"),
          total: t("total"),
          add: t("add"),
          added: t("added"),
          viewCart: t("viewCart"),
          errors: Object.fromEntries(keys.map((k) => [k, t(`errors.${k}`)])),
        }}
      />
      <p className="text-xs text-muted-foreground">{c("estimateNote")}</p>
    </GradientCard>
  );
}
