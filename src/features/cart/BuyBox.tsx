import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { getTranslations } from "next-intl/server";
import { PriceTag } from "@/components/molecules/PriceTag";
import { GradientCard } from "@/components/molecules/GradientCard";
import { Countdown } from "@/components/molecules/Countdown";
import { formatUsdt, promoPrice, type CatalogProduct } from "@/features/catalog";
import { activePromotions } from "@/features/discounts/queries";
import {
  lineTotalCents,
  PRICING,
  promoUnitCents,
  unitPriceCents,
  type ItemOptions,
} from "@/features/pricing/rules";
import { isBookable, listSlotsForProduct, seatsLeft } from "@/features/schedule";
import { ChatOpenButton } from "@/features/support";
import { canonicalLocale } from "@/i18n/routing";
import { AddToCartForm } from "./components/AddToCartForm";

// opções iniciais do formulário — a prévia inicial usa as mesmas (RN-20: calculada aqui)
const NO_ONE = { realm: "", faction: "alliance", character: "" } as const;
const DEFAULTS: Record<"gold" | "service", { options: ItemOptions; quantity: number }> = {
  gold: { options: { kind: "gold", ...NO_ONE }, quantity: 100 },
  service: { options: { kind: "service", ...NO_ONE, addons: [] }, quantity: 1 },
};

type Props = { locale: string; product: CatalogProduct; timeZone: string | null };
type T = Awaited<ReturnType<typeof getTranslations<"Buy">>>;

const unixNow = () => Math.floor(Date.now() / 1000);
const ERROR_KEYS = ["realm", "character", "quantity", "slotId", "product", "faction", "addon"] as const;

// RN-106: sob consulta — sem preço nem carrinho; o cliente pede o orçamento no chat
function OnRequest({ product, t }: { product: CatalogProduct; t: T }) {
  return (
    <GradientCard tone="solid" className="flex flex-col gap-4 lg:sticky lg:top-24">
      <p className="font-heading text-xl font-bold text-heading">{t("onRequest")}</p>
      <p className="text-sm text-muted-foreground">{t("onRequestNote")}</p>
      <ChatOpenButton label={t("askPrice")} message={t("askPriceMessage", { name: product.name })} />
    </GradientCard>
  );
}

export async function BuyBox({ locale, product, timeZone }: Props) {
  const [t, c, s, promos] = await Promise.all([
    getTranslations({ locale, namespace: "Buy" }),
    getTranslations({ locale, namespace: "Catalog" }),
    getTranslations({ locale, namespace: "Schedule" }),
    activePromotions(),
  ]);
  if (product.priceOnRequest) return <OnRequest product={product} t={t} />;
  const kind = product.categoryKind === "gold" ? "gold" : "service";
  // RN-16 (#94): horários com vaga, se o admin cadastrou; senão a run é agendada com o suporte
  const slots =
    kind === "service"
      ? (await listSlotsForProduct(product.slug)).map((x) => ({
          id: x.id,
          startsAt: x.startsAt.toISOString(),
          bookable: isBookable(x), // RN-11
          seats: isBookable(x) ? s("seatsLeft", { n: seatsLeft(x) }) : s("soldOut"),
        }))
      : [];
  const d = DEFAULTS[kind];
  const unitCents = unitPriceCents(product.priceUsdtCents, d.options, product.addons);
  const initial = formatUsdt(
    locale,
    lineTotalCents(
      promoUnitCents({ productId: product.id, categoryId: product.categoryId, unitCents }, promos),
      d.quantity,
    ),
  );
  const price = promoPrice(product, promos); // RN-22: riscado + contagem até o fim
  const errors: Record<string, string> = Object.fromEntries(ERROR_KEYS.map((k) => [k, t(`errors.${k}`)]));
  if (kind === "service") errors.quantity = t("errors.quantityService", { max: product.maxQuantity });

  return (
    <GradientCard tone="solid" className="flex flex-col gap-4 lg:sticky lg:top-24">
      <PriceTag
        price={formatUsdt(locale, price.cents)}
        original={price.originalCents ? formatUsdt(locale, price.originalCents) : undefined}
        unit={kind === "gold" ? c("perK") : t("unit.service")}
      />
      {price.endsAt ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span aria-hidden="true">{t("promoEnds")}</span>
          <Countdown until={price.endsAt.toISOString()} serverNow={unixNow()} label={t("promoEnds")} />
        </p>
      ) : null}
      <AddToCartForm
        product={product.slug}
        kind={kind}
        locale={locale}
        canonicalLocale={canonicalLocale(locale)}
        timeZone={timeZone}
        initialQuote={initial}
        cartHref={`/${locale}/carrinho`}
        gold={{ min: PRICING.gold.minK, max: PRICING.gold.maxK, step: PRICING.gold.stepK }}
        maxQuantity={product.maxQuantity}
        addons={product.addons.map((a) => ({ name: a.name, label: t("addon", a) }))}
        slots={slots}
        labels={{
          realm: t("realm"),
          faction: t("faction"),
          alliance: t("alliance"),
          horde: t("horde"),
          character: t("character"),
          characterHint: kind === "gold" ? t("characterHint") : t("characterHintService"),
          quantity: kind === "gold" ? t("quantity") : t("quantityService"),
          slot: t("slot"),
          addons: t("addons"),
          scheduleNote: t("scheduleNote"),
          total: t("total"),
          add: t("add"),
          added: t("added"),
          viewCart: t("viewCart"),
          errors,
        }}
      />
      <p className="text-xs text-muted-foreground">{c("estimateNote")}</p>
    </GradientCard>
  );
}
