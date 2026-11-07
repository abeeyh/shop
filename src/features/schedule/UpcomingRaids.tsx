import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { getTranslations } from "next-intl/server";
import { formatUsdt, productHref } from "@/features/catalog";
import { canonicalLocale } from "@/i18n/routing";
import { RaidSlotCard } from "./components/RaidSlotCard";
import { listSlotsForProduct, listUpcomingSlots } from "./queries";
import { isBookable, seatsLeft, SERVER_TIMEZONE } from "./rules";

// lido na hora da requisição (as páginas chamam connection() antes)
const unixNow = () => Math.floor(Date.now() / 1000);

type Props = {
  locale: string;
  timeZone: string | null;
  title?: string;
  limit?: number;
  categorySlug?: string;
  productSlug?: string;
};

// Seção "Próximas raids" (docs/15 item 5): o servidor decide vagas/esgotado; os cards só exibem
export async function UpcomingRaids({ locale, timeZone, title, limit, categorySlug, productSlug }: Props) {
  const [slots, t] = await Promise.all([
    productSlug ? listSlotsForProduct(productSlug) : listUpcomingSlots({ categorySlug, limit }),
    getTranslations({ locale, namespace: "Schedule" }),
  ]);
  if (!slots.length) return null;
  const serverNow = unixNow(); // HTML inicial da contagem bate com o cliente
  const tzLabel = timeZone ? timeZone.split("/").pop()?.replace(/_/g, " ") : null;

  return (
    <section className="pt-14" aria-labelledby="proximas-raids">
      <h2 id="proximas-raids" className="font-heading text-[clamp(1.5rem,3vw,2rem)] font-bold text-heading">
        {title ?? t("upcoming")}
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        {tzLabel ? t("inYourTimezone", { tz: tzLabel }) : t("inBrowserTimezone")}
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5">
        {slots.map((s) => {
          const bookable = isBookable(s);
          return (
            <RaidSlotCard
              key={s.id}
              locale={canonicalLocale(locale)}
              timeZone={timeZone}
              serverTimeZone={SERVER_TIMEZONE}
              serverNow={serverNow}
              labels={{ startsIn: t("startsIn"), serverTime: t("serverTime"), details: t("details") }}
              slot={{
                href: productHref(locale, { categorySlug: s.categorySlug, slug: s.productSlug }),
                name: s.productName,
                startsAt: s.startsAt.toISOString(),
                soldOut: !bookable,
                seatsLabel: bookable ? t("seatsLeft", { n: seatsLeft(s) }) : t("soldOut"),
                price: formatUsdt(locale, s.priceUsdtCents),
              }}
            />
          );
        })}
      </div>
    </section>
  );
}
