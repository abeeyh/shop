import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { getTranslations } from "next-intl/server";
import { PriceTag } from "@/components/molecules/PriceTag";
import { GradientCard } from "@/components/molecules/GradientCard";
import { Countdown } from "@/components/molecules/Countdown";
import { formatUsdt, listVariants, promoPrice, type CatalogProduct } from "@/features/catalog";
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
const ERROR_KEYS = [
  "realm",
  "character",
  "quantity",
  "slotId",
  "product",
  "faction",
  "addon",
  "variant",
] as const;

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

// RN-16 (#94): horários com vaga, se o admin cadastrou; senão a run é agendada com o suporte
async function slotOptions(slug: string, s: Awaited<ReturnType<typeof getTranslations<"Schedule">>>) {
  return (await listSlotsForProduct(slug)).map((x) => ({
    id: x.id,
    startsAt: x.startsAt.toISOString(),
    bookable: isBookable(x), // RN-11
    seats: isBookable(x) ? s("seatsLeft", { n: seatsLeft(x) }) : s("soldOut"),
  }));
}

// #100: combinações com preço próprio (já com promoção — RN-22); a inicial é a primeira com preço e o
// "a partir de" fica no topo. Sem eixos: null e vale o preço do produto.
async function variantOptions(locale: string, product: CatalogProduct, promo: (cents: number) => number) {
  const rows = product.optionAxes.length ? await listVariants(product.id) : [];
  const first = rows.find((v) => !v.priceOnRequest) ?? rows[0];
  if (!first) return { variants: null, base: product.priceUsdtCents };
  const list = rows.map((v) => ({
    id: v.id,
    options: v.options,
    note: v.note,
    price: v.priceOnRequest ? null : formatUsdt(locale, promo(v.priceUsdtCents)),
  }));
  return {
    variants: { axes: product.optionAxes, initialId: first.id, list },
    base: first.priceOnRequest ? product.priceUsdtCents : first.priceUsdtCents,
  };
}

function errorLabels(t: T, kind: "gold" | "service", max: number) {
  const errors: Record<string, string> = Object.fromEntries(ERROR_KEYS.map((k) => [k, t(`errors.${k}`)]));
  if (kind === "service") errors.quantity = t("errors.quantityService", { max });
  return errors;
}

const unitLabel = (
  product: CatalogProduct,
  hasVariants: boolean,
  t: T,
  c: Awaited<ReturnType<typeof getTranslations<"Catalog">>>,
) => {
  if (product.priceOnRequest) return undefined;
  if (product.categoryKind === "gold") return c("perK");
  return hasVariants ? c("from") : t("unit.service");
};

export async function BuyBox({ locale, product, timeZone }: Props) {
  const [t, c, s, promos] = await Promise.all([
    getTranslations({ locale, namespace: "Buy" }),
    getTranslations({ locale, namespace: "Catalog" }),
    getTranslations({ locale, namespace: "Schedule" }),
    activePromotions(),
  ]);
  // produto com opções mostra o seletor mesmo sob consulta: o cliente pergunta pela combinação certa
  if (product.priceOnRequest && !product.optionAxes.length) return <OnRequest product={product} t={t} />;
  const kind = product.categoryKind === "gold" ? "gold" : "service";
  const slots = kind === "service" ? await slotOptions(product.slug, s) : [];
  const d = DEFAULTS[kind];
  const promo = (cents: number) =>
    promoUnitCents({ productId: product.id, categoryId: product.categoryId, unitCents: cents }, promos);
  const { variants, base } = await variantOptions(locale, product, promo);
  const initial = formatUsdt(
    locale,
    lineTotalCents(promo(unitPriceCents(base, d.options, product.addons)), d.quantity),
  );
  const price = promoPrice(product, promos); // RN-22: riscado + contagem até o fim
  const errors = errorLabels(t, kind, product.maxQuantity);

  return (
    <GradientCard tone="solid" className="flex flex-col gap-4 lg:sticky lg:top-24">
      <PriceTag
        price={product.priceOnRequest ? t("onRequest") : formatUsdt(locale, price.cents)}
        original={price.originalCents ? formatUsdt(locale, price.originalCents) : undefined}
        unit={unitLabel(product, variants !== null, t, c)}
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
        variants={variants}
        askPrice={{ label: t("askPrice"), message: t("askPriceMessage", { name: product.name }) }}
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
          onRequest: t("onRequest"),
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
