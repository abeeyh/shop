import { ProductCard, type ProductCardData } from "./ProductCard";
import { ProductTile } from "./ProductTile";

type Item = { key: string; p: ProductCardData; flag?: string };
type Props = { items: Item[]; view: "lista" | "grade"; cta: string; hideTag?: string | null };

// #166: a mesma lista de produtos em linhas (padrão) ou em grade de cartões
export function ProductList({ items, view, cta, hideTag }: Props) {
  if (view === "grade")
    return (
      // #180: colunas pelo espaço que a lista tem (não pela tela): o cartão nunca fica mais estreito que 15rem
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-3">
        {items.map((i) => (
          <ProductTile key={i.key} p={i.p} cta={cta} flag={i.flag} hideTag={hideTag} />
        ))}
      </div>
    );
  return (
    <div className="grid gap-2">
      {items.map((i) => (
        <ProductCard key={i.key} p={i.p} cta={cta} flag={i.flag} hideTag={hideTag} />
      ))}
    </div>
  );
}
