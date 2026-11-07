import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { KindTile, type CatalogProduct } from "@/features/catalog";
import { BuyBox } from "./BuyBox";

type Props = { locale: string; product: CatalogProduct; timeZone: string | null; compact?: boolean };

// #102: o produto e a compra — a mesma peça na página do produto e na gaveta aberta pela lista
export async function ProductPanel({ locale, product, timeZone, compact }: Props) {
  const c = await getTranslations({ locale, namespace: "Catalog" });
  const info = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <KindTile kind={product.categoryKind} />
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {[product.categoryName, product.subcategoryName].filter(Boolean).join(" · ")}
          </p>
          <h1
            className={`font-heading font-bold tracking-tight text-heading ${compact ? "text-xl" : "text-[clamp(1.5rem,3vw,2rem)]"}`}
          >
            {product.name}
          </h1>
        </div>
      </div>
      {product.description ? <p className="text-sm text-muted-foreground">{product.description}</p> : null}
      <p className="flex gap-2.5 rounded-md border border-link/25 bg-link/10 p-3 text-sm">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-link" />
        {c("selfPlay")}
      </p>
    </div>
  );
  if (compact)
    return (
      <div className="flex flex-col gap-5">
        {info}
        <BuyBox locale={locale} product={product} timeZone={timeZone} bare />
      </div>
    );
  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_26rem] lg:items-start">
      {info}
      <BuyBox locale={locale} product={product} timeZone={timeZone} />
    </div>
  );
}
