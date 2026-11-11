import "server-only"; // regra de negócio, banco e segredos só no servidor (docs/04)
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  getProductContent,
  KindTile,
  ProductDetailsText,
  ProductFaq,
  ProductGallery,
  type CatalogProduct,
} from "@/features/catalog";
import { BuyBox } from "./BuyBox";

type Props = { locale: string; product: CatalogProduct; timeZone: string | null };

// Página do produto: informações à esquerda, compra (opções, personagem, total) à direita — #102/#109
export async function ProductPanel({ locale, product, timeZone }: Props) {
  const [c, content] = await Promise.all([
    getTranslations({ locale, namespace: "Catalog" }),
    getProductContent(product.id), // #136
  ]);
  const info = (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-3">
        <KindTile kind={product.categoryKind} />
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {[product.categoryName, product.primaryTag].filter(Boolean).join(" · ")}
          </p>
          <h1 className="font-heading text-[clamp(1.5rem,3vw,2rem)] font-bold tracking-tight text-heading">
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
  // #164: galeria e descrição longa vêm DEPOIS da compra no celular (antes, ~1000 px até o preço)
  const more =
    content.images.length || content.details ? (
      <div className="flex min-w-0 flex-col gap-3 lg:col-start-1">
        <ProductGallery images={content.images} label={c("gallery")} />
        <ProductDetailsText details={content.details} />
      </div>
    ) : null;
  return (
    // #139: a caixa de compra fica sozinha na coluna da direita (ocupa todas as linhas, então o sticky
    // anda junto sem cobrir nada). #164 — celular: título → compra → galeria/descrição → FAQ
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_26rem]">
      {info}
      <div className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
        <BuyBox locale={locale} product={product} timeZone={timeZone} />
      </div>
      {more}
      <div className="min-w-0 lg:col-start-1">
        <ProductFaq faq={content.faq} title={c("faq")} />
      </div>
    </div>
  );
}
