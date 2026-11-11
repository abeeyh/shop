import { ProductCard, type ProductCardData } from "./ProductCard";
import { ProductTile } from "./ProductTile";

type Item = { key: string; p: ProductCardData; flag?: string };
type Props = { items: Item[]; view: "lista" | "grade"; cta: string; hideTag?: string | null };

// #166: a mesma lista de produtos em linhas (padrão) ou em grade de cartões
export function ProductList({ items, view, cta, hideTag }: Props) {
  if (view === "grade")
    return (
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
